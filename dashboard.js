// ── Shared utility functions ─────────────────────────────────
function riskBadge(r) {
  const map = {
    HIGH: '<span class="badge badge-high">HIGH</span>',
    MEDIUM: '<span class="badge badge-medium">MEDIUM</span>',
    LOW: '<span class="badge badge-low">LOW</span>',
    CRITICAL: '<span class="badge badge-critical">CRITICAL</span>',
  };
  return map[r] || r;
}

function riskColor(r) {
  return { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' }[r] || '#94a3b8';
}

function numFormat(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n;
}

function showLoading(el) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Loading data...</div>';
}

function createLeafletMap(id, center = [28.6139, 77.2090], zoom = 11) {
  const map = L.map(id, { zoomControl: false }).setView(center, zoom);
  L.control.zoom({ position: 'topright' }).addTo(map);
  
  const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap ©CartoDB', maxZoom: 19
  });
  const light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap ©CartoDB', maxZoom: 19
  });
  
  const theme = localStorage.getItem('theme') || 'dark';
  (theme === 'dark' ? dark : light).addTo(map);
  
  map._darkLayer = dark;
  map._lightLayer = light;
  return map;
}

function updateMapTheme(map) {
  const theme = localStorage.getItem('theme') || 'dark';
  if (theme === 'dark') {
    if (!map.hasLayer(map._darkLayer)) {
      map.removeLayer(map._lightLayer);
      map._darkLayer.addTo(map);
    }
  } else {
    if (!map.hasLayer(map._lightLayer)) {
      map.removeLayer(map._darkLayer);
      map._lightLayer.addTo(map);
    }
  }
}

// Chart.js global defaults
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
  Chart.defaults.font.family = 'DM Sans';
}
