"""
Raspberry Pi — DHT22 Temperature & Humidity Sensor
Publishes telemetry to ThingsBoard via MQTT every 5 seconds.

Requirements:
    pip install paho-mqtt Adafruit_DHT

Wiring:
    DHT22 VCC  → 3.3V (pin 1)
    DHT22 DATA → GPIO4 (pin 7)  ← change DHT_PIN if using a different GPIO
    DHT22 GND  → GND  (pin 6)
"""

import json
import time
import sys

import Adafruit_DHT
import paho.mqtt.client as mqtt

# ── Configuration ────────────────────────────────────────────────────────────
TB_HOST       = "demo.thingsboard.io"   # or your self-hosted ThingsBoard IP
TB_PORT       = 1883
ACCESS_TOKEN  = "YOUR_DEVICE_ACCESS_TOKEN"  # Device → Copy Access Token

MQTT_TOPIC    = "v1/devices/me/telemetry"   # ThingsBoard standard topic

DHT_SENSOR    = Adafruit_DHT.DHT22
DHT_PIN       = 4                           # BCM GPIO number

SEND_INTERVAL = 5                           # seconds

# ── MQTT callbacks ────────────────────────────────────────────────────────────
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT] Connected to ThingsBoard at {TB_HOST}:{TB_PORT}")
    else:
        print(f"[MQTT] Connection failed (rc={rc})")
        sys.exit(1)

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print("[MQTT] Unexpected disconnect, will auto-reconnect...")

# ── Main ──────────────────────────────────────────────────────────────────────
# ThingsBoard uses the access token as the MQTT username (no password needed)
client = mqtt.Client()
client.username_pw_set(ACCESS_TOKEN)
client.on_connect    = on_connect
client.on_disconnect = on_disconnect

print(f"[INFO] Connecting to ThingsBoard at {TB_HOST}:{TB_PORT}...")
client.connect(TB_HOST, TB_PORT, keepalive=60)
client.loop_start()

try:
    while True:
        humidity, temperature = Adafruit_DHT.read_retry(DHT_SENSOR, DHT_PIN)

        if humidity is not None and temperature is not None:
            payload = {
                "temperature": round(temperature, 2),
                "humidity":    round(humidity, 2),
            }
            client.publish(MQTT_TOPIC, json.dumps(payload))
            print(f"[SENT] {payload}")
        else:
            print("[WARN] Failed to read DHT22 sensor, retrying next cycle...")

        time.sleep(SEND_INTERVAL)

except KeyboardInterrupt:
    print("\n[INFO] Shutting down...")
    client.loop_stop()
    client.disconnect()
