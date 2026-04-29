# IoT Air Quality Monitor — ThingsBoard

Monitor temperature, humidity, and air quality in real time using ThingsBoard.

## Data Flow

```
Wemos D1 (MQ-135)    ── HTTP POST ──▶ ThingsBoard
Raspberry Pi (DHT22) ── MQTT      ──▶ ThingsBoard
```

---

## Part 1 — ThingsBoard Account & Devices

### 1.1 Create an account

Go to https://demo.thingsboard.io and register a free account (or use your self-hosted instance).

### 1.2 Create device: Wemos D1

1. Left sidebar → **Devices** → click **+** (top-right) → **Add new device**
2. Name: `Wemos D1` → **Add**
3. Click the device row → **Copy access token** → save it (you will need it in step 2)

### 1.3 Create device: Raspberry Pi

1. Repeat the same steps above
2. Name: `Raspberry Pi` → **Add**
3. **Copy access token** → save it (you will need it in step 3)

---

## Part 2 — Wemos D1 (MQ-135 · Air Quality via HTTP)

### 2.1 Wiring

```
MQ-135   Wemos D1
------   --------
VCC   →  3.3V
GND   →  GND
AOUT  →  A0
```

> DOUT (digital out) is not used.

### 2.2 Install Arduino IDE & board support

1. Download **Arduino IDE 2.x** from https://www.arduino.cc/en/software
2. Open IDE → **File → Preferences** → paste this URL into *Additional boards manager URLs*:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. **Tools → Board → Boards Manager** → search `esp8266` → install **esp8266 by ESP8266 Community**

### 2.3 Install required library

**Tools → Manage Libraries** → search `ArduinoJson` → install **ArduinoJson by Benoit Blanchon** (version 6.x)

### 2.4 Configure the sketch

Open `devices/wemos_d1/wemos_d1.ino` and edit the top section:

```cpp
const char* WIFI_SSID     = "your_wifi_name";
const char* WIFI_PASSWORD = "your_wifi_password";
const char* TB_HOST       = "demo.thingsboard.io";
const char* ACCESS_TOKEN  = "paste_wemos_access_token_here";
```

### 2.5 Flash

1. Plug Wemos D1 into USB
2. **Tools → Board** → select `LOLIN(WEMOS) D1 R2 & mini`
3. **Tools → Port** → select the COM/tty port that appeared
4. Click **Upload** (→ arrow button)
5. Open **Serial Monitor** (baud `115200`) — you should see:
   ```
   Connected! IP: 192.168.x.x
   [OK] air_quality=143.0 ppm
   [OK] air_quality=141.0 ppm
   ```

### 2.6 Verify in ThingsBoard

**Devices → Wemos D1 → Latest telemetry** tab — the key `air_quality` should appear and update every 5 seconds.

---

## Part 3 — Raspberry Pi (DHT22 · Temperature & Humidity via MQTT)

### 3.1 Wiring

```
DHT22        Raspberry Pi (BCM numbering)
-----        ---------------------------
Pin 1 VCC  → 3.3V   (physical pin 1)
Pin 2 DATA → GPIO4  (physical pin 7)  ← 10kΩ pull-up resistor between VCC and DATA
Pin 4 GND  → GND    (physical pin 6)
```

> DHT11 works too — change `Adafruit_DHT.DHT22` to `Adafruit_DHT.DHT11` in the script.

### 3.2 Install Python dependencies

```bash
sudo apt update
sudo apt install python3-pip -y
pip3 install paho-mqtt Adafruit_DHT
```

> On newer Raspberry Pi OS (Bookworm), if `pip3` is blocked, use:
> ```bash
> pip3 install paho-mqtt Adafruit_DHT --break-system-packages
> ```

### 3.3 Configure the script

Open `devices/raspberry_pi/dht_mqtt.py` and edit the top section:

```python
TB_HOST      = "demo.thingsboard.io"
ACCESS_TOKEN = "paste_raspberry_access_token_here"
DHT_PIN      = 4    # BCM GPIO number — change if you used a different pin
```

### 3.4 Run

```bash
python3 devices/raspberry_pi/dht_mqtt.py
```

Expected output:
```
[INFO] Connecting to ThingsBoard at demo.thingsboard.io:1883...
[MQTT] Connected to ThingsBoard at demo.thingsboard.io:1883
[SENT] {'temperature': 28.45, 'humidity': 64.3}
[SENT] {'temperature': 28.47, 'humidity': 64.1}
```

### 3.5 Run on boot (optional)

```bash
crontab -e
# Add this line:
@reboot python3 /home/pi/IotLab4/devices/raspberry_pi/dht_mqtt.py &
```

### 3.6 Verify in ThingsBoard

**Devices → Raspberry Pi → Latest telemetry** — keys `temperature` and `humidity` should appear.

---

## Part 4 — ThingsBoard Dashboard

### 4.1 Create a new dashboard

1. Left sidebar → **Dashboards** → **+** → **Create new dashboard**
2. Name: `Air Quality Monitor` → **Add**
3. Click the dashboard → **Edit** (pencil icon, bottom-right)

### 4.2 Add current-value cards

For each metric, add a **Value Card** widget:

1. Click **+** (Add widget) → **Cards** → **Value Card**
2. **Add datasource**:
   - Entity type: `Device`
   - Device: select the device
   - Telemetry key: the key from the table below
3. Set a title and click **Add**

| Widget title    | Device       | Key           |
|-----------------|--------------|---------------|
| Temperature     | Raspberry Pi | `temperature` |
| Humidity        | Raspberry Pi | `humidity`    |
| Air Quality     | Wemos D1     | `air_quality` |

### 4.3 Add time-series line charts

1. Click **+** → **Charts** → **Time series Line Chart**
2. Add datasource → Device: `Raspberry Pi` → keys: `temperature`, `humidity`
3. Add another chart for `Wemos D1` → key: `air_quality`
4. Set time window to **Real time — Last 30 minutes**

### 4.4 Add gauge widgets (optional)

1. Click **+** → **Widgets Bundle: Gauge** → **Radial Gauge**
2. One gauge per metric — set min/max:
   - Temperature: 0–50 °C
   - Humidity: 0–100 %
   - Air Quality: 0–500 ppm

### 4.5 Enable real-time refresh

On each time-series chart widget:
- Widget settings → **Time window** → **Real time** → interval `5 seconds`

Click **Save** (checkmark, bottom-right) when done.

---

## Telemetry Reference

| Device       | Protocol | ThingsBoard endpoint                              | Keys sent                    |
|--------------|----------|---------------------------------------------------|------------------------------|
| Wemos D1     | HTTP     | `POST /api/v1/{token}/telemetry`                  | `air_quality` (ppm)          |
| Raspberry Pi | MQTT     | topic `v1/devices/me/telemetry`, user = `{token}` | `temperature` (°C), `humidity` (%) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Wemos D1 not connecting to WiFi | Check SSID/password; ensure 2.4 GHz band |
| HTTP error code on Wemos | Confirm `TB_HOST` and `ACCESS_TOKEN` are correct |
| MQTT connection refused on Pi | Port 1883 must be open; check firewall on self-hosted TB |
| DHT22 reads `None` | Check wiring and the 10kΩ pull-up resistor |
| No data in ThingsBoard | Open *Latest telemetry* tab — not the *Attributes* tab |
