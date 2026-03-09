// prediction.js — Flood Prediction Page Logic

async function initPredictionPage() {
  if (!document.getElementById('predMap')) return;
  window.pMap = createLeafletMap('predMap');
  const r = await fetch('/api/wards');
  const d = await r.json();
  window.allWards = d.wards;
  renderPredMap(window.allWards);
  renderPredTable(window.allWards);
  document.getElementById('tableCount').textContent = window.allWards.length + ' wards';
}

function renderPredMap(wards) {
  if (window.pWardsLayer) window.pMap.removeLayer(window.pWardsLayer);
  window.pWardsLayer = L.layerGroup();
  wards.forEach(w => {
    const color = riskColor(w.risk_level);
    const size = w.risk_level === 'HIGH' ? 14 : w.risk_level === 'MEDIUM' ? 11 : 8;
    const circle = L.circleMarker([w.latitude, w.longitude], {
      radius: size, fillColor: color, color: 'white',
      weight: 1.5, opacity: 0.9, fillOpacity: 0.75
    });
    circle.bindPopup(`
      <div style="min-width:200px">
        <b style="font-family:Syne,sans-serif">${w.ward_name}</b>
        <hr style="border-color:rgba(255,255,255,0.1);margin:6px 0"/>
        <div style="font-size:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#94a3b8">Risk</span>
            <span style="color:${color};font-weight:700">${w.risk_level}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#94a3b8">Rainfall</span><span>${w.rainfall}mm</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#94a3b8">Elevation</span><span>${w.elevation}m</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#94a3b8">Drain</span><span>${(w.drain_capacity*100).toFixed(0)}%</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#94a3b8">Population</span><span>${numFormat(w.population)}</span>
          </div>
        </div>
      </div>
    `);
    window.pWardsLayer.addLayer(circle);
  });
  window.pMap.addLayer(window.pWardsLayer);
}

function renderPredTable(wards) {
  const el = document.getElementById('wardTable');
  if (!el) return;
  const sorted = [...wards].sort((a, b) => {
    const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return order[b.risk_level] - order[a.risk_level];
  });
  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Ward ID</th><th>Ward Name</th><th>Rainfall</th>
          <th>Elevation</th><th>Drain Cap</th><th>Population</th>
          <th>Readiness</th><th>Risk Level</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(w => `
          <tr>
            <td style="font-size:11px;color:var(--text-muted)">${w.ward_id}</td>
            <td style="font-weight:600">${w.ward_name}</td>
            <td>${w.rainfall}mm</td>
            <td>${w.elevation}m</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="progress-bar" style="flex:1;height:5px">
                  <div class="progress-fill ${w.drain_capacity > 0.6 ? 'green' : w.drain_capacity > 0.4 ? 'orange' : 'red'}"
                       style="width:${w.drain_capacity * 100}%"></div>
                </div>
                <span>${(w.drain_capacity * 100).toFixed(0)}%</span>
              </div>
            </td>
            <td>${numFormat(w.population)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="progress-bar" style="flex:1;height:5px">
                  <div class="progress-fill purple" style="width:${w.readiness_score * 100}%"></div>
                </div>
                <span>${(w.readiness_score * 100).toFixed(0)}%</span>
              </div>
            </td>
            <td>${riskBadge(w.risk_level)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  document.getElementById('tableCount').textContent = wards.length + ' wards';
}

function filterRisk(risk) {
  window.currentFilter = risk;
  const filtered = risk === 'ALL' ? window.allWards : window.allWards.filter(w => w.risk_level === risk);
  renderPredMap(filtered);
  renderPredTable(filtered);
  const sub = document.getElementById('mapSubtitle');
  if (sub) sub.textContent = risk === 'ALL' ? 'All wards' : risk + ' risk wards';
}

async function runCustomPredict() {
  const data = {
    rainfall: parseFloat(document.getElementById('inRainfall').value),
    elevation: parseFloat(document.getElementById('inElevation').value),
    drain_capacity: parseFloat(document.getElementById('inDrain').value),
    population_density: parseFloat(document.getElementById('inPop').value),
  };
  const r = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const d = await r.json();
  const color = riskColor(d.risk_level);
  document.getElementById('predictResult').style.display = 'block';
  document.getElementById('resultRisk').textContent = d.risk_level;
  document.getElementById('resultRisk').style.color = color;
  document.getElementById('resultConf').textContent = `Confidence: ${(d.confidence * 100).toFixed(1)}%`;
  document.getElementById('resultBar').innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill ${d.risk_level === 'HIGH' ? 'red' : d.risk_level === 'MEDIUM' ? 'orange' : 'green'}"
           style="width:${d.confidence * 100}%"></div>
    </div>`;
}

async function predictAll() {
  const r = await fetch('/api/wards');
  const d = await r.json();
  window.allWards = d.wards;
  renderPredMap(window.allWards);
  renderPredTable(window.allWards);
}

function exportCSV() {
  const rows = [['Ward ID', 'Ward Name', 'Rainfall', 'Elevation', 'Drain Capacity', 'Population', 'Risk Level']];
  (window.allWards || []).forEach(w =>
    rows.push([w.ward_id, w.ward_name, w.rainfall, w.elevation, w.drain_capacity, w.population, w.risk_level])
  );
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv,' + encodeURIComponent(csv);
  a.download = 'ward_flood_predictions.csv';
  a.click();
}

if (document.getElementById('predMap')) initPredictionPage();