const express = require('express');
const router = express.Router();
const { insertReading, getHistory, getLatest } = require('../db');

// Wemos D1 sends data via HTTP POST
router.post('/sensors', (req, res) => {
  const { device_id, temperature, humidity, air_quality } = req.body;

  if (!device_id) {
    return res.status(400).json({ error: 'device_id is required' });
  }

  insertReading(device_id, temperature, humidity, air_quality);

  req.io.emit('sensor_data', {
    device_id,
    temperature: temperature ?? null,
    humidity: humidity ?? null,
    air_quality: air_quality ?? null,
    timestamp: new Date().toISOString(),
  });

  console.log(`[HTTP] ${device_id}:`, req.body);
  res.json({ success: true });
});

// Query historical data — optional ?device_id=xxx&limit=100
router.get('/sensors', (req, res) => {
  const { device_id, limit } = req.query;
  const data = getHistory(device_id, parseInt(limit) || 50);
  res.json(data);
});

// Latest reading per device
router.get('/sensors/latest', (req, res) => {
  res.json(getLatest());
});

// Send a command to a device (published to socket; device must subscribe)
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
