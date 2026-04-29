# IoT Air Quality Monitor — Custom Web Server (Advanced)

Full custom stack: Backend API + embedded MQTT broker + SQLite + real-time dashboard.
No ThingsBoard or third-party IoT platform required.

## Architecture

```
Wemos D1 (MQ-135)    ─── HTTP POST ──▶┐
                                        ├─▶  Node.js Server (port 3000)
Raspberry Pi (DHT22) ─── MQTT ─────────┘       │         │
                          (port 1883)          SQLite   Socket.io
                                                           │
                                                      Browser Dashboard
```

---

## Part 1 — Run the Server

### 1.1 Prerequisites

- **Node.js 18+** — https://nodejs.org (download LTS)
- After installing, verify: `node -v` and `npm -v`

### 1.2 Install dependencies

```bash
cd server
npm install
```

### 1.3 Start the server

```bash
npm start
```

You should see:
```
MQTT broker  → mqtt://0.0.0.0:1883
Web server   → http://localhost:3000
```

Open **http://localhost:3000** in your browser — the dashboard will load.

> To restart automatically on file changes during development: `npm run dev`

### 1.4 Find your machine's LAN IP (needed for devices)

**Windows:** `ipconfig` → look for IPv4 Address  
**macOS / Linux:** `ifconfig` or `ip addr` → look for `192.168.x.x`

You will use this IP in the Wemos D1 and Raspberry Pi configs below.

---

## Part 2 — Wemos D1 (MQ-135 · Air Quality via HTTP)

### 2.1 Wiring

```
MQ-135 module    Wemos D1 Mini
─────────────    ─────────────
VCC           →  3.3V
GND           →  GND
AOUT          →  A0
```

> DOUT (digital out) is not used.

### 2.2 Arduino IDE setup

1. Download **Arduino IDE 2.x** from https://www.arduino.cc/en/software
2. Open IDE → **File → Preferences** → paste into *Additional boards manager URLs*:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. **Tools → Board → Boards Manager** → search `esp8266` → install **esp8266 by ESP8266 Community**
4. **Tools → Manage Libraries** → search `ArduinoJson` → install **ArduinoJson by Benoit Blanchon** (version 6.x)

### 2.3 Configure the sketch

Open `devices/wemos_d1/wemos_d1.ino` and edit:

```cpp
const char* WIFI_SSID     = "your_wifi_name";
const char* WIFI_PASSWORD = "your_wifi_password";
const char* SERVER_IP     = "192.168.1.100";   // ← your machine's LAN IP from step 1.4
```

### 2.4 Flash to Wemos D1

1. Plug Wemos D1 into USB
2. **Tools → Board** → select `LOLIN(WEMOS) D1 R2 & mini`
3. **Tools → Port** → select the COM / tty port that appeared
4. Click **Upload** (→ arrow button)
5. Open **Serial Monitor** at baud `115200` — you should see:
   ```
   Connected! IP: 192.168.1.x
   [OK] air_quality=143.0 ppm
   [OK] air_quality=141.0 ppm
   ```

### 2.5 Verify

Check the server terminal — you should see:
```
[HTTP] wemos_d1 → { device_id: 'wemos_d1', air_quality: 143, ... }
```

And the dashboard Air Quality card will start updating.

---

## Part 3 — Raspberry Pi (DHT22 · Temperature & Humidity via MQTT)

### 3.1 Wiring

```
DHT22              Raspberry Pi
─────              ────────────────────────────────
Pin 1  VCC      →  3.3V   (physical pin 1)
Pin 2  DATA     →  GPIO4  (physical pin 7)
                   + 10kΩ resistor between VCC and DATA
Pin 4  GND      →  GND    (physical pin 6)
```

> **DHT11** also works — change `Adafruit_DHT.DHT22` to `Adafruit_DHT.DHT11` in the script.

### 3.2 Install Python dependencies

```bash
sudo apt update && sudo apt install python3-pip -y
pip3 install paho-mqtt Adafruit_DHT
```

> On Raspberry Pi OS Bookworm, if pip is blocked:
> ```bash
> pip3 install paho-mqtt Adafruit_DHT --break-system-packages
> ```

### 3.3 Configure the script

Open `devices/raspberry_pi/dht_mqtt.py` and edit:

```python
BROKER_HOST = "192.168.1.100"   # ← your machine's LAN IP from step 1.4
DHT_PIN     = 4                 # BCM GPIO number (change if needed)
```

### 3.4 Run

```bash
python3 devices/raspberry_pi/dht_mqtt.py
```

Expected output:
```
[INFO] Connecting to MQTT broker at 192.168.1.100:1883...
[MQTT] Connected to broker at 192.168.1.100:1883
[SENT] {'device_id': 'raspberry_pi', 'temperature': 28.45, 'humidity': 64.3}
```

### 3.5 Verify

Check the server terminal:
```
[MQTT] client connected : raspberry_pi
[MQTT] raspberry_pi → { device_id: 'raspberry_pi', temperature: 28.45, humidity: 64.3, ... }
```

The Temperature and Humidity cards on the dashboard will start updating.

### 3.6 Run on boot (optional)

```bash
crontab -e
# Add this line at the bottom:
@reboot python3 /home/pi/IotLab4/devices/raspberry_pi/dht_mqtt.py >> /home/pi/dht.log 2>&1 &
```

---

## Part 4 — Dashboard

Open **http://localhost:3000** (or `http://<server-ip>:3000` from another device).

| Section | What it shows |
|---------|--------------|
| Device Status | Online / Offline badge + last-seen time for each device |
| Current Readings | Live temperature, humidity, and air quality values |
| History charts | Line charts for each metric (last 50 readings) |
| Recent Readings table | Last 25 rows from the database |

The dashboard updates in **real time via WebSocket** — no page reload needed.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sensors` | Receive sensor data from a device |
| `GET`  | `/api/sensors?device_id=X&limit=50` | Query historical data |
| `GET`  | `/api/sensors/latest` | Latest reading per device |
| `POST` | `/api/commands/:deviceId` | Send a command to a device |

**POST /api/sensors — example payloads**
```json
{ "device_id": "wemos_d1",    "air_quality": 143.0 }
{ "device_id": "raspberry_pi","temperature": 28.5, "humidity": 64.3 }
```

---

## Project Structure

```
IotLab4/
├── server/
│   ├── package.json       Node.js dependencies
│   ├── server.js          Express + MQTT broker (aedes) + Socket.io
│   ├── db.js              SQLite — insert, history, latest
│   ├── routes/api.js      REST endpoints
│   └── mqtt/handler.js    Parses MQTT messages → DB + WebSocket
├── frontend/
│   ├── index.html         Dashboard layout
│   ├── style.css          Dark theme, responsive grid
│   └── app.js             Chart.js + Socket.io real-time client
└── devices/
    ├── wemos_d1/wemos_d1.ino       Arduino — MQ-135 → HTTP POST
    └── raspberry_pi/dht_mqtt.py    Python  — DHT22 → MQTT
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails | Make sure Node.js 18+ is installed |
| Port 3000 already in use | Change `HTTP_PORT` in `server/server.js` |
| Wemos D1 HTTP error | Confirm `SERVER_IP` is the correct LAN IP; Wemos and server must be on the same WiFi |
| Raspberry Pi MQTT refused | Port 1883 must not be blocked by firewall (`sudo ufw allow 1883`) |
| DHT22 returns `None` | Check wiring; 10kΩ pull-up resistor between VCC and DATA is required |
| Dashboard shows no data | Check browser console (F12) for WebSocket errors |
