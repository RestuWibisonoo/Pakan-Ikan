#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ==============================================================================
// 1. PENGATURAN KONEKSI WIFI
// ==============================================================================

const char* ssid = "redmi 15";
const char* password = "06062003";

// ==============================================================================
// 2. IDENTITAS PERANGKAT & SERVER API (PAKAN IKAN)
// ==============================================================================

// Alamat server backend utama
const char* serverUrl = "https://pakan-ikan.my.id";

// ID Perangkat unik (samakan dengan ID yang didaftarkan di menu /devices pada web/app)
const char* deviceId = "fish-feeder-001";

// Kunci rahasia perangkat untuk otentikasi header X-Device-Key
const char* deviceKey = "pakan-ikan-secret-2026";

// Flag pengaktifan API:
// true  = Mengirim telemetri & menerima perintah dari website
// false = Mode offline serial (hanya pengujian lokal di Serial Monitor)
const bool ENABLE_API = true;

// Endpoint rute API v1
const char* endpointTelemetry = "/api/v1/device/telemetry";
const char* endpointCommands  = "/api/v1/device/commands/pending";

// ==============================================================================
// 3. KOMUNIKASI SERIAL KE ARDUINO NANO
// ==============================================================================

#define RX_ESP32 16
#define TX_ESP32 17

// ==============================================================================
// 4. DATA SENSOR & STATUS
// ==============================================================================

float nilaiPH = 0.0;
String statusPompa = "OFF";
String statusPakan = "IDLE";
String waktuRTC = "00:00";
bool dataValid = false;

// Buffer penampung karakter Serial2 Nano
String bufferNano = "";

// ==============================================================================
// 5. TIMER & INTERVAL PENGIRIMAN
// ==============================================================================

unsigned long waktuKirim = 0;
unsigned long waktuPerintah = 0;
unsigned long waktuWiFi = 0;

const unsigned long intervalKirim = 5000;      // Kirim data pH setiap 5 detik
const unsigned long intervalPerintah = 2000;   // Cek perintah web setiap 2 detik
const unsigned long intervalWiFi = 10000;      // Cek koneksi WiFi setiap 10 detik

// Pencegah eksekusi perintah berulang
String perintahTerakhir = "";

// ==============================================================================
// 6. KONEKSI WIFI
// ==============================================================================

void koneksiWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("\n[WiFi] Menghubungkan ke hotspot...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long mulai = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - mulai < 10000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Terhubung!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] Gagal terhubung ke WiFi.");
  }
}

// ==============================================================================
// 7. KOMUNIKASI DENGAN ARDUINO NANO
// ==============================================================================

void kirimPerintahNano(String perintah) {
  Serial2.println(perintah);
  Serial.print("[Nano TX] -> ");
  Serial.println(perintah);
}

void prosesDataNano(String data) {
  data.trim();
  if (!data.startsWith("DATA:")) return;

  data.remove(0, 5); // Hapus awalan "DATA:"

  // Format: DATA:<ph>,<statusPompa>,<statusPakan>,<waktuRTC>
  int k1 = data.indexOf(',');
  int k2 = data.indexOf(',', k1 + 1);
  int k3 = data.indexOf(',', k2 + 1);

  if (k1 < 0 || k2 < 0 || k3 < 0) return;

  String ph = data.substring(0, k1);
  float phBaru = ph.toFloat();

  if (phBaru < 0 || phBaru > 14) return;

  nilaiPH = phBaru;
  statusPompa = data.substring(k1 + 1, k2);
  statusPakan = data.substring(k2 + 1, k3);
  waktuRTC = data.substring(k3 + 1);
  dataValid = true;

  Serial.println("\n--- [DATA DARI NANO] ---");
  Serial.print("pH: ");
  Serial.println(nilaiPH, 2);
  Serial.print("Pompa: ");
  Serial.println(statusPompa);
  Serial.print("Pakan: ");
  Serial.println(statusPakan);
  Serial.print("Jam RTC: ");
  Serial.println(waktuRTC);
  Serial.println("------------------------");
}

