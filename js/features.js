function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('sch_dark_mode', isDark ? '1' : '0');
  document.getElementById('dark-mode-btn').textContent = isDark ? '☀️' : '🌙';
}
(function() {
  if (localStorage.getItem('sch_dark_mode') === '1') {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('dark-mode-btn');
    if (btn) btn.textContent = '☀️';
  }
})();

(function() {
  const manifest = {
    name: 'Meine Stunden Online', short_name: 'Meine Stunden', start_url: './',
    display: 'standalone', background_color: '#fdf6e9', theme_color: '#e11d48',
    icons: [{ src: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="#e11d48"/><text x="96" y="130" font-size="110" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">M</text></svg>'), sizes: '192x192', type: 'image/svg+xml' }]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const link = document.getElementById('pwa-manifest-link');
  if (link) link.href = URL.createObjectURL(blob);
  if ('serviceWorker' in navigator) {
    const sw = `const CACHE='mso-v1';self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>self.clients.claim());self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});`;
    navigator.serviceWorker.register(URL.createObjectURL(new Blob([sw],{type:'application/javascript'})),{scope:'./'}).catch(()=>{});
  }
})();

const LOGO_KEY = 'sch_company_logo';

function handleLogoUpload(input) {
  const file = input.files[0]; if (!file) return;
  if (file.size > 500*1024) { showToast('Logo zu groß – max. 500 KB'); return; }
  const reader = new FileReader();
  reader.onload = e => { localStorage.setItem(LOGO_KEY, e.target.result); applyLogo(e.target.result); showToast('✓ Logo gespeichert'); };
  reader.readAsDataURL(file);
}
function applyLogo(dataUrl) {
  const img=document.getElementById('header-logo-img'), prev=document.getElementById('logo-preview-img'), thumb=document.getElementById('logo-preview-thumb'), rmBtn=document.getElementById('logo-remove-btn');
  if(img) img.src=dataUrl; if(prev) prev.src=dataUrl; if(thumb) thumb.style.display='block'; if(rmBtn) rmBtn.style.display='inline-block';
  document.body.classList.add('has-logo');
}
function removeLogo() {
  localStorage.removeItem(LOGO_KEY);
  const img=document.getElementById('header-logo-img'), prev=document.getElementById('logo-preview-img'), thumb=document.getElementById('logo-preview-thumb'), rmBtn=document.getElementById('logo-remove-btn'), input=document.getElementById('logo-upload-input');
  if(img) img.src=''; if(prev) prev.src=''; if(thumb) thumb.style.display='none'; if(rmBtn) rmBtn.style.display='none';
  document.body.classList.remove('has-logo'); if(input) input.value=''; showToast('Logo entfernt');
}
(function(){ const saved=localStorage.getItem(LOGO_KEY); if(saved) applyLogo(saved); })();

// ── Feature 8: Live Clock ──────────────────────────────────────────────────
function startLiveClock() {
  const el = document.getElementById('live-clock-display');
  if (!el) return;
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}

// ── Feature 10: Smart Greeting ────────────────────────────────────────────
function getSmartGreeting(name) {
  const h = new Date().getHours();
  if (h < 12) return (activeLanguageGlobal==='en' ? `Good morning, ${name} ☀️` : `Guten Morgen, ${name} ☀️`);
  if (h < 17) return (activeLanguageGlobal==='en' ? `Good day, ${name} 👋`     : `Guten Tag, ${name} 👋`);
  return          (activeLanguageGlobal==='en' ? `Good evening, ${name} 🌙`  : `Guten Abend, ${name} 🌙`);
}

// ── Feature 3: Welcome Splash ─────────────────────────────────────────────
function showWelcomeSplash(name) {
  const existing = document.getElementById('welcome-splash');
  if (existing) existing.remove();
  const splash = document.createElement('div');
  splash.id = 'welcome-splash';
  splash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;animation:splashIn 0.3s ease;';
  splash.innerHTML = `
    <div style="width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,#E30613,#b8000f);display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(227,6,19,0.5);animation:splashPulse 1s ease infinite alternate;">
      <i class="fa-solid fa-clock" style="color:#fff;font-size:32px;"></i>
    </div>
    <div style="text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${getSmartGreeting(name)}</div>
      <div style="font-size:13px;color:#64748b;margin-top:6px;font-weight:500;">Meine Stunden Online</div>
    </div>
    <div style="width:48px;height:3px;background:#E30613;border-radius:2px;animation:splashBar 1.2s ease forwards;"></div>`;
  document.body.appendChild(splash);
  setTimeout(() => {
    splash.style.animation = 'splashOut 0.4s ease forwards';
    setTimeout(() => splash.remove(), 400);
  }, 1800);
}

// ── Feature 9: Period Progress Bar ───────────────────────────────────────
function renderPeriodProgressBar() {
  const el = document.getElementById('period-progress-container');
  if (!el) return;
  const now   = new Date();
  const def   = getDefault20to20Period();
  const total = def.end.getTime() - def.start.getTime();
  const done  = Math.min(now.getTime() - def.start.getTime(), total);
  const pct   = Math.max(0, Math.min(100, (done / total) * 100));

  // Count working days remaining (Mon–Fri)
  let remaining = 0;
  const cursor = new Date(now); cursor.setHours(0,0,0,0); cursor.setDate(cursor.getDate()+1);
  const endDay = new Date(def.end); endDay.setHours(0,0,0,0);
  while (cursor <= endDay) { const wd=cursor.getDay(); if(wd>=1&&wd<=5) remaining++; cursor.setDate(cursor.getDate()+1); }

  // Count missing days (Mon–Fri in period so far with no entry)
  let missing = 0;
  const cursorM = new Date(def.start); cursorM.setHours(0,0,0,0);
  const today   = new Date(); today.setHours(0,0,0,0);
  while (cursorM < today) {
    const wd = cursorM.getDay();
    if (wd >= 1 && wd <= 5) {
      const dd = String(cursorM.getDate()).padStart(2,'0');
      const mm = String(cursorM.getMonth()+1).padStart(2,'0');
      const yy = cursorM.getFullYear();
      const key = `${dd}/${mm}/${yy}`;
      const hasEntry = globalLoggedSessionsDatabaseMock.some(s => s.date === key)
                    || vacationLoggedDaysArrayCache.some(s => s.date === key);
      if (!hasEntry) missing++;
    }
    cursorM.setDate(cursorM.getDate()+1);
  }

  const startFmt = def.start.toLocaleDateString('de-DE',{day:'2-digit',month:'short'});
  const endFmt   = def.end.toLocaleDateString('de-DE',{day:'2-digit',month:'short'});

  el.innerHTML = `
    <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Abrechnungszeitraum ${startFmt} – ${endFmt}</span>
        <span style="font-size:11px;font-weight:700;color:var(--primary-blue);">${Math.round(pct)}%</span>
      </div>
      <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#E30613,var(--primary-blue));border-radius:3px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1);"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span style="font-size:11px;color:var(--text-muted);">
          <i class="fa-solid fa-calendar-day" style="margin-right:4px;color:var(--primary-blue);"></i>
          ${remaining} ${activeLanguageGlobal==='en'?'working days left':'Arbeitstage verbleibend'}
        </span>
        ${missing > 0 ? `<span style="font-size:11px;color:#ef4444;font-weight:700;">
          <i class="fa-solid fa-triangle-exclamation" style="margin-right:4px;"></i>
          ${missing} ${activeLanguageGlobal==='en'?'day(s) missing':'fehlende Einträge'}
        </span>` : `<span style="font-size:11px;color:#10b981;font-weight:700;"><i class="fa-solid fa-circle-check" style="margin-right:4px;"></i>${activeLanguageGlobal==='en'?'All days covered':'Alle Tage erfasst'}</span>`}
      </div>
    </div>`;
}

// ── Feature 5: Quick Stats Strip ─────────────────────────────────────────
function renderQuickStatsStrip() {
  const el = document.getElementById('quick-stats-strip');
  if (!el) return;
  const count = globalLoggedSessionsDatabaseMock.filter(s => s.type==='work').length;
  const net   = globalLoggedSessionsDatabaseMock.reduce((sum,s) => {
    if (s.type!=='work') return sum;
    return sum + ((s.duration||0) - ((s.breakTime||0)/60));
  }, 0);
  const avg = count > 0 ? net / count : 0;
  el.innerHTML = `
    <div style="display:flex;gap:10px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:10px;padding:10px 14px;margin-bottom:14px;flex-wrap:wrap;">
      <span style="font-size:12px;font-weight:700;color:var(--text-muted);">
        <i class="fa-solid fa-calendar-check" style="color:var(--primary-blue);margin-right:4px;"></i>${count} ${activeLanguageGlobal==='en'?'Entries':'Einträge'}
      </span>
      <span style="color:var(--card-border);">|</span>
      <span style="font-size:12px;font-weight:700;color:var(--text-muted);">
        <i class="fa-solid fa-clock" style="color:#10b981;margin-right:4px;"></i>${net.toFixed(2)} hrs
      </span>
      <span style="color:var(--card-border);">|</span>
      <span style="font-size:12px;font-weight:700;color:var(--text-muted);">
        <i class="fa-solid fa-chart-bar" style="color:#f59e0b;margin-right:4px;"></i>${avg.toFixed(2)} h/Tag Ø
      </span>
    </div>`;
}

// ── Feature 14: Nav Badge ─────────────────────────────────────────────────
function updateNavBadge() {
  const existing = document.getElementById('hist-nav-badge');
  if (existing) existing.remove();
  const count = globalLoggedSessionsDatabaseMock.length;
  if (!count) return;
  const navItem = document.querySelector('[onclick*="switchActiveView(\'history\'"]');
  if (!navItem) return;
  const badge = document.createElement('span');
  badge.id = 'hist-nav-badge';
  badge.style.cssText = 'background:#E30613;color:#fff;font-size:9px;font-weight:800;border-radius:99px;padding:1px 6px;margin-left:auto;min-width:18px;text-align:center;';
  badge.textContent = count > 99 ? '99+' : count;
  navItem.appendChild(badge);
}

// ── Feature 12: Login Attempt Limiter ────────────────────────────────────
const LOGIN_ATTEMPTS_KEY = 'sch_login_attempts';
const LOGIN_LOCKOUT_KEY  = 'sch_login_lockout';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS   = 30000;

function checkLoginLockout() {
  const lockoutUntil = parseInt(localStorage.getItem(LOGIN_LOCKOUT_KEY) || '0');
  const remaining    = lockoutUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

function recordFailedLoginAttempt() {
  const attempts = parseInt(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '0') + 1;
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, attempts);
  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem(LOGIN_LOCKOUT_KEY, Date.now() + LOCKOUT_MS);
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, '0');
  }
  return attempts;
}

function clearLoginAttempts() {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  localStorage.removeItem(LOGIN_LOCKOUT_KEY);
}

function startLockoutCountdown(msgBox) {
  const interval = setInterval(() => {
    const remaining = checkLoginLockout();
    if (remaining <= 0) {
      clearInterval(interval);
      msgBox.innerHTML = activeLanguageGlobal==='de'
        ? 'Sie können sich wieder anmelden.'
        : 'You may try again.';
      msgBox.className = 'message success';
      document.getElementById('btn-login-submit').disabled = false;
    } else {
      const secs = Math.ceil(remaining / 1000);
      msgBox.innerHTML = activeLanguageGlobal==='de'
        ? `<i class="fa-solid fa-lock" style="margin-right:6px;"></i>Zu viele Versuche. Bitte warten: <strong>${secs}s</strong>`
        : `<i class="fa-solid fa-lock" style="margin-right:6px;"></i>Too many attempts. Wait: <strong>${secs}s</strong>`;
      msgBox.className = 'message error';
      document.getElementById('btn-login-submit').disabled = true;
    }
  }, 500);
}

// ── Feature 13: Last Login + Devices on Dashboard ─────────────────────────
async function renderLastLoginInfo() {
  const el = document.getElementById('last-login-info');
  if (!el || !authenticatedUserGlobal) return;
  try {
    const snap = await db.collection('userProfiles').doc(authenticatedUserGlobal).get();
    if (!snap.exists) return;
    const data = snap.data();
    if (data.lastLogin && data.lastLogin.toDate) {
      const d    = data.lastLogin.toDate();
      const lang = activeLanguageGlobal==='en' ? 'en-GB' : 'de-DE';
      const fmt  = d.toLocaleDateString(lang,{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) + ' ' + activeLanguageGlobal==='de' ? 'um' : 'at';
      const time = d.toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'});
      el.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="margin-right:6px;color:var(--text-muted);font-size:11px;"></i><span style="font-size:12px;color:var(--text-muted);font-weight:500;">${activeLanguageGlobal==='de'?'Zuletzt angemeldet:':'Last login:'} <strong style="color:var(--dark-slate);">${d.toLocaleDateString(lang,{weekday:'short',day:'2-digit',month:'short'})} ${activeLanguageGlobal==='de'?'um':'at'} ${time}</strong></span>`;
    }
  } catch(e) {}
}

// ── Feature 6: Entry Save Haptic + Sound ─────────────────────────────────
function triggerSaveHaptic() {
  // Only vibrate if phone is not on silent — navigator.vibrate respects silent mode on most Android
  if (navigator.vibrate) navigator.vibrate(40);
  // Subtle audio click using AudioContext (respects device volume)
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch(e) {}
}

// ── CSS injected for splash animations ───────────────────────────────────
(function injectFeatureCSS() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes splashIn  { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
    @keyframes splashOut { from{opacity:1;transform:scale(1)}    to{opacity:0;transform:scale(1.03)} }
    @keyframes splashPulse { from{box-shadow:0 0 20px rgba(227,6,19,0.4)} to{box-shadow:0 0 50px rgba(227,6,19,0.8)} }
    @keyframes splashBar  { from{width:0;opacity:0} to{width:48px;opacity:1} }
    #live-clock-display { font-variant-numeric: tabular-nums; }
  `;
  document.head.appendChild(style);
})();

// ── Device tracking (unchanged logic, moved here) ─────────────────────────
let currentDeviceIdGlobal = null;
let deviceListenerUnsub   = null;

async function initializeDeviceTrackingEngine(displayName) {
  const uid = authenticatedUserGlobal;
  if (!uid || typeof db === 'undefined') return;
  try {
    currentDeviceIdGlobal = localStorage.getItem('sch_device_' + uid)
      || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9));
    localStorage.setItem('sch_device_' + uid, currentDeviceIdGlobal);
    const ua = navigator.userAgent;
    const deviceName = /iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':'Desktop';
    await db.collection('userDevices').doc(uid+'_'+currentDeviceIdGlobal).set({
      user:uid, displayName:displayName, deviceId:currentDeviceIdGlobal, name:deviceName,
      lastSeen:firebase.firestore.FieldValue.serverTimestamp(),
      loginTime:firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
    if (deviceListenerUnsub) deviceListenerUnsub();
    deviceListenerUnsub = db.collection('userProfiles').doc(uid).onSnapshot(doc => {
      if (!doc.exists) return;
      const data = doc.data();
      if (data.forceLogout && data.allowedDevice && data.allowedDevice !== currentDeviceIdGlobal) {
        const forceTime = data.forceLogout.toMillis ? data.forceLogout.toMillis() : 0;
        const myLogin   = parseInt(localStorage.getItem('sch_login_'+uid)||'0');
        if (forceTime > myLogin) {
          localStorage.removeItem('schuermann_current_user');
          localStorage.removeItem('schuermann_auth_user');
          showToast(activeLanguageGlobal==='de'?'Auf anderem Gerät abgemeldet':'Logged out from another device');
          setTimeout(()=>location.reload(), 1500);
        }
      }
    });
    localStorage.setItem('sch_login_'+uid, Date.now().toString());
    renderActiveDevicesList(uid, displayName);
    setInterval(()=>{
      db.collection('userDevices').doc(uid+'_'+currentDeviceIdGlobal)
        .update({lastSeen:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    }, 60000);
  } catch(e) { console.warn('Device tracking:',e); }
}

async function renderActiveDevicesList(uid, displayName) {
  const el = document.getElementById('active-devices-list');
  if (!el || typeof db==='undefined') return;
  const resolvedUid = uid || authenticatedUserGlobal;
  try {
    const snap    = await db.collection('userDevices').where('user','==',resolvedUid).orderBy('lastSeen','desc').limit(5).get();
    const lang    = activeLanguageGlobal==='en'?'en-GB':'de-DE';
    const devices = [];
    snap.forEach(doc => devices.push(doc.data()));
    el.innerHTML = devices.map(d => {
      const isCurrent = d.deviceId === currentDeviceIdGlobal;
      const t = d.lastSeen && d.lastSeen.toDate
        ? d.lastSeen.toDate().toLocaleString(lang,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px">
        <div>
          <div style="font-weight:600;font-size:13px">${sanitizeHTML(d.name||'Gerät')} ${isCurrent?'<span style="color:var(--primary-blue);font-size:10px;margin-left:6px">(Dieses Gerät)</span>':''}</div>
          <div style="font-size:11px;color:var(--text-muted)">${sanitizeHTML(t)}</div>
        </div>
        <i class="fa-solid fa-mobile-screen" style="color:${isCurrent?'var(--primary-blue)':'var(--text-muted)'}"></i>
      </div>`;
    }).join('') || '<div style="font-size:12px;color:var(--text-muted)">Keine Geräte</div>';
  } catch(e) { el.innerHTML='<div style="font-size:12px;color:var(--text-muted)">Laden...</div>'; }
}

async function logoutOtherDevicesEngine() {
  const uid = authenticatedUserGlobal;
  if (!uid || typeof db==='undefined') return;
  try {
    await db.collection('userProfiles').doc(uid).set({
      forceLogout:firebase.firestore.FieldValue.serverTimestamp(), allowedDevice:currentDeviceIdGlobal
    }, {merge:true});
    const snap  = await db.collection('userDevices').where('user','==',uid).get();
    const batch = db.batch();
    snap.forEach(doc => { if(doc.id !== uid+'_'+currentDeviceIdGlobal) batch.delete(doc.ref); });
    await batch.commit();
    showToast(activeLanguageGlobal==='de'?'✓ Andere Geräte werden abgemeldet':'✓ Other devices will be logged out');
    setTimeout(()=>renderActiveDevicesList(uid), 1000);
  } catch(e) { showToast('Fehler'); }
}

function animateCountUp(el, targetStr) {
  if (!el) return;
  const match = targetStr.match(/([\+\-]?)([\d\.]+)(.*)/);
  if (!match) { el.textContent=targetStr; return; }
  const prefix=match[1], target=parseFloat(match[2]), suffix=match[3];
  const decimals=(match[2].split('.')[1]||'').length;
  const duration=700, startTime=performance.now();
  el.classList.remove('count-animate'); void el.offsetWidth; el.classList.add('count-animate');
  function step(now) {
    const pct=Math.min((now-startTime)/duration,1), ease=1-Math.pow(1-pct,3);
    el.textContent=prefix+(ease*target).toFixed(decimals)+suffix;
    if(pct<1) requestAnimationFrame(step); else el.textContent=targetStr;
  }
  requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', () => {
  const orig = window.runGlobalApplicationMetricsEngine;
  if (typeof orig === 'function') {
    window.runGlobalApplicationMetricsEngine = function() {
      const gBefore=document.getElementById('dash-gross-hours')?.textContent;
      const oBefore=document.getElementById('dash-overtime-hours')?.textContent;
      orig.apply(this, arguments);
      const grossEl=document.getElementById('dash-gross-hours');
      const otEl=document.getElementById('dash-overtime-hours');
      if(grossEl && grossEl.textContent!==gBefore) animateCountUp(grossEl, grossEl.textContent);
      if(otEl    && otEl.textContent!==oBefore)    animateCountUp(otEl,    otEl.textContent);
      // Update dependent UI after metrics
      renderQuickStatsStrip();
      renderPeriodProgressBar();
      updateNavBadge();
    };
  }
});
