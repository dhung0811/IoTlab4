const { insertReading } = require('../db');

function handleMqttMessage(packet, io) {
  let payload;
  try {
    payload = JSON.parse(packet.payload.toString());
  } catch {
    console.error('[MQTT] Invalid JSON on topic', packet.topic);
    return;
  }

  const { device_id, temperature, humidity, air_quality } = payload;
  if (!device_id) {
    console.error('[MQTT] Missing device_id in payload');
    return;
  }

  insertReading(device_id, temperature, humidity, air_quality);

  const event = {
    device_id,
    temperature:  temperature  ?? null,
    humidity:     humidity     ?? null,
    air_quality:  air_quality  ?? null,
    timestamp: new Date().toISOString(),
  };

  io.emit('sensor_data', event);
  console.log(`[MQTT] ${device_id} →`, event);
}

module.exports = { handleMqttMessage };
