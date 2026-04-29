"""
Raspberry Pi — DHT22 Temperature & Humidity Sensor
Publishes telemetry to the custom MQTT broker (aedes inside server.js) every 5 seconds.

Requirements:
    pip3 install paho-mqtt Adafruit_DHT

Wiring:
    DHT22 Pin 1 VCC  → 3.3V   (physical pin 1)
    DHT22 Pin 2 DATA → GPIO4  (physical pin 7)  + 10kΩ pull-up to 3.3V
    DHT22 Pin 4 GND  → GND   (physical pin 6)
"""

import json
import time
import sys

import Adafruit_DHT
import paho.mqtt.client as mqtt

# ── Configuration ─────────────────────────────────────────────────────────────
BROKER_HOST   = "192.168.1.100"   # IP of the machine running server.js
BROKER_PORT   = 1883
MQTT_TOPIC    = "sensors/raspberry"   # server listens on sensors/*

DEVICE_ID     = "raspberry_pi"
DHT_SENSOR    = Adafruit_DHT.DHT22
DHT_PIN       = 4               # BCM GPIO number (change if using a different pin)

SEND_INTERVAL = 5               # seconds

# ── MQTT callbacks ────────────────────────────────────────────────────────────
def on_connect(_client, _userdata, _flags, rc):
    if rc == 0:
        print(f"[MQTT] Connected to broker at {BROKER_HOST}:{BROKER_PORT}")
    else:
        print(f"[MQTT] Connection failed (rc={rc}) — check BROKER_HOST and that server.js is running")
        sys.exit(1)

def on_disconnect(_client, _userdata, rc):
    if rc != 0:
        print("[MQTT] Unexpected disconnect, paho will auto-reconnect...")

# ── Main ──────────────────────────────────────────────────────────────────────
client = mqtt.Client(client_id=DEVICE_ID)
client.on_connect    = on_connect
client.on_disconnect = on_disconnect

print(f"[INFO] Connecting to MQTT broker at {BROKER_HOST}:{BROKER_PORT}...")
client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
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
            print("[WARN] DHT22 read failed, retrying next cycle...")

        time.sleep(SEND_INTERVAL)

except KeyboardInterrupt:
    print("\n[INFO] Shutting down...")
    client.loop_stop()
    client.disconnect()
