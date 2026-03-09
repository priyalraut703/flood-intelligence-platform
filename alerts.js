// alerts.js — Alert System Page Logic

let aMap = null;
let allAlerts = [];
let alertMarkerLayer = null;

async function loadAlerts() {
  if (!aMap && document.getElementById('alertMap')) {
    aMap = createLeafletMap('alertMap');
  }

  const r = await fetch('/api/alerts');
  const d = await r.json();
  allAlerts = d.alerts;

  const critical = allAlerts.filter(a => a.severity === 'CRITICAL').length;
  const high     = allAlerts.filter(a => a.severity === 'HIGH').length;
  const moderate = allAlerts.filter(a => a.severity === 'MODERATE').length;
  const totalPop = allAlerts.reduce((s, a) => s + a.population_at_risk, 0);

  document.getElementById('criticalCount').textContent = critical;
  document.getElementById('highCount').textContent     = high;
  document.getElementById('moderateCount').textContent = moderate;
  document.getElementById('totalAtRisk').textContent   = numFormat(totalPop);

  renderAlertCards(allAlerts);
  renderAlertMap(allAlerts);
}

function renderAlertCards(alerts) {
  const el = document.getElementById('alertsList');
  if (!el) return;

  if (alerts.length === 0) {
    el.innerHTML = '<div class="loading"><i class="fas fa-check-circle" style="color:var(--success)"></i> No alerts for selected filter.</div>';
    return;
  }

  const sevClass = { CRITICAL: 'critical', HIGH: 'high', MODERATE: 'moderate' };
  const sevColor = { CRITICAL: 'var(--danger)', HIGH: 'var(--warning)', MODERATE: 'var(--info)' };
  const badgeClass = { CRITICAL: 'badge-critical', HIGH: 'badge-high', MODERATE: 'badge-info' };

  el.innerHTML = alerts.map((a, i) => `
    <div class="alert-card ${sevClass[a.severity] || ''}" style="animation-delay:${i * 0.06}s">
      <div class="alert-header">
        <div>
          <span class="badge ${badgeClass[a.severity]}" style="margin-bottom:6px">${a.severity}</span>
          <div class="alert-title" style="color:${sevColor[a.severity]}">${a.ward_name}</div>
        </div>
        <div style="text-align:right;font-size:12px">
          <div style="color:var(--text-muted)">ETA</div>
          <div style="font-family:Syne,sans-serif;font-weight:700;color:${sevColor[a.severity]}">${a.eta_hours}h</div>
        </div>
      </div>
      <div class="alert-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
          <div style="background:var(--bg-card2);border-radius:6px;padding:8px;text-align:center">
            <div style="font-size:10px;color:var(--text-muted)">WATER DEPTH</div>
            <div style="font-weight:700;color:${sevColor[a.severity]}">${a.expected_depth}m</div>
          </div>
          <div style="background:var(--bg-card2);border-radius:6px;padding:8px;text-align:center">
            <div style="font-size:10px;color:var(--text-muted)">RAINFALL</div>
            <div style="font-weight:700">${a.rainfall}mm</div>
          </div>
          <div style="background:var(--bg-card2);border-radius:6px;padding:8px;text-align:center">
            <div style="font-size:10px;color:var(--text-muted)">POP. AT RISK</div>
            <div style="font-weight:700">${numFormat(a.population_at_risk)}</div>
          </div>
        </div>
        <div class="alert-advisories">
          ${a.advisories.map(adv =>
            `<span class="advisory-tag"><i class="fas fa-chevron-right" style="font-size:9px"></i> ${adv}</span>`
          ).join('')}
        </div>
      </div>
    </div>`).join('');
}

function renderAlertMap(alerts) {
  if (!aMap) return;
  if (alertMarkerLayer) aMap.removeLayer(alertMarkerLayer);
  alertMarkerLayer = L.layerGroup();

  fetch('/api/wards').then(r => r.json()).then(d => {
    alerts.forEach(a => {
      const w = d.wards.find(w => w.ward_name === a.ward_name);
      if (!w) return;

      const color = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MODERATE: '#3b82f6' }[a.severity] || '#94a3b8';
      const icon = L.divIcon({
        html: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:${color};border:3px solid white;
          box-shadow:0 0 14px ${color};
          animation:pulse 1.5s infinite">
        </div>`,
        className: '',
        iconSize: L.point(16, 16)
      });

      L.marker([w.latitude, w.longitude], { icon })
        .bindPopup(`
          <b style="font-family:Syne,sans-serif">${a.ward_name}</b><br/>
          <span style="color:${color};font-weight:700">${a.severity}</span><br/>
          Depth: ${a.expected_depth}m &nbsp;|&nbsp; ETA: ${a.eta_hours}h<br/>
          Pop at Risk: ${numFormat(a.population_at_risk)}
        `)
        .addTo(alertMarkerLayer);
    });
    aMap.addLayer(alertMarkerLayer);
  });
}

function filterAlerts(severity, btn) {
  // Update button active states
  document.querySelectorAll('.active-filter').forEach(b => b.classList.remove('active-filter'));
  if (btn) btn.classList.add('active-filter');

  const filtered = severity === 'ALL'
    ? allAlerts
    : allAlerts.filter(a => a.severity === severity);

  renderAlertCards(filtered);
}

function triggerEmergency() {
  const banner = document.getElementById('emergencyBanner');
  if (banner) {
    banner.style.display = 'block';
    banner.style.animation = 'blinkBadge 1s infinite';
  }
}

function updateChecklist(cb) {
  const all     = document.querySelectorAll('#checklist input[type=checkbox]');
  const checked = document.querySelectorAll('#checklist input[type=checkbox]:checked').length;
  const pct     = Math.round((checked / all.length) * 100);
  const pctEl   = document.getElementById('checkPct');
  const fillEl  = document.getElementById('checkFill');
  if (pctEl)  pctEl.textContent      = pct + '%';
  if (fillEl) fillEl.style.width     = pct + '%';
}

document.addEventListener('DOMContentLoaded', loadAlerts);
if (document.readyState !== 'loading') loadAlerts();
