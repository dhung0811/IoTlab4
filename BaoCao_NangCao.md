# Báo Cáo Bài Tập Nâng Cao — Hệ Thống Giám Sát Chất Lượng Không Khí IoT

---

## 1. Kiến Trúc Hệ Thống (System Architecture)

### 1.1 Sơ đồ khối (Block Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TẦNG THIẾT BỊ (Device Layer)                     │
│                                                                              │
│  ┌──────────────────────┐           ┌──────────────────────────┐             │
│  │      Wemos D1 Mini   │           │       Raspberry Pi        │             │
│  │  ┌────────────────┐  │           │  ┌─────────────────────┐  │             │
│  │  │  Cảm biến      │  │           │  │  Cảm biến DHT22     │  │             │
│  │  │  MQ-135        │  │           │  │  (Nhiệt độ, Độ ẩm)  │  │             │
│  │  └───────┬────────┘  │           │  └──────────┬──────────┘  │             │
│  │  Arduino C++ sketch  │           │  Python script (paho-mqtt) │             │
│  └──────────┼───────────┘           └─────────────┼─────────────┘             │
│             │ HTTP POST                            │ MQTT Publish              │
│             │ /api/sensors                         │ sensors/raspberry         │
└─────────────┼────────────────────────────────────────────────────────────────┘
              │                                      │
              │           ┌──────────────────────────┘
              │           │
              ▼           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TẦNG BACKEND (Server Layer)                          │
│                         192.168.x.x                                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Node.js server.js  (port 3000)                    │    │
│  │                                                                      │    │
│  │  ┌────────────────────┐    ┌──────────────────┐   ┌──────────────┐  │    │
│  │  │  Aedes MQTT Broker │    │   Express REST   │   │  Socket.io   │  │    │
│  │  │  (port 1883)       │───▶│   API Router     │──▶│  WebSocket   │  │    │
│  │  │  mqtt/handler.js   │    │  routes/api.js   │   │  (port 3000) │  │    │
│  │  └────────────────────┘    └────────┬─────────┘   └──────┬───────┘  │    │
│  └──────────────────────────────────────┼───────────────────────────────┘    │
│                                         │                    │                │
│                                         ▼                    │                │
│                              ┌─────────────────┐            │                │
│                              │   SQLite DB      │            │                │
│                              │  db.js           │            │                │
│                              │  sensor_data.db  │            │                │
│                              └─────────────────┘            │                │
└──────────────────────────────────────────────────────────────────────────────┘
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TẦNG HIỂN THỊ (Presentation Layer)                    │
│                                                                              │
│              ┌──────────────────────────────────────────┐                   │
│              │  Web Dashboard  http://192.168.x.x:3000   │                   │
│              │  index.html + style.css + app.js          │                   │
│              │  Chart.js · Socket.io client              │                   │
│              └──────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Vai trò từng thành phần

| Thành phần | Vai trò | Chức năng |
|---|---|---|
| **Wemos D1 Mini** | Thu thập & truyền dữ liệu | Đọc giá trị chất lượng không khí từ cảm biến MQ-135 qua ADC, đóng gói JSON và gửi đến Backend Server mỗi 5 giây bằng HTTP POST. |
| **Raspberry Pi** | Thu thập & truyền dữ liệu | Đọc nhiệt độ và độ ẩm từ cảm biến DHT22, đóng gói JSON và publish lên MQTT Broker mỗi 5 giây. |
| **Aedes MQTT Broker** | Nhận & điều phối tin nhắn MQTT | Broker nhúng trong Node.js, nhận message từ Raspberry Pi trên topic `sensors/raspberry`, chuyển sang handler xử lý. Không cần cài Mosquitto riêng. |
| **Express REST API** | Xử lý & lưu trữ dữ liệu | Cung cấp các endpoint để nhận dữ liệu từ Wemos D1 (POST), truy vấn lịch sử (GET), lấy giá trị mới nhất (GET) và gửi lệnh điều khiển (POST). |
| **SQLite (better-sqlite3)** | Lưu trữ dữ liệu | Lưu toàn bộ bản ghi cảm biến theo thời gian với timestamp tự động. File `sensor_data.db` nằm trực tiếp trong thư mục server. |
| **Socket.io WebSocket** | Truyền dữ liệu thời gian thực | Sau khi dữ liệu được lưu vào DB, server emit sự kiện `sensor_data` đến tất cả dashboard client đang kết nối — không cần polling. |
| **Web Dashboard** | Hiển thị dữ liệu | Giao diện SPA hiển thị giá trị hiện tại, trạng thái thiết bị, biểu đồ lịch sử (Chart.js) và bảng dữ liệu gần nhất. Cập nhật theo thời gian thực qua Socket.io. |

