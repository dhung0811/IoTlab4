/*
 * Wemos D1 Mini — MQ-135 Air Quality Sensor
 * Sends telemetry to ThingsBoard via HTTP POST every 5 seconds
 *
 * Libraries required (Arduino Library Manager):
 *   - ArduinoJson  (by Benoit Blanchon, v6.x)
 *   ESP8266WiFi + ESP8266HTTPClient are built-in with the ESP8266 board package
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// ── Configuration ─────────────────────────────────────────────────────────────
const char* WIFI_SSID      = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";

// ThingsBoard host — use demo.thingsboard.io or your self-hosted IP
const char* TB_HOST        = "demo.thingsboard.io";
// Access token from ThingsBoard: Device → Copy Access Token
const char* ACCESS_TOKEN   = "YOUR_DEVICE_ACCESS_TOKEN";

const int   MQ135_PIN      = A0;
const int   SEND_INTERVAL  = 5000;  // ms

// ── Helpers ───────────────────────────────────────────────────────────────────
float readAirQualityPPM() {
  // Raw ADC 0–1023 → mapped to 0–500 ppm (rough scale)
  // For accurate readings, calibrate R0 with the MQ135 library
  return map(analogRead(MQ135_PIN), 0, 1023, 0, 500);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nBooting Wemos D1 — ThingsBoard HTTP node");

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

  // ThingsBoard telemetry endpoint
  String url = String("http://") + TB_HOST + "/api/v1/" + ACCESS_TOKEN + "/telemetry";

  StaticJsonDocument<64> doc;
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
    Serial.printf("[ERROR] HTTP %d\n", code);
  }
  http.end();

  delay(SEND_INTERVAL);
}
