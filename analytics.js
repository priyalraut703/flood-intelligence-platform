// analytics.js — Analytics Page Charts & Data

let analyticsCharts = {};

async function initAnalyticsPage() {
  if (!document.getElementById('riskPie')) return;
  const r = await fetch('/api/analytics');
  const d = await r.json();

  // Stats
  document.getElementById('aStatHigh').textContent  = d.risk_distribution.HIGH  || 0;
  document.getElementById('aStatPop').textContent   = numFormat(d.total_population_at_risk);
  document.getElementById('aStatDrain').textContent = (d.avg_drain_capacity * 100).toFixed(0) + '%';

  renderRiskPie(d.risk_distribution);
  renderMonthlyLine(d.monthly_trend);
  renderWardBar(d.top_rainfall_wards);
  renderReadiness(d.readiness_distribution);
  renderResourceChart();
}

function renderRiskPie(dist) {
  const ctx = document.getElementById('riskPie').getContext('2d');
  analyticsCharts.pie = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['High Risk', 'Medium Risk', 'Low Risk'],
      datasets: [{
        data: [dist.HIGH || 0, dist.MEDIUM || 0, dist.LOW || 0],
        backgroundColor: ['rgba(239,68,68,0.82)', 'rgba(245,158,11,0.82)', 'rgba(34,197,94,0.82)'],
        borderColor:      ['#ef4444', '#f59e0b', '#22c55e'],
        borderWidth: 2,
        hoverOffset: 10
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              return ` ${ctx.label}: ${ctx.raw} wards (${((ctx.raw / total) * 100).toFixed(1)}%)`;
            }
          }
        }
      },
      animation: { duration: 1200 }
    }
  });
}

function renderMonthlyLine(trend) {
  const ctx = document.getElementById('monthlyLine').getContext('2d');
  analyticsCharts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.months,
      datasets: [
        {
          label: 'Rainfall (mm)',
          data: trend.rainfall,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.12)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#a78bfa',
          pointRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Flood Events',
          data: trend.flood_events,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.10)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ef4444',
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      interaction: { mode: 'index' },
      plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } },
      scales: {
        x:  { grid: { display: false } },
        y:  { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Rainfall (mm)', font: { size: 11 } } },
        y1: { position: 'right', grid: { display: false }, title: { display: true, text: 'Events', font: { size: 11 } } }
      }
    }
  });
}

function renderWardBar(wards) {
  const ctx = document.getElementById('wardBar').getContext('2d');
  analyticsCharts.ward = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: wards.map(w => w.ward_name.substring(0, 14)),
      datasets: [{
        label: 'Rainfall (mm)',
        data: wards.map(w => w.rainfall),
        backgroundColor: wards.map(w => riskColor(w.risk_level) + 'cc'),
        borderColor:      wards.map(w => riskColor(w.risk_level)),
        borderWidth: 1,
        borderRadius: 5,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function renderReadiness(dist) {
  const ctx = document.getElementById('readinessBar').getContext('2d');
  analyticsCharts.readiness = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(dist),
      datasets: [{
        label: 'Number of Wards',
        data: Object.values(dist),
        backgroundColor: [
          'rgba(239,68,68,0.75)', 'rgba(245,158,11,0.75)',
          'rgba(99,102,241,0.75)', 'rgba(34,197,94,0.75)'
        ],
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderResourceChart() {
  const ctx = document.getElementById('resourceChart').getContext('2d');
  const labels = ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'];
  analyticsCharts.resource = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Pumps',        data: [18, 22, 15, 20, 10], backgroundColor: 'rgba(124,58,237,0.75)', borderRadius: 4 },
        { label: 'Teams',        data: [12, 15, 10, 14,  8], backgroundColor: 'rgba(6,182,212,0.75)',  borderRadius: 4 },
        { label: 'Rescue Boats', data: [ 6,  8,  5,  7,  3], backgroundColor: 'rgba(245,158,11,0.75)', borderRadius: 4 },
      ]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function updateAnalytics(filter) {
  // Could re-fetch filtered data; for now visual acknowledgement
  console.log('Analytics filter:', filter);
}

document.addEventListener('DOMContentLoaded', initAnalyticsPage);
if (document.readyState !== 'loading') initAnalyticsPage();
