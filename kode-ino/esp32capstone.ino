#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "config.h"

// ==============================================================================
// SISTEM MONITORING & KONTROL PAKAN IKAN (FIRMWARE ESP32)
// ==============================================================================
// Arsitektur Komunikasi:
//   Arduino Nano <--- UART2 (Serial2 9600 baud) ---> ESP32 <--- HTTPS REST API ---> Server Web
//
// Tugas Utama ESP32:
//   1. Membaca telemetri sensor pH dan status aktuator dari Arduino Nano (Serial2).
//   2. Mengirim data berkala ke endpoint backend: POST /api/v1/device/telemetry
//   3. Mengambil perintah aksi manual/otomatis dari web: GET /api/v1/device/commands/pending
//   4. Meneruskan perintah kontrol ke Nano: CMD:PAKAN atau CMD:AIR
//   5. Melaporkan hasil eksekusi ke backend: POST /api/v1/device/commands/:id/result
// ==============================================================================

// Endpoint rute API v1
const char* pathTelemetry = "/api/v1/device/telemetry";
const char* pathCommands  = "/api/v1/device/commands/pending";

// ==============================================================================
// VARIABEL STATUS SENSOR & BUFFER SERIAL NANO
// ==============================================================================

float nilaiPH = 0.0;
String statusPompa = "OFF";
String statusPakan = "IDLE";
String waktuRTC = "00:00";
bool dataValid = false;

// Buffer penampung karakter Serial2 Nano
String bufferNano = "";

// ==============================================================================
// TIMER & PENGENDALI INTERVAL NON-BLOCKING
// ==============================================================================

unsigned long waktuTerakhirKirim = 0;
unsigned long waktuTerakhirPerintah = 0;
unsigned long waktuTerakhirCekWiFi = 0;

// Pencegah eksekusi perintah duplikat
String perintahTerakhirDieksekusi = "";

// ==============================================================================
// MANAJEMEN KONEKSI WIFI NON-BLOCKING
// ==============================================================================

void hubungkanWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("\n[WiFi] Memulai koneksi ke SSID: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long mulaiKoneksi = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - mulaiKoneksi < 8000)) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] SUKSES! Terhubung dengan jaringan.");
    Serial.print("[WiFi] Alamat IP ESP32: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] Kekuatan Sinyal (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("[WiFi] PERINGATAN: Belum dapat terhubung. Mencoba lagi nanti secara berkala...");
  }
}

// ==============================================================================
// PROTOKOL KOMUNIKASI SERIAL DENGAN ARDUINO NANO
// ==============================================================================

void kirimPerintahNano(String perintah) {
  Serial2.println(perintah);
  Serial.print("[Nano TX] Kirim Perintah -> ");
  Serial.println(perintah);
}

void prosesDataNano(String data) {
  data.trim();
  if (!data.startsWith("DATA:")) return;

  // Hapus header "DATA:"
  data.remove(0, 5);

  // Format dari Nano: DATA:<ph>,<statusPompa>,<statusPakan>,<waktuRTC>
  int k1 = data.indexOf(',');
  int k2 = data.indexOf(',', k1 + 1);
  int k3 = data.indexOf(',', k2 + 1);

  if (k1 < 0 || k2 < 0 || k3 < 0) return;

  String strPH = data.substring(0, k1);
  float phParsed = strPH.toFloat();

  // Validasi rentang fisik nilai pH (0.00 - 14.00)
  if (phParsed < 0.0 || phParsed > 14.0) {
    Serial.print("[Sensor] Peringatan: Nilai pH korup atau di luar jangkauan: ");
    Serial.println(phParsed);
    return;
  }

  nilaiPH = phParsed;
  statusPompa = data.substring(k1 + 1, k2);
  statusPakan = data.substring(k2 + 1, k3);
  waktuRTC = data.substring(k3 + 1);
  dataValid = true;

  Serial.println("\n-------------------------------------------");
  Serial.println("           DATA TELEMETRI DARI NANO        ");
  Serial.println("-------------------------------------------");
  Serial.print("  Kualitas Air (pH)  : "); Serial.println(nilaiPH, 2);
  Serial.print("  Status Pompa Air   : "); Serial.println(statusPompa);
  Serial.print("  Status Servo Pakan : "); Serial.println(statusPakan);
  Serial.print("  Waktu Jam RTC      : "); Serial.println(waktuRTC);
  Serial.println("-------------------------------------------");
}

void bacaSerialNano() {
  while (Serial2.available()) {
    char c = Serial2.read();

    if (c == '\n') {
      prosesDataNano(bufferNano);
      bufferNano = "";
    } else if (c != '\r') {
      // Cegah buffer overflow jika komunikasi serial mengalami desinkronisasi
      if (bufferNano.length() < 128) {
        bufferNano += c;
      } else {
        bufferNano = "";
      }
    }
  }
}

// ==============================================================================
// SERIALISASI JSON TELEMETRI UNTUK BACKEND
// ==============================================================================

