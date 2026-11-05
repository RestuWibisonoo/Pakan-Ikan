#ifndef CONFIG_EXAMPLE_H
#define CONFIG_EXAMPLE_H

// Salin file ini menjadi config.h dan sesuaikan dengan konfigurasi jaringan Anda
#define WIFI_SSID           "NAMA_WIFI_HOTSPOT"
#define WIFI_PASSWORD       "PASSWORD_WIFI"
#define SERVER_URL          "https://pakan-ikan.my.id"
#define DEVICE_ID           "fish-feeder-001"
#define DEVICE_KEY          "ISI_KUNCI_RAHASIA_PERANGKAT"
#define ENABLE_API          true

#define INTERVAL_KIRIM_DATA     5000
#define INTERVAL_CEK_PERINTAH   2000
#define INTERVAL_CEK_WIFI       10000
#define HTTP_TIMEOUT_MS         5000

#define PIN_RX_ESP32        16
#define PIN_TX_ESP32        17
#define BAUDRATE_NANO       9600
#define BAUDRATE_SERIAL     115200

#endif // CONFIG_EXAMPLE_H