---

### 1.3 Công nghệ sử dụng

| Thành phần | Framework / Thư viện | Phiên bản |
|---|---|---|
| Wemos D1 firmware | Arduino C++ (ESP8266 board package) | ESP8266 core 3.x |
| Wemos D1 HTTP | `ESP8266HTTPClient` (built-in) | — |
| Wemos D1 JSON | `ArduinoJson` by Benoit Blanchon | 6.x |
| Raspberry Pi script | Python 3 | 3.9+ |
| Raspberry Pi MQTT client | `paho-mqtt` | 1.6+ |
| Raspberry Pi sensor | `Adafruit_DHT` | 1.4+ |
| Backend runtime | Node.js | 18+ |
| Backend web framework | `express` | 4.18 |
| MQTT Broker (embedded) | `aedes` | 0.50 |
| Database driver | `better-sqlite3` | 9.x |
| WebSocket server | `socket.io` | 4.7 |
| Dashboard charts | `Chart.js` (CDN) | 4.4 |
| Dashboard WebSocket client | `socket.io-client` (via `/socket.io/socket.io.js`) | 4.7 |

---

### 1.4 Thông tin triển khai

| Dịch vụ | Địa chỉ IP | Cổng | Giao thức |
|---|---|---|---|
| MQTT Broker (Aedes) | `192.168.x.x` (LAN) | `1883` | TCP / MQTT 3.1.1 |
| Backend REST API | `192.168.x.x` (LAN) | `3000` | HTTP/1.1 |
| WebSocket Server | `192.168.x.x` (LAN) | `3000` | WS (cùng port HTTP) |
| Web Dashboard | `http://192.168.x.x:3000` | `3000` | HTTP |
| SQLite Database | localhost (file) | — | File I/O |

> Lưu ý: MQTT Broker và Web Server đều nằm trong cùng một tiến trình Node.js, dùng chung máy chủ.

---

## 2. Luồng Dữ Liệu (Data Flow)

### 2.1 Sơ đồ luồng dữ liệu (Sequence Diagram)

```
Wemos D1        Raspberry Pi        Aedes MQTT       Express API       SQLite          Dashboard
   │                  │                  │                │                │                │
   │  analogRead(A0)  │                  │                │                │                │
   │◄─────────────────│                  │                │                │                │
   │                  │ DHT22.read()     │                │                │                │
   │                  │◄─────────────────│                │                │                │
   │                  │                  │                │                │                │
   │─── HTTP POST ────────────────────────────────────────▶                │                │
   │  /api/sensors    │                  │                │                │                │
   │  {device_id,     │                  │                │                │                │
   │   air_quality}   │                  │                │                │                │
   │                  │                  │                │ insertReading()│                │
   │                  │                  │                │───────────────▶│                │
   │                  │                  │                │                │   io.emit()    │
   │                  │                  │                │─────────────────────────────────▶
   │◄─── 200 OK ─────────────────────────────────────────│                │                │
   │  {"success":true}│                  │                │                │                │
   │                  │                  │                │                │                │
   │                  │──── MQTT ────────▶                │                │                │
   │                  │  topic:          │                │                │                │
   │                  │  sensors/        │                │                │                │
   │                  │  raspberry       │  handleMqtt()  │                │                │
   │                  │  {device_id,     │───────────────▶│                │                │
   │                  │   temperature,   │                │ insertReading()│                │
   │                  │   humidity}      │                │───────────────▶│                │
   │                  │                  │                │                │   io.emit()    │
   │                  │                  │                │─────────────────────────────────▶
   │                  │                  │                │                │                │
   │                  │                  │         GET /api/sensors/latest │                │
   │                  │                  │◄────────────────────────────────────────────────│
   │                  │                  │                │ SELECT * WHERE │                │
   │                  │                  │                │ MAX(id) per    │                │
   │                  │                  │                │ device_id      │                │
   │                  │                  │                │◄───────────────│                │
   │                  │                  │                │─────────────────────────────────▶
   │                  │                  │                │  JSON response │                │
```

---

### 2.2 Mô tả từng bước

**Bước 1 — Wemos D1 thu thập dữ liệu (HTTP)**

Wemos D1 đọc giá trị điện áp analog từ cảm biến MQ-135 qua chân `A0` (`analogRead(A0)`), ánh xạ về thang 0–500 ppm. Sau đó, dùng thư viện `ESP8266HTTPClient` gửi HTTP POST đến `http://<server_ip>:3000/api/sensors` mỗi 5 giây.