String bangunPayloadTelemetri() {
  // Normalisasi status pompa ke format backend ('on' atau 'off')
  String statePompa = "off";
  if (statusPompa.equalsIgnoreCase("ON") ||
      statusPompa.equalsIgnoreCase("HIDUP") ||
      statusPompa.equalsIgnoreCase("RUNNING")) {
    statePompa = "on";
  }

  // Normalisasi status pakan ke format backend ('running' atau 'idle')
  String statePakan = "idle";
  if (statusPakan.equalsIgnoreCase("FEEDING") ||
      statusPakan.equalsIgnoreCase("RUNNING") ||
      statusPakan.equalsIgnoreCase("ON")) {
    statePakan = "running";
  }

  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"ph\":" + String(nilaiPH, 2) + ",";
  json += "\"pump_status\":\"" + statePompa + "\",";
  json += "\"servo_status\":\"" + statePakan + "\",";
  json += "\"waktu\":\"" + waktuRTC + "\",";
  json += "\"online\":true";
  json += "}";

  return json;
}

// ==============================================================================
// PENYUSUNAN HEADER HTTP STANDAR
// ==============================================================================

void pasangHeaderHTTP(HTTPClient &http) {
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Key", DEVICE_KEY);
}

// ==============================================================================
// PENGIRIMAN TELEMETRI SENSOR KE WEB API
// ==============================================================================

void kirimDataWebsite() {
  if (!ENABLE_API || !dataValid) return;
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Mengabaikan verifikasi CA SSL pada mikrokontroler

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  String url = String(SERVER_URL) + pathTelemetry;

  if (http.begin(client, url)) {
    pasangHeaderHTTP(http);

    String payload = bangunPayloadTelemetri();
    int httpCode = http.POST(payload);

    Serial.print("[API Telemetri] Mengirim data pH ");
    Serial.print(nilaiPH, 2);
    Serial.print(" -> Status: ");

    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      Serial.println("BERHASIL (HTTP 200)");
    } else if (httpCode == 401) {
      Serial.println("GAGAL: 401 Unauthorized (Periksa DEVICE_KEY / DEVICE_ID)");
    } else if (httpCode == 429) {
      Serial.println("GAGAL: 429 Rate Limit (Frekuensi kirim terlalu cepat)");
    } else {
      Serial.print("HTTP ");
      Serial.println(httpCode);
    }

    http.end();
  }
}

// ==============================================================================
// PARSER JSON RINGAN (ZERO EXTERNAL LIBRARY DEPENDENCY)
// ==============================================================================

String ekstrakStringJSON(String json, String field) {
  String kunci = "\"" + field + "\"";
  int posKunci = json.indexOf(kunci);
  if (posKunci < 0) return "";

  int posTitikDua = json.indexOf(':', posKunci);
  if (posTitikDua < 0) return "";

  int awalKutip = json.indexOf('"', posTitikDua + 1);
  if (awalKutip < 0) return "";

  int akhirKutip = json.indexOf('"', awalKutip + 1);
  if (akhirKutip < 0) return "";

  return json.substring(awalKutip + 1, akhirKutip);
}

bool ekstrakAngkaJSON(String json, String field, int &hasil) {
  String kunci = "\"" + field + "\"";
  int posKunci = json.indexOf(kunci);
  if (posKunci < 0) return false;

  int posTitikDua = json.indexOf(':', posKunci);
  if (posTitikDua < 0) return false;

  int idxAwal = posTitikDua + 1;
  while (idxAwal < json.length() && (json[idxAwal] == ' ' || json[idxAwal] == '\t')) {
    idxAwal++;
  }

  int idxAkhir = idxAwal;
  while (idxAkhir < json.length() && (json[idxAkhir] == '-' || (json[idxAkhir] >= '0' && json[idxAkhir] <= '9'))) {
    idxAkhir++;
  }

  if (idxAkhir == idxAwal) return false;
  hasil = json.substring(idxAwal, idxAkhir).toInt();
  return true;
}

// ==============================================================================
// MELAPORKAN HASIL EKSEKUSI PERINTAH KE WEB API
// ==============================================================================

void laporHasilPerintah(String commandId, String status) {
  if (!ENABLE_API) return;
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  String url = String(SERVER_URL) + "/api/v1/device/commands/" + commandId + "/result";

  if (http.begin(client, url)) {
    pasangHeaderHTTP(http);

    String body = "{\"status\":\"" + status + "\"}";
    int httpCode = http.POST(body);

    Serial.print("[API Lapor] Perintah [");
    Serial.print(commandId);
    Serial.print("] Status: ");
    Serial.print(status);
    Serial.print(" -> Respons: HTTP ");
    Serial.println(httpCode);

    http.end();
  }
}

// ==============================================================================
// POLLING & EKSEKUSI PERINTAH DARI WEB
// ==============================================================================

