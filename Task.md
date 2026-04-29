1. Yêu cầu
Xây dựng ứng dụng IoT để giám sát chất lượng không khí và cung cấp dữ liệu theo thời
gian thực trên nền tảng opensource IoT platform (Thingsboard, Openremote...)
Tại phần thiết bị, sinh viên thực hiện sử dụng 2 loại thiết bị cảm biến DHT22/DHT
và MQ-135 để lấy 3 loại dữ liệu cảm biến là nhiệt độ, độ ẩm, chất lượng không khí.
Trên Wemos D1 sử dụng cảm biến MQ-135, đồng thời lập trình để gửi các giá trị
cảm biến đến hệ thống thông qua giao thức HTTP. Trên Raspberry sử dụng
DHT22/DHT11, đồng thời lập trình để gửi các giá trị cảm biến đến hệ thống thông
qua giao thức MQTT.
Biểu diễn dữ liệu: Cấu hình dashboard trên IoT platform để hiện thị dữ liệu theo
thời gian thực từ Wemos D1 và Raspberry. Sử dụng các biểu đồ (charts/graphs) để
thể hiện dữ liệu theo thời gian.
[Nâng cao – 3 điểm] Tự xây dựng Web Server thay thế IoT Platform có sẵn: Thay
vì sử dụng các nền tảng IoT platform có sẵn như Thingsboard hay OpenRemote,
sinh viên tự thiết kế và triển khai một Web Server hoàn chỉnh để thu thập, lưu trữ
và hiển thị dữ liệu cảm biến. Hệ thống phải bao gồm đầy đủ các thành phần sau:
o Backend / API Server: Xây dựng RESTful API (MQTT Broker tự triển khai)
để nhận dữ liệu từ các thiết bị (Wemos D1 qua HTTP, Raspberry qua MQTT).
KHOA MẠNG MÁY TÍNH &TRUYỀN THÔNG (^)
Server có thể được viết bằng các framework phổ biến như Node.js (Express),
Python (Flask/FastAPI), hoặc tương đương. API cần hỗ trợ ít nhất các
endpoint: nhận dữ liệu cảm biến từ thiết bị (POST), truy vấn lịch sử dữ liệu
(GET), và gửi lệnh điều khiển xuống thiết bị nếu có (POST/PUT).
o Database: Lựa chọn và tích hợp một hệ quản trị cơ sở dữ liệu phù hợp để lưu
trữ dữ liệu cảm biến theo chuỗi thời gian (time-series). Sinh viên có thể sử
dụng SQL (MySQL, PostgreSQL, SQLite) hoặc NoSQL (MongoDB, InfluxDB).
Cơ sở dữ liệu phải lưu trữ đầy đủ: giá trị cảm biến (nhiệt độ, độ ẩm, chất
lượng không khí), định danh thiết bị, và nhãn thời gian (timestamp) của từng
bản ghi.
o Web Dashboard (Frontend): Xây dựng giao diện web để trực quan hóa dữ
liệu thu thập từ các cảm biến theo thời gian thực. Dashboard cần hiển thị tối
thiểu: các giá trị cảm biến hiện tại (dạng thẻ số hoặc gauge), biểu đồ lịch sử
theo thời gian (line chart/bar chart), và trạng thái kết nối của từng thiết bị. Có
thể dùng HTML/CSS/JavaScript thuần hoặc các framework như React, Vue.js
kết hợp thư viện biểu đồ như Chart.js, Recharts, hoặc Grafana nhúng.
o Kết nối thiết bị thực tế: Wemos D1 và Raspberry Pi phải được lập trình lại để
gửi dữ liệu trực tiếp tới Web Server tự xây dựng (thay vì Thingsboard). Đảm
bảo luồng dữ liệu end-to-end hoạt động ổn định: thiết bị → Web Server →
Database → Dashboard hiển thị theo thời gian thực (polling hoặc WebSocket).