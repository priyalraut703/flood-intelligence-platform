// settings.js — Settings Page Logic

function applyTheme(theme, el) {
  document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
  if (el) el.classList.add('active');

  const actual = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  document.documentElement.setAttribute('data-theme', actual);
  localStorage.setItem('theme', actual);

  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = actual === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleSetting(key, el) {
  el.classList.toggle('on');
  const isOn = el.classList.contains('on');
  localStorage.setItem('setting_' + key, isOn ? '1' : '0');
}

function saveSettings() {
  showToast('Settings saved successfully!');
}

function retrainModel() {
  showToast('Model retraining scheduled...');
  const btn = event.currentTarget;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Retraining...';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = '<i class="fas fa-check"></i> Done';
    btn.disabled = false;
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-rotate"></i> Retrain Now';
    }, 2000);
  }, 2500);
}

function regenerateData() {
  showToast('Data regeneration started — refresh in 5s...');
}

function exportAll() {
  showToast('Preparing full data export...');
}

function saveMapStyle(style) {
  localStorage.setItem('mapStyle', style);
  showToast('Map style updated: ' + style);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  if (!t || !m) return;
  m.textContent = ' ' + msg;
  t.style.transform = 'translateY(0)';
  t.style.opacity = '1';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    t.style.transform = 'translateY(80px)';
    t.style.opacity = '0';
  }, 3000);
}

function initSettingsPage() {
  if (!document.getElementById('themeDark')) return;

  // Sync theme highlight
  const cur = localStorage.getItem('theme') || 'dark';
  document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
  const map = { dark: 'themeDark', light: 'themeLight', system: 'themeSystem' };
  const el = document.getElementById(map[cur] || 'themeDark');
  if (el) el.classList.add('active');

  // Restore map style selector
  const mapStyle = localStorage.getItem('mapStyle') || 'dark';
  const sel = document.getElementById('mapStyle');
  if (sel) sel.value = mapStyle;

  // Restore saved toggle states
  document.querySelectorAll('[id^=toggle]').forEach(t => {
    const key = t.id.replace('toggle', '').toLowerCase();
    const saved = localStorage.getItem('setting_' + key);
    if (saved === '0') t.classList.remove('on');
    else if (saved === '1') t.classList.add('on');
  });
}

document.addEventListener('DOMContentLoaded', initSettingsPage);
if (document.readyState !== 'loading') initSettingsPage();