void bacaSerialNano() {
  while (Serial2.available()) {
    char c = Serial2.read();

    if (c == '\n') {
      prosesDataNano(bufferNano);
      bufferNano = "";
    } else if (c != '\r') {
      if (bufferNano.length() < 120) {
        bufferNano += c;
      } else {
        bufferNano = "";
      }
    }
  }
}

// ==============================================================================
// 8. PEMBENTUKAN JSON TELEMETRI UNTUK BACKEND
// ==============================================================================

String buatJSON() {
  // Petakan status pompa ke standar backend ('on' atau 'off')
  String pumpState = "off";
  if (statusPompa.equalsIgnoreCase("ON") ||
      statusPompa.equalsIgnoreCase("HIDUP") ||
      statusPompa.equalsIgnoreCase("RUNNING")) {
    pumpState = "on";
  }

  // Petakan status servo pakan ke standar backend ('running' atau 'idle')
  String servoState = "idle";
  if (statusPakan.equalsIgnoreCase("FEEDING") ||
      statusPakan.equalsIgnoreCase("RUNNING") ||
      statusPakan.equalsIgnoreCase("ON")) {
    servoState = "running";
  }

  String json = "{";
  json += "\"ph\":";
  json += String(nilaiPH, 2);
  json += ",\"pump_status\":\"";
  json += pumpState;
  json += "\",\"servo_status\":\"";
  json += servoState;
  json += "\",\"waktu\":\"";
  json += waktuRTC;
  json += "\"}";

  return json;
}

// ==============================================================================
// 9. HEADER OTENTIKASI HTTP (X-Device-Id & X-Device-Key)
// ==============================================================================

void tambahHeader(HTTPClient &http) {
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", deviceId);
  http.addHeader("X-Device-Key", deviceKey);
}

// ==============================================================================
// 10. MENGIRIM DATA TELEMETRI KE WEBSITE
// ==============================================================================

void kirimDataWebsite() {
  if (!ENABLE_API || !dataValid) return;
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Mengabaikan verifikasi CA SSL pada ESP32

  HTTPClient http;
  http.setTimeout(5000);

  String url = String(serverUrl) + endpointTelemetry;

  if (http.begin(client, url)) {
    tambahHeader(http);

    String payload = buatJSON();
    int kode = http.POST(payload);

    Serial.print("[API] Kirim Telemetri (HTTP ");
    Serial.print(kode);
    Serial.println(")");

    if (kode > 0) {
      Serial.print("[API] Respon: ");
      Serial.println(http.getString());
    }

    http.end();
  }
}

// ==============================================================================
// 11. PARSER JSON SEDERHANA
// ==============================================================================

String ambilString(String json, String field) {
  String kunci = "\"" + field + "\"";
  int posisi = json.indexOf(kunci);
  if (posisi < 0) return "";

  int titikDua = json.indexOf(':', posisi);
  if (titikDua < 0) return "";

  int awal = json.indexOf('"', titikDua + 1);
  if (awal < 0) return "";

  int akhir = json.indexOf('"', awal + 1);
  if (akhir < 0) return "";

  return json.substring(awal + 1, akhir);
}

bool ambilAngka(String json, String field, int &hasil) {
  String kunci = "\"" + field + "\"";
  int posisi = json.indexOf(kunci);
  if (posisi < 0) return false;

  int titikDua = json.indexOf(':', posisi);
  if (titikDua < 0) return false;

  int awal = titikDua + 1;
  while (awal < json.length() && (json[awal] == ' ' || json[awal] == '\t')) {
    awal++;
  }

  int akhir = awal;
  while (akhir < json.length() && (json[akhir] == '-' || (json[akhir] >= '0' && json[akhir] <= '9'))) {
    akhir++;
  }

  if (akhir == awal) return false;
  hasil = json.substring(awal, akhir).toInt();
  return true;
}

// ==============================================================================
// 12. MELAPORKAN HASIL EKSEKUSI PERINTAH KE SERVER
// ==============================================================================

void laporHasilPerintah(String commandId, String status) {
  if (!ENABLE_API) return;
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(5000);

  String url = String(serverUrl) + "/api/v1/device/commands/" + commandId + "/result";

  if (http.begin(client, url)) {
    tambahHeader(http);

    String body = "{\"status\":\"" + status + "\"}";
    int kode = http.POST(body);

    Serial.print("[API] Lapor Hasil Perintah ");
    Serial.print(commandId);
    Serial.print(" (HTTP ");
    Serial.print(kode);
    Serial.println(")");

    http.end();
  }
}

