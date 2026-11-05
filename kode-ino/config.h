#ifndef CONFIG_H
#define CONFIG_H

// ==============================================================================
// KONFIGURASI WIFI & KREDENSIAL SISTEM PAKAN IKAN
// ==============================================================================

// 1. Pengaturan Jaringan WiFi / Hotspot
#define WIFI_SSID           "redmi 15"
#define WIFI_PASSWORD       "06062003"

// 2. Pengaturan Server REST API
// Gunakan domain HTTPS publik atau IP gateway lokal
#define SERVER_URL          "https://pakan-ikan.my.id"

// 3. Identitas Perangkat (Device ID)
// Wajib sama dengan ID yang didaftarkan pada menu 'Perangkat' di web/aplikasi
#define DEVICE_ID           "fish-feeder-001"

// 4. Kunci Rahasia Perangkat (X-Device-Key)
// Kunci otentikasi hardware untuk melindungi endpoint telemetri dan antrean perintah
#define DEVICE_KEY          "pakan-ikan-secret-2026"

// 5. Saklar Pengaktifan Komunikasi API
// true  = Terhubung ke server website (mode online normal)
// false = Mode pengujian lokal (hanya menampilkan log serial tanpa akses internet)
#define ENABLE_API          true

// 6. Interval Waktu Pengiriman & Polling (milidetik)
#define INTERVAL_KIRIM_DATA     5000    // Kirim telemetri pH setiap 5000 ms (5 detik)
#define INTERVAL_CEK_PERINTAH   2000    // Polling perintah baru setiap 2000 ms (2 detik)
#define INTERVAL_CEK_WIFI       10000   // Cek status koneksi WiFi setiap 10000 ms (10 detik)
#define HTTP_TIMEOUT_MS         5000    // Batas waktu timeout request HTTP (5 detik)

// 7. Pin Komunikasi Serial Hardware (UART2) ke Arduino Nano
#define PIN_RX_ESP32        16
#define PIN_TX_ESP32        17
#define BAUDRATE_NANO       9600
#define BAUDRATE_SERIAL     115200

#endif // CONFIG_H
