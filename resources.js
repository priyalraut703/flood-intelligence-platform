// resources.js — Resource Allocation Page Logic

let allResources = [];

async function loadResources() {
  const tableEl = document.getElementById('resourceTable');
  if (!tableEl) return;

  showLoading(tableEl);

  const r = await fetch('/api/resources');
  const d = await r.json();
  allResources = d.resources;

  const totalPumps = allResources.reduce((a, b) => a + b.pumps, 0);
  const totalTeams = allResources.reduce((a, b) => a + b.teams, 0);
  const totalBoats = allResources.reduce((a, b) => a + b.boats, 0);

  document.getElementById('totalPumps').textContent = totalPumps;
  document.getElementById('totalTeams').textContent = totalTeams;
  document.getElementById('totalBoats').textContent = totalBoats;
  document.getElementById('totalWards').textContent = allResources.length;

  renderResourceTable(allResources);
}

function renderResourceTable(resources) {
  const el = document.getElementById('resourceTable');
  if (!el) return;

  if (resources.length === 0) {
    el.innerHTML = '<div class="loading">No resources found for selected filter.</div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Ward ID</th>
          <th>Ward Name</th>
          <th>Risk Level</th>
          <th>Population</th>
          <th>Pumps</th>
          <th>Teams</th>
          <th>Boats</th>
          <th>Readiness</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${resources.map(r => `
          <tr>
            <td style="font-size:11px;color:var(--text-muted)">${r.ward_id}</td>
            <td style="font-weight:600">${r.ward_name}</td>
            <td>${riskBadge(r.risk_level)}</td>
            <td>${numFormat(r.population)}</td>
            <td>
              <div style="display:flex;gap:5px;align-items:center">
                ${Array.from({ length: r.pumps }, () =>
                  '<i class="fas fa-pump-soap" style="color:var(--primary-light);font-size:12px"></i>'
                ).join('')}
                <span style="margin-left:4px;font-size:12px;font-weight:600">${r.pumps}</span>
              </div>
            </td>
            <td>
              <div style="display:flex;gap:5px;align-items:center">
                ${Array.from({ length: r.teams }, () =>
                  '<i class="fas fa-person-military-pointing" style="color:var(--accent2);font-size:12px"></i>'
                ).join('')}
                <span style="margin-left:4px;font-size:12px;font-weight:600">${r.teams}</span>
              </div>
            </td>
            <td>
              ${r.boats > 0
                ? `<span style="color:var(--info);font-size:13px"><i class="fas fa-sailboat"></i> ${r.boats}</span>`
                : '<span style="color:var(--text-muted);font-size:11px">—</span>'}
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:6px;min-width:90px">
                <div class="progress-bar" style="flex:1">
                  <div class="progress-fill ${r.readiness_score > 0.7 ? 'green' : r.readiness_score > 0.5 ? 'orange' : 'red'}"
                       style="width:${r.readiness_score * 100}%"></div>
                </div>
                <span style="font-size:11px">${(r.readiness_score * 100).toFixed(0)}%</span>
              </div>
            </td>
            <td>
              <span class="badge ${r.risk_level === 'HIGH' ? 'badge-high' : 'badge-medium'}">
                ${r.risk_level === 'HIGH' ? 'DEPLOYED' : 'STANDBY'}
              </span>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterTable(query) {
  const risk = document.getElementById('riskFilter')?.value || 'ALL';
  let filtered = allResources;
  if (risk !== 'ALL') filtered = filtered.filter(r => r.risk_level === risk);
  if (query) filtered = filtered.filter(r => r.ward_name.toLowerCase().includes(query.toLowerCase()));
  renderResourceTable(filtered);
}

function filterByRisk(risk) {
  const query = document.getElementById('searchBox')?.value || '';
  filterTable(query);
}

function exportResources() {
  const rows = [['Ward ID', 'Ward Name', 'Risk Level', 'Population', 'Pumps', 'Teams', 'Boats', 'Readiness']];
  allResources.forEach(r => rows.push([
    r.ward_id, r.ward_name, r.risk_level, r.population,
    r.pumps, r.teams, r.boats, (r.readiness_score * 100).toFixed(0) + '%'
  ]));
  const csv = rows.map(row => row.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv,' + encodeURIComponent(csv);
  a.download = 'resource_allocation.csv';
  a.click();
}

document.addEventListener('DOMContentLoaded', loadResources);
if (document.readyState !== 'loading') loadResources();