**Bước 2 — Raspberry Pi thu thập dữ liệu (MQTT)**

Raspberry Pi dùng thư viện `Adafruit_DHT` đọc nhiệt độ và độ ẩm từ cảm biến DHT22. Dữ liệu được đóng gói thành JSON và publish lên topic `sensors/raspberry` của MQTT Broker qua kết nối TCP port 1883 dùng `paho-mqtt`. Username MQTT là `raspberry_pi` (client_id), không cần password vì broker nội bộ không yêu cầu xác thực.

**Bước 3 — Backend nhận và validate dữ liệu**

- Với HTTP: Express middleware `express.json()` parse request body. Route handler kiểm tra `device_id` có tồn tại không, nếu thiếu trả về `400 Bad Request`.
- Với MQTT: `aedes` emit sự kiện `publish`, `mqtt/handler.js` bắt sự kiện, dùng `JSON.parse()` để parse payload, kiểm tra `device_id`, nếu lỗi log và bỏ qua.

**Bước 4 — Lưu vào Database**

Hàm `insertReading()` trong `db.js` thực thi câu lệnh `INSERT` vào bảng `sensor_readings`. Các trường không có trong payload (ví dụ Wemos không gửi `temperature`) được lưu là `NULL`.

**Bước 5 — Push lên Dashboard (WebSocket)**

Ngay sau khi lưu DB, server gọi `io.emit('sensor_data', event)` để broadcast đến tất cả Socket.io client đang kết nối. Dashboard nhận sự kiện này ngay lập tức — không cần polling.

**Bước 6 — Dashboard hiển thị**

`app.js` trên browser lắng nghe sự kiện `sensor_data`. Khi nhận được, cập nhật số liệu trên card, thêm điểm mới vào Chart.js (xóa điểm cũ nhất nếu vượt 50 điểm), thêm hàng vào bảng và cập nhật trạng thái thiết bị (Online/Offline).

---

### 2.3 Định dạng dữ liệu

**MQTT payload từ Raspberry Pi** (topic: `sensors/raspberry`):
```json
{
  "device_id": "raspberry_pi",
  "temperature": 28.45,
  "humidity": 64.30
}
```

**HTTP POST payload từ Wemos D1** (`POST /api/sensors`):
```json
{
  "device_id": "wemos_d1",
  "air_quality": 143.0
}
```

**Response của `POST /api/sensors`** (HTTP 200):
```json
{
  "success": true
}
```

**Response của `GET /api/sensors/latest`** (HTTP 200):
```json
[
  {
    "id": 142,
    "device_id": "wemos_d1",
    "temperature": null,
    "humidity": null,
    "air_quality": 143.0,
    "timestamp": "2025-04-29 08:32:15"
  },
  {
    "id": 141,
    "device_id": "raspberry_pi",
    "temperature": 28.45,
    "humidity": 64.30,
    "air_quality": null,
    "timestamp": "2025-04-29 08:32:13"
  }
]
```

**WebSocket event** (sự kiện `sensor_data` phát từ server):
```json
{
  "device_id": "raspberry_pi",
  "temperature": 28.45,
  "humidity": 64.30,
  "air_quality": null,
  "timestamp": "2025-04-29T08:32:13.000Z"
}
```

---

## 3. Thiết Kế Cơ Sở Dữ Liệu

### 3.1 Schema bảng (ERD đơn giản)

```
┌─────────────────────────────────────────────────────┐
│                   sensor_readings                    │
├────────────────┬──────────────┬──────────────────────┤
│ Tên cột        │ Kiểu dữ liệu │ Ràng buộc            │
├────────────────┼──────────────┼──────────────────────┤
│ id             │ INTEGER      │ PRIMARY KEY, AUTO     │
│ device_id      │ TEXT         │ NOT NULL              │
│ temperature    │ REAL         │ NULL allowed          │
│ humidity       │ REAL         │ NULL allowed          │
│ air_quality    │ REAL         │ NULL allowed          │
│ timestamp      │ DATETIME     │ DEFAULT CURRENT_TIME  │
└────────────────┴──────────────┴──────────────────────┘
```

Hệ thống chỉ có **1 bảng** duy nhất vì dữ liệu IoT time-series phù hợp với mô hình flat table. Không cần quan hệ nhiều bảng.

---

### 3.2 Mô tả chi tiết từng trường

