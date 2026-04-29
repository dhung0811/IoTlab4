/*
 * Wemos D1 Mini — MQ-135 Air Quality Sensor
 * Sends telemetry to custom web server via HTTP POST every 5 seconds
 *
 * Libraries required (Arduino Library Manager):
 *   - ArduinoJson  (by Benoit Blanchon, v6.x)
 *   ESP8266WiFi + ESP8266HTTPClient are built-in with the ESP8266 board package
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// ── Configuration ──────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// IP address of the machine running server.js (must be on the same network)
const char* SERVER_IP     = "192.168.1.100";
const int   SERVER_PORT   = 3000;

const char* DEVICE_ID     = "wemos_d1";
const int   MQ135_PIN     = A0;
const int   SEND_INTERVAL = 5000;  // ms

// ── Helpers ───────────────────────────────────────────────────────────────────
// Raw ADC 0–1023 mapped to 0–500 ppm (rough scale).
// For accurate ppm values, calibrate R0 with the MQ135 library.
float readAirQualityPPM() {
  return map(analogRead(MQ135_PIN), 0, 1023, 0, 500);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nBooting Wemos D1 — Custom Server HTTP node");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  float aq = readAirQualityPPM();

  String url = String("http://") + SERVER_IP + ":" + SERVER_PORT + "/api/sensors";

  StaticJsonDocument<128> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["air_quality"] = aq;
  String payload;
  serializeJson(doc, payload);

  WiFiClient client;
  HTTPClient http;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);
  if (code == HTTP_CODE_OK) {
    Serial.printf("[OK] air_quality=%.1f ppm\n", aq);
  } else {
    Serial.printf("[ERROR] HTTP %d — check SERVER_IP and that server.js is running\n", code);
  }
  http.end();

  delay(SEND_INTERVAL);
}
