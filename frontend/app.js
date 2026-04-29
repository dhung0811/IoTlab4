const MAX_POINTS = 50;
const OFFLINE_TIMEOUT_MS = 15000;

const deviceLastSeen = {};
const chartData = {
  temp: { labels: [], values: [] },
  hum:  { labels: [], values: [] },
  aq:   { labels: [], values: [] },
};

// ── Clock ──────────────────────────────────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleString();
}
setInterval(updateClock, 1000);
updateClock();

// ── Chart setup ────────────────────────────────────────────────────────────
function makeChart(canvasId, label, color) {
  return new Chart(document.getElementById(canvasId), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#475569', maxTicksLimit: 8, maxRotation: 0 },
          grid: { color: '#1e2235' },
        },
        y: {
          ticks: { color: '#475569' },
          grid: { color: '#1e2235' },
        },
      },
    },
  });
}

const charts = {
  temp: makeChart('chart-temp', 'Temperature', '#f97316'),
  hum:  makeChart('chart-hum',  'Humidity',    '#38bdf8'),
  aq:   makeChart('chart-aq',   'Air Quality', '#a78bfa'),
};

function pushToChart(key, label, value) {
  const d = chartData[key];
  d.labels.push(label);
  d.values.push(value);
  if (d.labels.length > MAX_POINTS) {
    d.labels.shift();
    d.values.shift();
  }
  charts[key].data.labels = [...d.labels];
  charts[key].data.datasets[0].data = [...d.values];
  charts[key].update();
}

// ── Air quality label ───────────────────────────────────────────────────────
function aqStatus(ppm) {
  if (ppm === null) return { text: '', cls: '' };
  if (ppm < 150) return { text: 'Good', cls: 'aq-good' };
  if (ppm < 300) return { text: 'Moderate', cls: 'aq-moderate' };
  return { text: 'Poor', cls: 'aq-poor' };
}

// ── Device online/offline tracking ─────────────────────────────────────────
function markOnline(deviceId) {
  deviceLastSeen[deviceId] = Date.now();
  const el = document.getElementById(`status-${deviceId}`);
  if (el) { el.textContent = 'Online'; el.className = 'badge badge-online'; }
}

function checkOffline() {
  const now = Date.now();
  Object.keys(deviceLastSeen).forEach((id) => {
    if (now - deviceLastSeen[id] > OFFLINE_TIMEOUT_MS) {
      const el = document.getElementById(`status-${id}`);
      if (el && el.textContent !== 'Offline') {
        el.textContent = 'Offline';
        el.className = 'badge badge-offline';
      }
    }
  });
}
setInterval(checkOffline, 3000);

// ── Table ───────────────────────────────────────────────────────────────────
function prependRow(data) {
  const tbody = document.getElementById('table-body');
  const tr = document.createElement('tr');
  const ts = new Date(data.timestamp).toLocaleString();
  tr.innerHTML = `
    <td>${ts}</td>
    <td>${data.device_id}</td>
    <td>${data.temperature !== null ? data.temperature.toFixed(1) : '—'}</td>
    <td>${data.humidity    !== null ? data.humidity.toFixed(1)    : '—'}</td>
    <td>${data.air_quality !== null ? Math.round(data.air_quality) : '—'}</td>
  `;
  tbody.prepend(tr);
  if (tbody.children.length > 20) tbody.lastChild.remove();
}

// ── Apply incoming sensor data ──────────────────────────────────────────────
function applyData(data) {
  const { device_id, temperature, humidity, air_quality, timestamp } = data;
  const timeLabel = new Date(timestamp).toLocaleTimeString();

  markOnline(device_id);
  prependRow(data);

  if (temperature !== null) {
    document.getElementById('val-temp').textContent = temperature.toFixed(1);
    pushToChart('temp', timeLabel, temperature);
  }
  if (humidity !== null) {
    document.getElementById('val-hum').textContent = humidity.toFixed(1);
    pushToChart('hum', timeLabel, humidity);
  }
  if (air_quality !== null) {
    document.getElementById('val-aq').textContent = Math.round(air_quality);
    pushToChart('aq', timeLabel, air_quality);
    const { text, cls } = aqStatus(air_quality);
    const statusEl = document.getElementById('aq-status');
    statusEl.textContent = text;
    statusEl.className = 'metric-status ' + cls;
  }
}

// ── Load history on page load ───────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch('/api/sensors?limit=50');
    const rows = await res.json();
    // Rows are newest-first; reverse to feed charts oldest-first
    rows.reverse().forEach(applyData);
  } catch (e) {
    console.error('Failed to load history', e);
  }
}

// ── Socket.io ───────────────────────────────────────────────────────────────
const socket = io();
const wsStatus = document.getElementById('ws-status');

socket.on('connect', () => {
  wsStatus.textContent = 'Connected';
  wsStatus.className = 'badge badge-online';
});

socket.on('disconnect', () => {
  wsStatus.textContent = 'Disconnected';
  wsStatus.className = 'badge badge-offline';
});

socket.on('sensor_data', applyData);

// ── Init ────────────────────────────────────────────────────────────────────
loadHistory();