| Tên trường | Kiểu dữ liệu | Ý nghĩa | Ràng buộc |
|---|---|---|---|
| `id` | `INTEGER` | Khóa chính, định danh duy nhất cho từng bản ghi | `PRIMARY KEY AUTOINCREMENT` |
| `device_id` | `TEXT` | Định danh thiết bị gửi dữ liệu (`wemos_d1` hoặc `raspberry_pi`) | `NOT NULL` |
| `temperature` | `REAL` | Nhiệt độ đo được (°C), chỉ Raspberry Pi gửi | Cho phép `NULL` |
| `humidity` | `REAL` | Độ ẩm tương đối (%), chỉ Raspberry Pi gửi | Cho phép `NULL` |
| `air_quality` | `REAL` | Chất lượng không khí (ppm), chỉ Wemos D1 gửi | Cho phép `NULL` |
| `timestamp` | `DATETIME` | Thời điểm bản ghi được tạo trên server (UTC) | `DEFAULT CURRENT_TIMESTAMP` |

> Lý do cho phép `NULL`: Mỗi thiết bị chỉ đo một tập trường khác nhau. Wemos D1 chỉ có `air_quality`; Raspberry Pi chỉ có `temperature` và `humidity`. Dùng cùng bảng giúp đơn giản hoá query lịch sử.

---

### 3.3 Ví dụ bản ghi thực tế

Dữ liệu lưu trong `sensor_data.db` (truy vấn bằng `SELECT * FROM sensor_readings LIMIT 5`):

```
id  | device_id     | temperature | humidity | air_quality | timestamp
----|---------------|-------------|----------|-------------|---------------------
1   | raspberry_pi  | 28.45       | 64.30    | NULL        | 2025-04-29 08:30:01
2   | wemos_d1      | NULL        | NULL     | 143.00      | 2025-04-29 08:30:03
3   | raspberry_pi  | 28.47       | 64.10    | NULL        | 2025-04-29 08:30:06
4   | wemos_d1      | NULL        | NULL     | 141.50      | 2025-04-29 08:30:08
5   | raspberry_pi  | 28.50       | 63.95    | NULL        | 2025-04-29 08:30:11
```

---

### 3.4 Lý do chọn SQLite

**Tại sao chọn SQL thay vì NoSQL?**

Dữ liệu cảm biến IoT có cấu trúc cố định và đồng nhất (cùng các trường cho tất cả bản ghi), phù hợp với schema bảng SQL. Query theo khoảng thời gian (`WHERE timestamp BETWEEN ...`) rất hiệu quả với B-Tree index trên cột `timestamp`.

**Tại sao chọn SQLite cụ thể?**

| Tiêu chí | SQLite | MySQL/PostgreSQL |
|---|---|---|
| Cài đặt | Không cần, file-based | Cần cài server riêng |
| Phù hợp lab/demo | Rất tốt | Overkill với hệ thống nhỏ |
| Ghi dữ liệu liên tục | Đủ nhanh (< 1000 writes/s) | Không cần thiết |
| Truy vấn time-series | Hỗ trợ đầy đủ với index | Tương đương |
| Backup | Copy 1 file | Phức tạp hơn |

Với tần suất ghi 1 bản ghi / 5 giây / 2 thiết bị (~24 bản ghi/phút), SQLite hoàn toàn đủ năng lực. Nếu mở rộng lên hàng chục thiết bị hoặc cần replication, có thể nâng cấp lên **InfluxDB** (chuyên time-series) hoặc **PostgreSQL** với extension TimescaleDB.

---

## 4. Mô Tả REST API

### 4.1 Bảng đầy đủ các endpoint

| Method | URL | Chức năng | Tham số đầu vào | Ví dụ response |
|---|---|---|---|---|
| `POST` | `/api/sensors` | Nhận dữ liệu cảm biến từ thiết bị (Wemos D1 qua HTTP) | Body JSON: `device_id` (bắt buộc), `temperature`, `humidity`, `air_quality` (tuỳ chọn) | `{"success": true}` |
| `GET` | `/api/sensors` | Truy vấn lịch sử dữ liệu | Query: `device_id` (tuỳ chọn), `limit` (mặc định 50) | Mảng JSON các bản ghi |
| `GET` | `/api/sensors/latest` | Lấy bản ghi mới nhất của mỗi thiết bị | Không có | Mảng JSON, mỗi phần tử là 1 thiết bị |
| `POST` | `/api/commands/:deviceId` | Gửi lệnh điều khiển tới thiết bị qua WebSocket | Param: `deviceId`; Body: `command` (bắt buộc) | `{"success": true, "device_id": "wemos_d1", "command": "reset"}` |

---

### 4.2 Chi tiết từng endpoint

#### `POST /api/sensors`

Nhận dữ liệu từ Wemos D1. Backend lưu vào SQLite và broadcast qua WebSocket đến Dashboard.

