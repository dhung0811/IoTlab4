const express    = require('express');
const http       = require('http');
const net        = require('net');
const path       = require('path');
const cors       = require('cors');
const { Server } = require('socket.io');
const aedes      = require('aedes')();
const apiRoutes  = require('./routes/api');
const { handleMqttMessage } = require('./mqtt/handler');

const HTTP_PORT = 3000;
const MQTT_PORT = 1883;

// ── Express + Socket.io ───────────────────────────────────────────────────────
const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Make socket.io available inside route handlers
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api', apiRoutes);

// ── Embedded MQTT broker (Aedes) ──────────────────────────────────────────────
const mqttServer = net.createServer(aedes.handle);
mqttServer.listen(MQTT_PORT, () => {
  console.log(`MQTT broker  → mqtt://0.0.0.0:${MQTT_PORT}`);
});

aedes.on('publish', (packet, client) => {
  // Only handle messages from real clients on sensor topics
  if (client && packet.topic.startsWith('sensors/')) {
    handleMqttMessage(packet, io);
  }
});

aedes.on('client', (client) => {
  console.log(`[MQTT] client connected    : ${client.id}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`[MQTT] client disconnected : ${client.id}`);
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS]   dashboard connected : ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WS]   dashboard left      : ${socket.id}`);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(HTTP_PORT, () => {
  console.log(`Web server   → http://localhost:${HTTP_PORT}`);
});
