'use strict';

const MAX_POINTS      = 50;
const OFFLINE_AFTER   = 15_000; // ms without data → mark offline

const lastSeen = {};   // { device_id: timestamp_ms }

// ── Clock ──────────────────────────────────────────────────────────────────────
(function tickClock() {
  document.getElementById('clock').textContent = new Date().toLocaleString();
  setTimeout(tickClock, 1000);
})();

// ── Chart factory ──────────────────────────────────────────────────────────────
function makeChart(id, color) {
  return new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.35,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { ticks: { color: '#475569', maxTicksLimit: 8, maxRotation: 0 }, grid: { color: '#1a1d2e' } },
        y: { ticks: { color: '#475569' }, grid: { color: '#1a1d2e' } },
      },
    },
  });
}

const charts = {
  temp: makeChart('chart-temp', '#f97316'),
  hum:  makeChart('chart-hum',  '#38bdf8'),
  aq:   makeChart('chart-aq',   '#a78bfa'),
};

function pushChart(key, timeLabel, value) {
  const { labels, datasets } = charts[key].data;
  labels.push(timeLabel);
  datasets[0].data.push(value);
  if (labels.length > MAX_POINTS) { labels.shift(); datasets[0].data.shift(); }
  charts[key].update();
}

// ── Air-quality label ──────────────────────────────────────────────────────────
function aqInfo(ppm) {
  if (ppm < 150) return { text: 'Good',     cls: 'aq-good' };
  if (ppm < 300) return { text: 'Moderate', cls: 'aq-moderate' };
  return               { text: 'Poor',      cls: 'aq-poor' };
}

// ── Device online / offline ────────────────────────────────────────────────────
function setDeviceOnline(id) {
  lastSeen[id] = Date.now();
  const badge = document.getElementById(`status-${id}`);
  if (badge) { badge.textContent = 'Online'; badge.className = 'badge badge-online'; }
}

function updateLastSeenLabel(id) {
  const el = document.getElementById(`seen-${id}`);
  if (!el || !lastSeen[id]) return;
  const secs = Math.round((Date.now() - lastSeen[id]) / 1000);
  el.textContent = secs < 5 ? 'just now' : `${secs}s ago`;
}

setInterval(() => {
  const now = Date.now();
  Object.keys(lastSeen).forEach((id) => {
    updateLastSeenLabel(id);
    if (now - lastSeen[id] > OFFLINE_AFTER) {
      const badge = document.getElementById(`status-${id}`);
      if (badge && badge.textContent !== 'Offline') {
        badge.textContent = 'Offline';
        badge.className = 'badge badge-offline';
      }
    }
  });
}, 2000);

// ── Table ──────────────────────────────────────────────────────────────────────
function prependRow(d) {
  const tbody = document.getElementById('tbl-body');
  const tr    = document.createElement('tr');
  const fmt   = (v, dec = 1) => (v !== null && v !== undefined) ? (+v).toFixed(dec) : '—';
  tr.innerHTML = `
    <td>${new Date(d.timestamp).toLocaleString()}</td>
    <td>${d.device_id}</td>
    <td>${fmt(d.temperature)}</td>
    <td>${fmt(d.humidity)}</td>
    <td>${fmt(d.air_quality, 0)}</td>
  `;
  tbody.prepend(tr);
  if (tbody.children.length > 25) tbody.lastElementChild.remove();
}

// ── Apply a reading ────────────────────────────────────────────────────────────
function applyReading(d) {
  const tl = new Date(d.timestamp).toLocaleTimeString();

  setDeviceOnline(d.device_id);
  prependRow(d);

  if (d.temperature !== null && d.temperature !== undefined) {
    document.getElementById('val-temp').textContent = (+d.temperature).toFixed(1);
    pushChart('temp', tl, +d.temperature);
  }
  if (d.humidity !== null && d.humidity !== undefined) {
    document.getElementById('val-hum').textContent = (+d.humidity).toFixed(1);
    pushChart('hum', tl, +d.humidity);
  }
  if (d.air_quality !== null && d.air_quality !== undefined) {
    const ppm = Math.round(+d.air_quality);
    document.getElementById('val-aq').textContent = ppm;
    pushChart('aq', tl, ppm);
    const { text, cls } = aqInfo(ppm);
    const badge = document.getElementById('aq-badge');
    badge.textContent = text;
    badge.className   = 'aq-badge ' + cls;
  }
}

// ── Load history on startup ────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const rows = await fetch('/api/sensors?limit=50').then(r => r.json());
    // API returns newest-first; reverse so charts show oldest → newest
    rows.reverse().forEach(applyReading);
  } catch (e) {
    console.error('History load failed:', e);
  }
}

// ── Socket.io ─────────────────────────────────────────────────────────────────
const socket  = io();
const wsBadge = document.getElementById('ws-badge');

socket.on('connect', () => {
  wsBadge.textContent = '● Connected';
  wsBadge.className   = 'badge badge-online';
});
socket.on('disconnect', () => {
  wsBadge.textContent = '● Disconnected';
  wsBadge.className   = 'badge badge-offline';
});
socket.on('sensor_data', applyReading);

// ── Boot ──────────────────────────────────────────────────────────────────────
loadHistory();
