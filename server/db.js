const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sensor_data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    temperature REAL,
    humidity REAL,
    air_quality REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function insertReading(deviceId, temperature, humidity, airQuality) {
  const stmt = db.prepare(`
    INSERT INTO sensor_readings (device_id, temperature, humidity, air_quality)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(deviceId, temperature ?? null, humidity ?? null, airQuality ?? null);
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
      SELECT device_id, MAX(id) as max_id
      FROM sensor_readings
      GROUP BY device_id
    ) latest ON s.id = latest.max_id
  `).all();
}

module.exports = { insertReading, getHistory, getLatest };
