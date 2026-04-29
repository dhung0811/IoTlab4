/*
 * Wemos D1 Mini — MQ-135 Air Quality Sensor
 * Sends data to web server via HTTP POST every 5 seconds
 *
 * Libraries required (install via Arduino Library Manager):
 *   - ESP8266WiFi      (built-in with ESP8266 board package)
 *   - ESP8266HTTPClient (built-in with ESP8266 board package)
 *   - ArduinoJson      (by Benoit Blanchon, v6.x)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// ── Configuration ────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://YOUR_SERVER_IP:3000/api/sensors";
const char* DEVICE_ID     = "wemos_d1";

const int MQ135_PIN      = A0;
const int SEND_INTERVAL  = 5000;  // ms

// ── MQ-135 calibration ───────────────────────────────────────────────────────
// Raw ADC range: 0–1023.  We map to 0–500 ppm (rough scale).
// For a real calibration, use the MQ135 library with Rs/R0 ratio.
float readAirQualityPPM() {
  int raw = analogRead(MQ135_PIN);
  return map(raw, 0, 1023, 0, 500);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nBooting Wemos D1 Air Quality Node...");

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

  // Build JSON payload
  StaticJsonDocument<128> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["air_quality"] = aq;
  String payload;
  serializeJson(doc, payload);

  // Send HTTP POST
  WiFiClient client;
  HTTPClient http;
  http.begin(client, SERVER_URL);
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
