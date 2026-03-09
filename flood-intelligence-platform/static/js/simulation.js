// simulation.js — Digital Twin Flood Simulation Logic

let sMap = null;
let simData = null;
let simLayers = [];
let simRunning = false;

async function initSimulation() {
  if (!document.getElementById('simMap')) return;
  sMap = createLeafletMap('simMap');
  const r = await fetch('/api/simulation');
  simData = await r.json();
  console.log('Simulation data loaded:', simData.steps.length, 'steps');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startSimulation() {
  if (simRunning || !simData) return;
  simRunning = true;

  const btn = document.getElementById('startBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
  btn.disabled = true;

  resetSim(false);

  for (let i = 0; i < 4; i++) {
    await runStep(i);
    if (i < 3) await sleep(2200);
  }

  simRunning = false;
  btn.innerHTML = '<i class="fas fa-check-circle"></i> Simulation Complete';
  btn.disabled = false;
  setTimeout(() => {
    btn.innerHTML = '<i class="fas fa-play"></i> Start Simulation';
  }, 3000);
}

async function runStep(stepIdx) {
  if (!simData) return;
  const step = simData.steps[stepIdx];
  const t = step.time_min;

  const colors      = ['rgba(99,102,241,0.35)', 'rgba(245,158,11,0.35)', 'rgba(239,68,68,0.42)', 'rgba(185,28,28,0.52)'];
  const strokes     = ['#6366f1', '#f59e0b', '#ef4444', '#b91c1c'];
  const riskLabels  = ['LOW', 'MEDIUM', 'HIGH', 'HIGH'];

  // Update status panel
  document.getElementById('currentTime').textContent =
    `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  document.getElementById('simFill').style.width = ((stepIdx + 1) / 4 * 100) + '%';
  document.getElementById('simTimeLabel').textContent = `T = ${t} min`;
  document.getElementById('affectedWards').textContent  = step.points.length;

  const maxDepth = Math.max(...step.points.map(p => p.water_depth));
  document.getElementById('maxDepth').textContent   = maxDepth.toFixed(1) + 'm';
  document.getElementById('floodRadius').textContent = step.points[0]?.radius + 'm';
  document.getElementById('alertLevel').innerHTML   = riskBadge(riskLabels[stepIdx]);

  // Population estimate
  const popEst = step.points.length * (15000 + stepIdx * 8000);
  document.getElementById('popAtRisk').textContent  = numFormat(popEst);

  // Timeline lights
  ['tl1', 'tl2', 'tl3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = stepIdx > i ? '1' : '0.3';
  });

  // Step buttons
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('step' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i === stepIdx) el.classList.add('active');
    else if (i < stepIdx) el.classList.add('done');
  }

  // Draw animated circles
  const layer = L.layerGroup();
  step.points.forEach(p => {
    const circle = L.circle([p.lat, p.lng], {
      radius: p.radius,
      fillColor: colors[stepIdx],
      color: strokes[stepIdx],
      weight: 1.5,
      fillOpacity: 0.5,
      opacity: 0.85,
    });
    circle.bindPopup(`
      <div style="min-width:160px">
        <b style="font-family:Syne,sans-serif">${p.ward_name}</b>
        <hr style="border-color:rgba(255,255,255,0.1);margin:6px 0"/>
        <div style="font-size:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#94a3b8">Water Depth</span>
            <span style="color:#ef4444;font-weight:700">${p.water_depth}m</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#94a3b8">Flood Radius</span><span>${p.radius}m</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#94a3b8">Intensity</span><span>${(p.intensity * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    `);
    layer.addLayer(circle);
  });

  sMap.addLayer(layer);
  simLayers.push(layer);
}

function jumpToStep(i) {
  if (!simData) {
    alert('Click "Start Simulation" first to load data.');
    return;
  }
  resetSim(false);
  for (let j = 0; j <= i; j++) runStep(j);
}

function resetSim(clearAll = true) {
  simLayers.forEach(l => { if (sMap) sMap.removeLayer(l); });
  simLayers = [];

  const ids = {
    currentTime: '00:00', simTimeLabel: 'Ready',
    affectedWards: '0', maxDepth: '0.0m',
    floodRadius: '0m', popAtRisk: '—', alertLevel: '—'
  };
  Object.entries(ids).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const fill = document.getElementById('simFill');
  if (fill) fill.style.width = '0%';

  ['tl1', 'tl2', 'tl3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = '0.3';
  });

  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('step' + i);
    if (el) el.classList.remove('active', 'done');
  }

  if (clearAll) simRunning = false;
}

// Auto-init when page loads
document.addEventListener('DOMContentLoaded', initSimulation);
if (document.readyState !== 'loading') initSimulation();