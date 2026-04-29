const { insertReading } = require('../db');

function handleMqttMessage(packet, io) {
  try {
    const payload = JSON.parse(packet.payload.toString());
    const { device_id, temperature, humidity, air_quality } = payload;

    if (!device_id) return;

    insertReading(device_id, temperature, humidity, air_quality);

    io.emit('sensor_data', {
      device_id,
      temperature: temperature ?? null,
      humidity: humidity ?? null,
      air_quality: air_quality ?? null,
      timestamp: new Date().toISOString(),
    });

    console.log(`[MQTT] ${device_id}:`, payload);
  } catch (err) {
    console.error('[MQTT] Failed to parse message:', err.message);
  }
}

module.exports = { handleMqttMessage };
