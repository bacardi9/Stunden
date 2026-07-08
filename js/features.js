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

  let remaining = 0;
  const cursor = new Date(now); cursor.setHours(0,0,0,0); cursor.setDate(cursor.getDate()+1);
  const endDay = new Date(def.end); endDay.setHours(0,0,0,0);
  while (cursor <= endDay) { const wd=cursor.getDay(); if(wd>=1&&wd<=5) remaining++; cursor.setDate(cursor.getDate()+1); }

  const missingDays = getMissingDays(def);
  const missing = missingDays.length;
  const startFmt = def.start.toLocaleDateString('de-DE',{day:'2-digit',month:'short'});
  const endFmt   = def.end.toLocaleDateString('de-DE',{day:'2-digit',month:'short'});

  el.innerHTML = `
    <div id="period-progress-bar-card" style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Abrechnungszeitraum ${startFmt} – ${endFmt}</span>
        <span style="font-size:11px;font-weight:700;color:var(--primary-blue);">${Math.round(pct)}%</span>
      </div>
      <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#E30613,var(--primary-blue));border-radius:3px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1);"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;align-items:center;">
        <span style="font-size:11px;color:var(--text-muted);">
          <i class="fa-solid fa-calendar-day" style="margin-right:4px;color:var(--primary-blue);"></i>
          ${remaining} ${activeLanguageGlobal==='en'?'working days left':'Arbeitstage verbleibend'}
        </span>
        ${missing > 0
          ? `<button onclick="toggleMissingDaysPanel()" id="missing-days-toggle-btn" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 0.15s;">
              <i class="fa-solid fa-triangle-exclamation"></i>
              ${missing} ${activeLanguageGlobal==='en'?'day(s) missing':'fehlende Einträge'}
              <i class="fa-solid fa-chevron-down" id="missing-chevron" style="font-size:9px;transition:transform 0.2s;"></i>
            </button>`
          : `<span style="font-size:11px;color:#10b981;font-weight:700;"><i class="fa-solid fa-circle-check" style="margin-right:4px;"></i>${activeLanguageGlobal==='en'?'All days covered':'Alle Tage erfasst'}</span>`
        }
      </div>
      <div id="missing-days-panel" style="display:none;margin-top:12px;border-top:1px solid rgba(0,0,0,0.06);padding-top:12px;"></div>
    </div>`;

  const elHist = document.getElementById('period-progress-container-hist');
  if (elHist) elHist.innerHTML = el.innerHTML
    .replace('period-progress-bar-card','period-progress-bar-card-hist')
    .replace('missing-days-panel','missing-days-panel-hist')
    .replace('missing-days-toggle-btn','missing-days-toggle-btn-hist')
    .replace('missing-chevron','missing-chevron-hist')
    .replace('toggleMissingDaysPanel()','toggleMissingDaysPanel(true)');
}

