const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sensor_data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_readings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  TEXT    NOT NULL,
    temperature REAL,
    humidity    REAL,
    air_quality REAL,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function insertReading(deviceId, temperature, humidity, airQuality) {
  return db.prepare(`
    INSERT INTO sensor_readings (device_id, temperature, humidity, air_quality)
    VALUES (?, ?, ?, ?)
  `).run(deviceId, temperature ?? null, humidity ?? null, airQuality ?? null);
}

function getHistory(deviceId, limit = 50) {
  if (deviceId) {
    return db.prepare(
      'SELECT * FROM sensor_readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(deviceId, limit);
  }
  return db.prepare(
    'SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT ?'
  ).all(limit);
}

function getLatest() {
  return db.prepare(`
    SELECT s.* FROM sensor_readings s
    INNER JOIN (
      SELECT device_id, MAX(id) AS max_id
      FROM sensor_readings
      GROUP BY device_id
    ) t ON s.id = t.max_id
  `).all();
}

module.exports = { insertReading, getHistory, getLatest };