**Request:**
```http
POST /api/sensors HTTP/1.1
Host: 192.168.1.100:3000
Content-Type: application/json

{
  "device_id": "wemos_d1",
  "air_quality": 143.0
}
```

**Response 200:**
```json
{ "success": true }
```

**Response 400 (thiếu device_id):**
```json
{ "error": "device_id is required" }
```

---

#### `GET /api/sensors`

Truy vấn lịch sử. Trả về newest-first. Có thể lọc theo thiết bị.

**Request:**
```http
GET /api/sensors?device_id=raspberry_pi&limit=3 HTTP/1.1
Host: 192.168.1.100:3000
```

**Response 200:**
```json
[
  {
    "id": 141,
    "device_id": "raspberry_pi",
    "temperature": 28.50,
    "humidity": 63.95,
    "air_quality": null,
    "timestamp": "2025-04-29 08:30:11"
  },
  {
    "id": 139,
    "device_id": "raspberry_pi",
    "temperature": 28.47,
    "humidity": 64.10,
    "air_quality": null,
    "timestamp": "2025-04-29 08:30:06"
  },
  {
    "id": 137,
    "device_id": "raspberry_pi",
    "temperature": 28.45,
    "humidity": 64.30,
    "air_quality": null,
    "timestamp": "2025-04-29 08:30:01"
  }
]
```

---

#### `GET /api/sensors/latest`

Lấy bản ghi mới nhất của mỗi thiết bị. Dùng để khởi tạo giá trị hiện tại trên Dashboard khi load trang.

**Request:**
```http
GET /api/sensors/latest HTTP/1.1
Host: 192.168.1.100:3000
```

**Response 200:**
```json
[
  {
    "id": 142,
    "device_id": "wemos_d1",
    "temperature": null,
    "humidity": null,
    "air_quality": 143.0,
    "timestamp": "2025-04-29 08:32:15"
  },
  {
    "id": 141,
    "device_id": "raspberry_pi",
    "temperature": 28.50,
    "humidity": 63.95,
    "air_quality": null,
    "timestamp": "2025-04-29 08:30:11"
  }
]
```

---

#### `POST /api/commands/:deviceId`

Gửi lệnh điều khiển tới thiết bị. Server broadcast lệnh qua WebSocket sự kiện `command`. Dashboard hoặc thiết bị có thể lắng nghe và thực thi.

**Request:**
```http
POST /api/commands/wemos_d1 HTTP/1.1
Host: 192.168.1.100:3000
Content-Type: application/json

{ "command": "reset" }
```

**Response 200:**
```json
{
  "success": true,
  "device_id": "wemos_d1",
  "command": "reset"
}
```

**Response 400 (thiếu command):**
```json
{ "error": "command is required" }
```

---

### 4.3 Ví dụ kiểm thử với `curl`

**Test POST /api/sensors (mô phỏng Wemos D1):**
```bash
curl -X POST http://localhost:3000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"device_id":"wemos_d1","air_quality":155.5}'
```

**Test POST /api/sensors (mô phỏng Raspberry Pi):**
```bash
curl -X POST http://localhost:3000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"device_id":"raspberry_pi","temperature":28.5,"humidity":64.3}'
```

**Test GET /api/sensors/latest:**
```bash
curl http://localhost:3000/api/sensors/latest
```

**Test GET /api/sensors với filter:**
```bash
curl "http://localhost:3000/api/sensors?device_id=wemos_d1&limit=10"
```

---

### 4.4 Xác thực (Authentication)

**Hiện tại:** Hệ thống **chưa có** cơ chế xác thực API.

**Lý do chấp nhận được trong môi trường lab:**
- Server chạy trong mạng LAN nội bộ, không expose ra internet.
- Thiết bị (Wemos D1, Raspberry Pi) và server đều nằm trong cùng một mạng cục bộ có kiểm soát.

**Phương án áp dụng khi triển khai thực tế:**

| Phương án | Cơ chế | Phù hợp với |
|---|---|---|
| **API Key** | Mỗi thiết bị có một key cố định, gửi kèm trong HTTP header `X-API-Key`. Server kiểm tra trước khi xử lý. | Thiết bị IoT nhúng (đơn giản, ít overhead) |
| **JWT (JSON Web Token)** | Thiết bị đăng nhập lấy token, đính token vào mọi request trong header `Authorization: Bearer <token>` | Hệ thống nhiều người dùng, có web login |
| **MQTT Username/Password** | Cấu hình Aedes yêu cầu `authenticate` callback, kiểm tra username/password của MQTT client | Bảo vệ broker khỏi client lạ |