// ==============================================================================
// 13. MENGAMBIL PERINTAH DARI WEBSITE (POLLING)
// ==============================================================================

void ambilPerintahWebsite() {
  if (!ENABLE_API) return;
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(5000);

  String url = String(serverUrl) + endpointCommands;

  if (!http.begin(client, url)) return;

  tambahHeader(http);

  int kode = http.GET();

  if (kode == HTTP_CODE_OK) {
    String json = http.getString();

    // Jika antrean kosong (command == null), abaikan
    if (json.indexOf("\"command\":null") >= 0 || json.indexOf("\"command\": null") >= 0) {
      http.end();
      return;
    }

    String id = ambilString(json, "id");
    String type = ambilString(json, "type");

    if (id.length() > 0 && id != perintahTerakhir) {
      Serial.println("\n[API] PERINTAH DITERIMA!");
      Serial.print("[API] ID: ");
      Serial.println(id);
      Serial.print("[API] Tipe: ");
      Serial.println(type);

      if (type == "feed") {
        // Beri pakan ikan (Servo)
        kirimPerintahNano("CMD:PAKAN");
        perintahTerakhir = id;
        laporHasilPerintah(id, "completed");
      }
      else if (type == "pump") {
        // Kontrol pompa air (Relay)
        kirimPerintahNano("CMD:AIR");
        perintahTerakhir = id;
        laporHasilPerintah(id, "completed");
      }
      else if (type == "settime") {
        // Sinkronisasi RTC
        int tahun, bulan, tanggal;
        int jam, menit, detik;

        bool lengkap =
          ambilAngka(json, "year", tahun) &&
          ambilAngka(json, "month", bulan) &&
          ambilAngka(json, "day", tanggal) &&
          ambilAngka(json, "hour", jam) &&
          ambilAngka(json, "minute", menit) &&
          ambilAngka(json, "second", detik);

        if (lengkap) {
          char perintah[80];
          snprintf(
            perintah,
            sizeof(perintah),
            "CMD:SETTIME,%d,%d,%d,%d,%d,%d",
            tahun, bulan, tanggal, jam, menit, detik
          );
          kirimPerintahNano(String(perintah));
          perintahTerakhir = id;
          laporHasilPerintah(id, "completed");
        }
      }
    }
  } else if (kode != 204 && kode != HTTP_CODE_OK) {
    Serial.print("[API] Polling Perintah HTTP: ");
    Serial.println(kode);
  }

  http.end();
}

// ==============================================================================
// 14. SETUP
// ==============================================================================

void setup() {
  Serial.begin(115200);

  // Serial komunikasi hardware UART2 ke Arduino Nano
  Serial2.begin(
    9600,
    SERIAL_8N1,
    RX_ESP32,
    TX_ESP32
  );

  delay(1000);

  Serial.println("\n==========================================");
  Serial.println("   SISTEM MONITORING & KONTROL PAKAN IKAN  ");
  Serial.println("           FIRMWARE ESP32 SIAP            ");
  Serial.println("==========================================");

  koneksiWiFi();
}

// ==============================================================================
// 15. LOOP UTAMA
// ==============================================================================

void loop() {
  // Selalu baca data dari Arduino Nano
  bacaSerialNano();

  unsigned long sekarang = millis();

  // 1. Pemeriksaan & rekoneksi otomatis WiFi
  if (WiFi.status() != WL_CONNECTED && sekarang - waktuWiFi >= intervalWiFi) {
    waktuWiFi = sekarang;
    koneksiWiFi();
  }

  // 2. Pengiriman data telemetri sensor pH ke website
  if (ENABLE_API && dataValid && sekarang - waktuKirim >= intervalKirim) {
    waktuKirim = sekarang;
    kirimDataWebsite();
  }

  // 3. Polling perintah aksi dari website (feed / pump)
  if (ENABLE_API && sekarang - waktuPerintah >= intervalPerintah) {
    waktuPerintah = sekarang;
    ambilPerintahWebsite();
  }

  delay(5);
}