function getMissingDays(def) {
  const missing = [];
  const cursor = new Date(def.start); cursor.setHours(0,0,0,0);
  const today  = new Date(); today.setHours(0,0,0,0);
  while (cursor < today) {
    const wd = cursor.getDay();
    if (wd >= 1 && wd <= 5) {
      const dd  = String(cursor.getDate()).padStart(2,'0');
      const mm  = String(cursor.getMonth()+1).padStart(2,'0');
      const yy  = cursor.getFullYear();
      const key = `${dd}/${mm}/${yy}`;
      const hasEntry = globalLoggedSessionsDatabaseMock.some(s => s.date === key)
                    || vacationLoggedDaysArrayCache.some(s => s.date === key);
      if (!hasEntry) missing.push({ key, date: new Date(cursor), dateStr: cursor.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'}) });
    }
    cursor.setDate(cursor.getDate()+1);
  }
  return missing;
}

let _missingDaySelected = null;

function toggleMissingDaysPanel(isHist) {
  const panelId  = isHist ? 'missing-days-panel-hist'  : 'missing-days-panel';
  const chevronId= isHist ? 'missing-chevron-hist'      : 'missing-chevron';
  const panel    = document.getElementById(panelId);
  const chevron  = document.getElementById(chevronId);
  if (!panel) return;
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  if (!isOpen) renderMissingDaysPanel(isHist);
}

function renderMissingDaysPanel(isHist) {
  const panelId = isHist ? 'missing-days-panel-hist' : 'missing-days-panel';
  const panel   = document.getElementById(panelId);
  if (!panel) return;
  const def     = getDefault20to20Period();
  const missing = getMissingDays(def);

  if (!missing.length) {
    panel.innerHTML = `<div style="text-align:center;padding:16px;color:#10b981;font-size:13px;font-weight:700;"><i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>Alle Tage erfasst!</div>`;
    return;
  }

  panel.innerHTML = `
    <div style="margin-bottom:10px;">
      <div style="font-size:11px;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
        <i class="fa-solid fa-calendar-xmark" style="margin-right:5px;"></i>${missing.length} fehlende Arbeitstage — Tippe zum Eintragen
      </div>
      <div id="missing-days-chips-${isHist?'hist':'dash'}" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
        ${missing.map(d => `
          <button
            onclick="selectMissingDay('${d.key}','${d.dateStr}',${!!isHist})"
            id="missing-chip-${d.key.replace(/\//g,'-')}"
            style="background:rgba(239,68,68,0.06);border:1.5px solid rgba(239,68,68,0.2);color:#ef4444;padding:5px 12px;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.15s;white-space:nowrap;">
            <i class="fa-solid fa-circle-plus" style="margin-right:4px;font-size:9px;"></i>${d.dateStr}
          </button>`).join('')}
      </div>
      <div id="missing-day-form-${isHist?'hist':'dash'}" style="display:none;"></div>
    </div>`;
}

function selectMissingDay(dateKey, dateStr, isHist) {
  const formId = `missing-day-form-${isHist?'hist':'dash'}`;
  const form   = document.getElementById(formId);
  if (!form) return;

  document.querySelectorAll(`[id^="missing-chip-"]`).forEach(c => {
    c.style.background   = 'rgba(239,68,68,0.06)';
    c.style.borderColor  = 'rgba(239,68,68,0.2)';
    c.style.color        = '#ef4444';
  });
  const chip = document.getElementById(`missing-chip-${dateKey.replace(/\//g,'-')}`);
  if (chip) { chip.style.background='#ef4444'; chip.style.borderColor='#ef4444'; chip.style.color='#fff'; }

  _missingDaySelected = dateKey;
  const [dd,mm,yy] = dateKey.split('/');
  const isoDate    = `${yy}-${mm}-${dd}`;

  const recentProjects = [...new Set(
    (globalLoggedSessionsDatabaseMock || []).filter(s => s.type==='work'&&s.project).slice(0,10).map(s=>s.project)
  )].slice(0,5);

  form.style.display = 'block';
  form.innerHTML = `
    <div style="background:rgba(255,255,255,0.9);border:1.5px solid rgba(239,68,68,0.15);border-radius:14px;padding:16px;animation:slideInUp 0.2s ease;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#E30613,#b8000f);border-radius:9px;display:flex;align-items:center;justify-content:center;">
          <i class="fa-solid fa-pen-to-square" style="color:#fff;font-size:13px;"></i>
        </div>
        <div>
          <div style="font-size:13px;font-weight:800;color:var(--text-main);">Eintrag für ${dateStr}</div>
          <div style="font-size:10px;color:var(--text-muted);">Fehlenden Tag nachbuchen</div>
        </div>
        <button onclick="closeMissingDayForm(${!!isHist})" style="margin-left:auto;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;padding:4px;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:5px;letter-spacing:0.5px;">Kommen</label>
          <select id="missing-start-${isoDate}" style="width:100%;padding:9px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;background:#fff;">
            ${generateTimeOptions('07:00')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:5px;letter-spacing:0.5px;">Gehen</label>
          <select id="missing-end-${isoDate}" style="width:100%;padding:9px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;background:#fff;">
            ${generateTimeOptions('16:15')}
          </select>
        </div>
      </div>
      <div style="margin-bottom:10px;">
        <label style="display:block;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:5px;letter-spacing:0.5px;">Baustelle / Kunde</label>
        <input type="text" id="missing-project-${isoDate}"
          placeholder="Baustelle oder Kundenname"
          value="${recentProjects[0] || ''}"
          list="missing-projects-list-${isoDate}"
          style="width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:500;background:#fff;">
        <datalist id="missing-projects-list-${isoDate}">
          ${recentProjects.map(p => `<option value="${p}">`).join('')}
        </datalist>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:5px;letter-spacing:0.5px;">Pause</label>
        <div style="display:flex;gap:6px;">
          ${[0,15,30,45,60].map(m => `
            <button type="button" onclick="selectMissingBreak(this,${m},'${isoDate}')"
              class="missing-break-pill" data-mins="${m}"
              style="flex:1;background:${m===0?'rgba(227,6,19,0.08)':'rgba(0,0,0,0.04)'};border:1.5px solid ${m===0?'rgba(227,6,19,0.3)':'transparent'};color:${m===0?'#E30613':'var(--text-muted)'};padding:7px 4px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.15s;">
              ${m===0?'Keine':m+'m'}
            </button>`).join('')}
        </div>
        <input type="hidden" id="missing-break-${isoDate}" value="0">
      </div>
      <div id="missing-duration-preview-${isoDate}" style="text-align:center;font-size:12px;font-weight:700;color:#10b981;margin-bottom:10px;min-height:18px;"></div>
      <div style="display:flex;gap:8px;">
        <button type="button" onclick="saveMissingDayEntry('${dateKey}','${isoDate}',${!!isHist})"
          style="flex:1;background:linear-gradient(135deg,#E30613,#b8000f);border:none;color:#fff;padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(227,6,19,0.3);transition:all 0.15s;">
          <i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i>Speichern & weiter
        </button>
        <button type="button" onclick="logMissingAsSchule('${dateKey}','${isoDate}',${!!isHist})"
          style="background:rgba(14,165,233,0.08);border:1.5px solid rgba(14,165,233,0.2);color:var(--primary-blue);padding:12px 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all 0.15s;">
          🎓 Schultag
        </button>
      </div>
    </div>`;

  const startEl = document.getElementById(`missing-start-${isoDate}`);
  const endEl   = document.getElementById(`missing-end-${isoDate}`);
  const update  = () => updateMissingDurationPreview(isoDate);
  if (startEl) startEl.addEventListener('change', update);
  if (endEl)   endEl.addEventListener('change', update);
  update();
}

function generateTimeOptions(defaultVal) {
  let html = '';
  for (let h = 0; h < 24; h++) {
    for (const m of ['00','15','30','45']) {
      const t = `${String(h).padStart(2,'0')}:${m}`;
      html += `<option value="${t}"${t===defaultVal?' selected':''}>${t}</option>`;
    }
  }
  return html;
}

function selectMissingBreak(btn, mins, isoDate) {
  document.querySelectorAll('.missing-break-pill').forEach(p => {
    p.style.background='rgba(0,0,0,0.04)'; p.style.borderColor='transparent'; p.style.color='var(--text-muted)';
  });
  btn.style.background='rgba(227,6,19,0.08)'; btn.style.borderColor='rgba(227,6,19,0.3)'; btn.style.color='#E30613';
  const inp = document.getElementById(`missing-break-${isoDate}`);
  if (inp) inp.value = mins;
  updateMissingDurationPreview(isoDate);
}

function updateMissingDurationPreview(isoDate) {
  const preview  = document.getElementById(`missing-duration-preview-${isoDate}`);
  const startVal = document.getElementById(`missing-start-${isoDate}`)?.value;
  const endVal   = document.getElementById(`missing-end-${isoDate}`)?.value;
  const brk      = parseInt(document.getElementById(`missing-break-${isoDate}`)?.value || '0');
  if (!preview || !startVal || !endVal) return;
  const [sh,sm] = startVal.split(':').map(Number);
  const [eh,em] = endVal.split(':').map(Number);
  const gross   = (eh*60+em) - (sh*60+sm);
  if (gross <= 0) { preview.style.color='#ef4444'; preview.textContent='⚠ Endzeit vor Startzeit'; return; }
  const net = (gross - brk) / 60;
  preview.style.color = net > 0 ? '#10b981' : '#ef4444';
  preview.textContent = `⏱ ${startVal} – ${endVal}  |  Netto: ${net.toFixed(2)} h  (${brk} min Pause)`;
}

function saveMissingDayEntry(dateKey, isoDate, isHist) {
  const startVal = document.getElementById(`missing-start-${isoDate}`)?.value;
  const endVal   = document.getElementById(`missing-end-${isoDate}`)?.value;
  const project  = document.getElementById(`missing-project-${isoDate}`)?.value?.trim();
  const brk      = parseInt(document.getElementById(`missing-break-${isoDate}`)?.value || '0');
  if (!startVal || !endVal) { showToast('Bitte Start- und Endzeit angeben', 'error'); return; }
  if (!project)             { showToast('Bitte Baustelle/Kunde angeben', 'error'); return; }
  const [sh,sm] = startVal.split(':').map(Number);
  const [eh,em] = endVal.split(':').map(Number);
  const gross   = (eh*60+em) - (sh*60+sm);
  if (gross <= 0) { showToast('⚠ Endzeit muss nach Startzeit liegen', 'error'); return; }
  const record = { id:'work-'+Date.now(), type:'work', date:dateKey, startTime:startVal, endTime:endVal, project, duration:gross/60, breakTime:brk, notes:'' };
  globalLoggedSessionsDatabaseMock.unshift(record);
  persistUserData(); renderHistoricalRecordsSheet(); runGlobalApplicationMetricsEngine(); renderPeriodProgressBar();
  setTimeout(() => {
    const panelId = isHist ? 'missing-days-panel-hist' : 'missing-days-panel';
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.style.display = 'block';
      const chevron = document.getElementById(isHist ? 'missing-chevron-hist' : 'missing-chevron');
      if (chevron) chevron.style.transform = 'rotate(180deg)';
      renderMissingDaysPanel(isHist);
    }
  }, 50);
  showToast(`✓ Eintrag für ${dateKey} gespeichert`, 'success');
  if (navigator.vibrate) navigator.vibrate(40);
}

function logMissingAsSchule(dateKey, isoDate, isHist) {
  const existing = globalLoggedSessionsDatabaseMock.find(r => r.date===dateKey&&(r.type==='schule'||r.type==='work'));
  if (existing) { showToast('⚠ Für diesen Tag existiert bereits ein Eintrag', 'error'); return; }
  const record = { id:'schule-'+Date.now(), type:'schule', date:dateKey, startTime:null, endTime:null, project:'BERUFSSCHULE', duration:0, breakTime:0, notes:'Schultag' };
  globalLoggedSessionsDatabaseMock.unshift(record);
  persistUserData(); renderHistoricalRecordsSheet(); runGlobalApplicationMetricsEngine(); renderPeriodProgressBar();
  setTimeout(() => {
    const panelId = isHist ? 'missing-days-panel-hist' : 'missing-days-panel';
    const panel = document.getElementById(panelId);
    if (panel) { panel.style.display='block'; renderMissingDaysPanel(isHist); }
  }, 50);
  showToast(`✓ Schultag für ${dateKey} gebucht`, 'success');
}

function closeMissingDayForm(isHist) {
  const form = document.getElementById(`missing-day-form-${isHist?'hist':'dash'}`);
  if (form) form.style.display = 'none';
  document.querySelectorAll(`[id^="missing-chip-"]`).forEach(c => {
    c.style.background='rgba(239,68,68,0.06)'; c.style.borderColor='rgba(239,68,68,0.2)'; c.style.color='#ef4444';
  });
}

// ── Feature 5: Quick Stats Strip ─────────────────────────────────────────
function renderQuickStatsStrip() {
  const el = document.getElementById('quick-stats-strip');
  if (!el) return;
  const count = globalLoggedSessionsDatabaseMock.filter(s => s.type==='work').length;
  const net   = globalLoggedSessionsDatabaseMock.reduce((sum,s) => s.type!=='work'?sum:sum+((s.duration||0)-((s.breakTime||0)/60)), 0);
  const avg   = count > 0 ? net / count : 0;
  el.innerHTML = `
    <div style="display:flex;gap:10px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:10px;padding:10px 14px;margin-bottom:14px;flex-wrap:wrap;">
      <span style="font-size:12px;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-calendar-check" style="color:var(--primary-blue);margin-right:4px;"></i>${count} Einträge</span>
      <span style="color:var(--card-border);">|</span>
      <span style="font-size:12px;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-clock" style="color:#10b981;margin-right:4px;"></i>${net.toFixed(2)} hrs</span>
      <span style="color:var(--card-border);">|</span>
      <span style="font-size:12px;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-chart-bar" style="color:#f59e0b;margin-right:4px;"></i>${avg.toFixed(2)} h/Tag Ø</span>
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
  if (attempts >= MAX_ATTEMPTS) { localStorage.setItem(LOGIN_LOCKOUT_KEY, Date.now()+LOCKOUT_MS); localStorage.setItem(LOGIN_ATTEMPTS_KEY, '0'); }
  return attempts;
}
function clearLoginAttempts() { localStorage.removeItem(LOGIN_ATTEMPTS_KEY); localStorage.removeItem(LOGIN_LOCKOUT_KEY); }

// ── Feature 13: Last Login Info ────────────────────────────────────────────
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
      const time = d.toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'});
      el.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="margin-right:6px;color:var(--text-muted);font-size:11px;"></i><span style="font-size:12px;color:var(--text-muted);font-weight:500;">${activeLanguageGlobal==='de'?'Zuletzt angemeldet:':'Last login:'} <strong style="color:var(--dark-slate);">${d.toLocaleDateString(lang,{weekday:'short',day:'2-digit',month:'short'})} ${activeLanguageGlobal==='de'?'um':'at'} ${time}</strong></span>`;
    }
  } catch(e) {}
}

