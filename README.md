# IoT Air Quality Monitor

Custom web server replacing IoT platforms (Thingsboard / OpenRemote).

## Architecture

```
Wemos D1 (MQ-135) ──HTTP POST──▶┐
                                  ├─▶ Node.js Server ──▶ SQLite ──▶ Dashboard
Raspberry Pi (DHT22) ──MQTT──────┘      (port 3000)               (WebSocket)
                                        MQTT broker
                                        (port 1883)
```

## Quick Start

### 1. Install & run the server

```bash
cd server
npm install
npm start
```

Open http://localhost:3000

### 2. Configure devices

**Wemos D1** (`devices/wemos_d1/wemos_d1.ino`):
- Set `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL` (use your machine's LAN IP)
- Flash via Arduino IDE (select board: Wemos D1 R1 / LOLIN(WEMOS) D1 R2)
- Required libraries: `ArduinoJson` (v6)

**Raspberry Pi** (`devices/raspberry_pi/dht_mqtt.py`):
```bash
pip install paho-mqtt Adafruit_DHT
# Edit MQTT_BROKER to your server's LAN IP
python dht_mqtt.py
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sensors` | Receive sensor data (Wemos D1 via HTTP) |
| GET | `/api/sensors?device_id=X&limit=50` | Query history |
| GET | `/api/sensors/latest` | Latest reading per device |
| POST | `/api/commands/:deviceId` | Send command to device |

### POST /api/sensors — example payload
```json
{ "device_id": "wemos_d1", "air_quality": 135.5 }
{ "device_id": "raspberry_pi", "temperature": 28.4, "humidity": 65.2 }
```

## Data Flow

1. **Wemos D1** reads MQ-135 → HTTP POST to `/api/sensors`
2. **Raspberry Pi** reads DHT22 → MQTT publish to `sensors/raspberry`
3. Server stores reading in **SQLite** and emits via **WebSocket**
4. **Dashboard** updates charts in real time (no page reload needed)
