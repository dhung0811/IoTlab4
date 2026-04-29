const express = require('express');
const router = express.Router();
const { insertReading, getHistory, getLatest } = require('../db');

// POST /api/sensors
// Wemos D1 sends data here via HTTP
router.post('/sensors', (req, res) => {
  const { device_id, temperature, humidity, air_quality } = req.body;

  if (!device_id) {
    return res.status(400).json({ error: 'device_id is required' });
  }

  insertReading(device_id, temperature, humidity, air_quality);

  const event = {
    device_id,
    temperature:  temperature  ?? null,
    humidity:     humidity     ?? null,
    air_quality:  air_quality  ?? null,
    timestamp: new Date().toISOString(),
  };

  req.io.emit('sensor_data', event);
  console.log(`[HTTP] ${device_id} →`, event);
  res.json({ success: true });
});

// GET /api/sensors?device_id=xxx&limit=50
router.get('/sensors', (req, res) => {
  const { device_id, limit } = req.query;
  res.json(getHistory(device_id, parseInt(limit) || 50));
});

// GET /api/sensors/latest  — one row per device
router.get('/sensors/latest', (req, res) => {
  res.json(getLatest());
});

// POST /api/commands/:deviceId  — push a command to a device via WebSocket
router.post('/commands/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'command is required' });
  }

  req.io.emit('command', { device_id: deviceId, command });
  res.json({ success: true, device_id: deviceId, command });
});

module.exports = router;