void ambilPerintahWebsite() {
  if (!ENABLE_API) return;
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  String url = String(SERVER_URL) + pathCommands;

  if (!http.begin(client, url)) return;

  pasangHeaderHTTP(http);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String json = http.getString();

    // Jika antrean kosong ("command": null), akhiri
    if (json.indexOf("\"command\":null") >= 0 || json.indexOf("\"command\": null") >= 0) {
      http.end();
      return;
    }

    String idCmd = ekstrakStringJSON(json, "id");
    String tipeCmd = ekstrakStringJSON(json, "type");

    if (idCmd.length() > 0 && idCmd != perintahTerakhirDieksekusi) {
      Serial.println("\n[API Perintah] PERINTAH BARU DITERIMA!");
      Serial.print("[API Perintah] ID    : "); Serial.println(idCmd);
      Serial.print("[API Perintah] Tipe  : "); Serial.println(tipeCmd);

      if (tipeCmd == "feed") {
        // Kontrol Motor Servo Pakan Ikan
        kirimPerintahNano("CMD:PAKAN");
        perintahTerakhirDieksekusi = idCmd;
        laporHasilPerintah(idCmd, "completed");
      }
      else if (tipeCmd == "pump") {
        // Kontrol Saklar Pompa Air
        kirimPerintahNano("CMD:AIR");
        perintahTerakhirDieksekusi = idCmd;
        laporHasilPerintah(idCmd, "completed");
      }
      else if (tipeCmd == "settime") {
        // Sinkronisasi Waktu Jam RTC
        int tahun, bulan, tanggal;
        int jam, menit, detik;

        bool dataLengkap =
          ekstrakAngkaJSON(json, "year", tahun) &&
          ekstrakAngkaJSON(json, "month", bulan) &&
          ekstrakAngkaJSON(json, "day", tanggal) &&
          ekstrakAngkaJSON(json, "hour", jam) &&
          ekstrakAngkaJSON(json, "minute", menit) &&
          ekstrakAngkaJSON(json, "second", detik);

        if (dataLengkap) {
          char paketWaktu[80];
          snprintf(
            paketWaktu,
            sizeof(paketWaktu),
            "CMD:SETTIME,%d,%d,%d,%d,%d,%d",
            tahun, bulan, tanggal, jam, menit, detik
          );
          kirimPerintahNano(String(paketWaktu));
          perintahTerakhirDieksekusi = idCmd;
          laporHasilPerintah(idCmd, "completed");
        }
      } else {
        Serial.print("[API Perintah] Tipe perintah tidak dikenali: ");
        Serial.println(tipeCmd);
        laporHasilPerintah(idCmd, "failed");
      }
    }
  } else if (httpCode != 204 && httpCode != HTTP_CODE_OK) {
    Serial.print("[API Perintah] Respons HTTP Polling: ");
    Serial.println(httpCode);
  }

  http.end();
}

// ==============================================================================
// SETUP SISTEM
// ==============================================================================

void setup() {
  Serial.begin(BAUDRATE_SERIAL);

  // Inisialisasi komunikasi serial UART2 ke Arduino Nano
  Serial2.begin(
    BAUDRATE_NANO,
    SERIAL_8N1,
    PIN_RX_ESP32,
    PIN_TX_ESP32
  );

  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("  SISTEM OTOMASI PAKAN IKAN & MONITORING pH KOLAM      ");
  Serial.println("             FIRMWARE ESP32 CAPSTONE                    ");
  Serial.println("========================================================");
  Serial.print("  Device ID   : "); Serial.println(DEVICE_ID);
  Serial.print("  Server API  : "); Serial.println(SERVER_URL);
  Serial.println("========================================================");

  hubungkanWiFi();
}

// ==============================================================================
// LOOP UTAMA NON-BLOCKING
// ==============================================================================

void loop() {
  // 1. Selalu dengarkan paket serial yang masuk dari Arduino Nano tanpa henti
  bacaSerialNano();

  unsigned long sekarang = millis();

  // 2. Pemeriksaan konektivitas WiFi secara periodik
  if (WiFi.status() != WL_CONNECTED && (sekarang - waktuTerakhirCekWiFi >= INTERVAL_CEK_WIFI)) {
    waktuTerakhirCekWiFi = sekarang;
    hubungkanWiFi();
  }

  // 3. Pengiriman telemetri sensor pH ke website secara periodik
  if (ENABLE_API && dataValid && (sekarang - waktuTerakhirKirim >= INTERVAL_KIRIM_DATA)) {
    waktuTerakhirKirim = sekarang;
    kirimDataWebsite();
  }

  // 4. Polling antrean perintah dari website (feed / pump) secara periodik
  if (ENABLE_API && (sekarang - waktuTerakhirPerintah >= INTERVAL_CEK_PERINTAH)) {
    waktuTerakhirPerintah = sekarang;
    ambilPerintahWebsite();
  }

  // Delay mikro singkat untuk memberikan waktu prosesor mengeksekusi stack background ESP-IDF/WiFi
  delay(5);
}
