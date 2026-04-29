"""
Raspberry Pi — DHT22 Temperature & Humidity Sensor
Publishes data to MQTT broker every 5 seconds.

Requirements:
    pip install paho-mqtt Adafruit_DHT

Wiring:
    DHT22 VCC  → 3.3V (pin 1)
    DHT22 DATA → GPIO4 (pin 7)
    DHT22 GND  → GND  (pin 6)
"""

import json
import time
import sys

import Adafruit_DHT
import paho.mqtt.client as mqtt

# ── Configuration ────────────────────────────────────────────────────────────
MQTT_BROKER  = "YOUR_SERVER_IP"   # IP of the machine running server.js
MQTT_PORT    = 1883
MQTT_TOPIC   = "sensors/raspberry"
DEVICE_ID    = "raspberry_pi"

DHT_SENSOR   = Adafruit_DHT.DHT22
DHT_PIN      = 4                  # BCM GPIO number

SEND_INTERVAL = 5                 # seconds

# ── MQTT callbacks ────────────────────────────────────────────────────────────
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT] Connected to broker at {MQTT_BROKER}:{MQTT_PORT}")
    else:
        print(f"[MQTT] Connection failed (rc={rc})")
        sys.exit(1)

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print("[MQTT] Unexpected disconnect, will auto-reconnect...")

# ── Main ──────────────────────────────────────────────────────────────────────
client = mqtt.Client(client_id=DEVICE_ID)
client.on_connect    = on_connect
client.on_disconnect = on_disconnect

print(f"[INFO] Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
client.loop_start()

try:
    while True:
        humidity, temperature = Adafruit_DHT.read_retry(DHT_SENSOR, DHT_PIN)

        if humidity is not None and temperature is not None:
            payload = {
                "device_id":   DEVICE_ID,
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