// ── Feature 6: Entry Save Haptic + Sound ─────────────────────────────────
function triggerSaveHaptic() {
  if (navigator.vibrate) navigator.vibrate(40);
  try {
    const ctx=new (window.AudioContext||window.webkitAudioContext)(), osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value=880; osc.type='sine';
    gain.gain.setValueAtTime(0.08,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.12);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.12);
  } catch(e) {}
}

// ── CSS ───────────────────────────────────────────────────────────────────
(function injectFeatureCSS() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes splashIn  { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
    @keyframes splashOut { from{opacity:1;transform:scale(1)}    to{opacity:0;transform:scale(1.03)} }
    @keyframes splashPulse { from{box-shadow:0 0 20px rgba(227,6,19,0.4)} to{box-shadow:0 0 50px rgba(227,6,19,0.8)} }
    @keyframes splashBar  { from{width:0;opacity:0} to{width:48px;opacity:1} }
    @keyframes slideInUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    #live-clock-display { font-variant-numeric: tabular-nums; }
    #missing-days-toggle-btn:hover { background:rgba(239,68,68,0.14)!important; border-color:rgba(239,68,68,0.35)!important; transform:translateY(-1px); }
    .missing-break-pill:hover { background:rgba(227,6,19,0.08)!important; border-color:rgba(227,6,19,0.2)!important; }
    body.dark-mode #missing-days-panel, body.dark-mode #missing-days-panel-hist { border-top-color:rgba(255,255,255,0.06)!important; }
    body.dark-mode #missing-days-panel input, body.dark-mode #missing-days-panel select,
    body.dark-mode #missing-days-panel-hist input, body.dark-mode #missing-days-panel-hist select {
      background:rgba(15,23,42,0.9)!important; border-color:rgba(255,255,255,0.1)!important; color:#f1f5f9!important;
    }
  `;
  document.head.appendChild(style);
})();

// ── Device tracking ────────────────────────────────────────────────────────
let currentDeviceIdGlobal = null;
let deviceListenerUnsub   = null;

async function initializeDeviceTrackingEngine(displayName) {
  const uid = authenticatedUserGlobal;
  if (!uid || typeof db === 'undefined') return;

  // ✅ Wait for Firebase Auth to be fully ready before attaching listener
  await new Promise(resolve => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      unsubAuth();
      resolve(user);
    });
  });

  // If not authenticated after waiting, bail out silently
  if (!auth.currentUser) return;

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

    // ✅ Only attach snapshot listener once auth is confirmed
    if (deviceListenerUnsub) deviceListenerUnsub();
    deviceListenerUnsub = db.collection('userProfiles').doc(uid).onSnapshot(
      doc => {
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
      },
      // ✅ Silently ignore permission errors on the listener — don't crash the app
      err => { console.warn('Profile listener:', err.code); }
    );

    localStorage.setItem('sch_login_'+uid, Date.now().toString());
    renderActiveDevicesList(uid, displayName);

    setInterval(()=>{
      if (!auth.currentUser) return;
      db.collection('userDevices').doc(uid+'_'+currentDeviceIdGlobal)
        .update({lastSeen:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    }, 60000);
  } catch(e) { console.warn('Device tracking:', e); }
}

async function renderActiveDevicesList(uid, displayName) {
  const el = document.getElementById('active-devices-list');
  if (!el || typeof db==='undefined') return;
  const resolvedUid = uid || authenticatedUserGlobal;
  try {
    const snap = await db.collection('userDevices').where('user','==',resolvedUid).orderBy('lastSeen','desc').limit(5).get();
    const lang = activeLanguageGlobal==='en'?'en-GB':'de-DE';
    const devices = [];
    snap.forEach(doc => devices.push(doc.data()));
    el.innerHTML = devices.map(d => {
      const isCurrent = d.deviceId === currentDeviceIdGlobal;
      const t = d.lastSeen && d.lastSeen.toDate ? d.lastSeen.toDate().toLocaleString(lang,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
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
      renderQuickStatsStrip();
      renderPeriodProgressBar();
      updateNavBadge();
    };
  }
});
