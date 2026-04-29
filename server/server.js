const express = require('express');
const http = require('http');
const net = require('net');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const aedes = require('aedes')();
const apiRoutes = require('./routes/api');
const { handleMqttMessage } = require('./mqtt/handler');

const HTTP_PORT = 3000;
const MQTT_PORT = 1883;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Attach socket.io instance to every request
app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.use('/api', apiRoutes);

// Embedded MQTT broker
const mqttServer = net.createServer(aedes.handle);
mqttServer.listen(MQTT_PORT, () => {
  console.log(`MQTT broker listening on port ${MQTT_PORT}`);
});

aedes.on('publish', (packet, client) => {
  if (client && packet.topic.startsWith('sensors/')) {
    handleMqttMessage(packet, io);
  }
});

aedes.on('client', (client) => {
  console.log(`[MQTT] Client connected: ${client.id}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`[MQTT] Client disconnected: ${client.id}`);
});

// WebSocket
io.on('connection', (socket) => {
  console.log(`[WS] Dashboard connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WS] Dashboard disconnected: ${socket.id}`);
  });
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`Web server running at http://localhost:${HTTP_PORT}`);
});
