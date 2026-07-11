let _trashPurgeInterval = null;

function _showLoadingScreen() {
  if (document.getElementById('_auth_loader')) return;
  const el = document.createElement('div');
  el.id = '_auth_loader';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#03060f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;';
  el.innerHTML = '<div style="width:52px;height:52px;border:3px solid rgba(227,6,19,0.2);border-top-color:#E30613;border-radius:50%;animation:_authSpin 0.75s linear infinite;"></div><div style="font-size:13px;font-weight:700;color:#475569;">Wird geladen…</div><style>@keyframes _authSpin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(el);
}
function _hideLoadingScreen() {
  const el = document.getElementById('_auth_loader');
  if (el) el.remove();
}
function _showEl(id, displayVal) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('app-shell-hidden');
  el.style.display = displayVal || 'block';
}
function _hideEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('app-shell-hidden');
  el.style.display = 'none';
}
function showToast(msg, type) {
  if (typeof showEnhancedToast === 'function') return showEnhancedToast(msg, type || 'success');
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
function showConfirmModal(message, onConfirm) {
  if (confirm(message)) onConfirm();
}
function formatDateDMY(date) {
  return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
}
function isoToDMY(iso) {
  if (!iso) return '';
  if (iso.includes('/')) return iso;
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function dmyToISO(dmy) {
  if (!dmy) return '';
  if (dmy.includes('-')) return dmy;
  const p = dmy.split('/');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : dmy;
}
function parseDMYLocal(dmy) {
  const p = isoToDMY(dmy).split('/').map(Number);
  return new Date(p[2], p[1] - 1, p[0]);
}
function escapeHtml(v) {
  return typeof sanitizeHTML === 'function' ? sanitizeHTML(v) : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function populateLogTimeFormDropdowns() {
  const startEl = document.getElementById('log-start-time');
  const endEl = document.getElementById('log-end-time');
  if (!startEl || !endEl) return;
  let html = '';
  for (let h = 0; h < 24; h++) {
    for (const m of ['00', '15', '30', '45']) {
      const t = String(h).padStart(2, '0') + ':' + m;
      html += `<option value="${t}">${t}</option>`;
    }
  }
  startEl.innerHTML = html;
  endEl.innerHTML = html;
  startEl.value = '07:00';
  endEl.value = '16:15';
}

function initFlatpickrInputs() {
  if (!window.flatpickr) return;
  const commonOpts = {
    dateFormat: 'Y-m-d',
    allowInput: false,
    disableMobile: true,
    clickOpens: true,
    locale: {
      firstDayOfWeek: 1,
      weekdays: {
        shorthand: ['So','Mo','Di','Mi','Do','Fr','Sa'],
        longhand: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
      },
      months: {
        shorthand: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
        longhand: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
      }
    }
  };
  ['log-date-picker','schule-date-picker','vacation-from-date-input','vacation-to-date-input','export-start-date','export-end-date','absence-start','absence-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._flatpickr) flatpickr(el, Object.assign({}, commonOpts, { defaultDate: el.value || null }));
  });
}
function reinitDatePickers() {
  initFlatpickrInputs();
}

function setLeaveManagementType(type) {
  activeLeaveSubManagementType = type === 'sick' ? 'sick' : 'vacation';
  const vacBtn = document.getElementById('toggle-leave-vacation');
  const sickBtn = document.getElementById('toggle-leave-sick');
  const label = document.getElementById('leave-context-label');
  const notes = document.getElementById('vacation-notes-input');
  const submit = document.getElementById('leave-submit-btn');
  if (vacBtn) vacBtn.classList.toggle('active', activeLeaveSubManagementType === 'vacation');
  if (sickBtn) sickBtn.classList.toggle('active', activeLeaveSubManagementType === 'sick');
  if (label) label.textContent = activeLeaveSubManagementType === 'vacation'
    ? (activeLanguageGlobal === 'en' ? 'Reason / Context' : 'Art der Freistellung / Urlaubsgrund')
    : (activeLanguageGlobal === 'en' ? 'Medical Certificate / Clinical Symptoms' : 'Ärztliches Attest / Diagnose');
  if (notes) notes.placeholder = activeLeaveSubManagementType === 'vacation'
    ? (activeLanguageGlobal === 'en' ? 'Vacation / Paid Time Off' : 'Erholungsurlaub gesetzlich/vertraglich')
    : (activeLanguageGlobal === 'en' ? 'Sick Leave Day' : 'Krankmeldung mit/ohne Entgeltfortzahlung');
  if (submit) submit.textContent = activeLeaveSubManagementType === 'vacation'
    ? (activeLanguageGlobal === 'en' ? 'Log Vacation' : 'Urlaubszeit einbuchen')
    : (activeLanguageGlobal === 'en' ? 'Register Sick Leave' : 'Arbeitsunfähigkeit registrieren');
}

function selectBreakOption(minutes, btn) {
  activeSelectedFormBreakDuration = minutes;
  document.querySelectorAll('.break-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (typeof saveDraftWorkEntry === 'function') saveDraftWorkEntry();
}

function calculateGrossHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function handleNewRecordSubmission(e) {
  e.preventDefault();
  const date = isoToDMY(document.getElementById('log-date-picker')?.value);
  const project = document.getElementById('log-project-name')?.value.trim();
  const startTime = document.getElementById('log-start-time')?.value;
  const endTime = document.getElementById('log-end-time')?.value;
  const notes = document.getElementById('log-notes')?.value.trim() || '';
  if (!date || !project || !startTime || !endTime) return showToast('Bitte alle Pflichtfelder ausfüllen.', 'error');
  const duration = calculateGrossHours(startTime, endTime);
  if (duration <= 0) return showToast('Endzeit muss nach Startzeit liegen.', 'error');

  globalLoggedSessionsDatabaseMock.unshift({
    id: 'work-' + Date.now(),
    type: 'work',
    date,
    startTime,
    endTime,
    project,
    duration,
    breakTime: activeSelectedFormBreakDuration,
    notes
  });

  document.getElementById('shift-submission-form')?.reset();
  document.getElementById('log-date-picker').value = new Date().toISOString().split('T')[0];
  populateLogTimeFormDropdowns();
  activeSelectedFormBreakDuration = 0;
  document.querySelectorAll('.break-pill').forEach((p, i) => p.classList.toggle('active', i === 0));
  if (typeof clearDraftWorkEntry === 'function') clearDraftWorkEntry();
  persistUserData();
  runGlobalApplicationMetricsEngine();
  renderHistoricalRecordsSheet();
  showToast('✓ Eintrag gespeichert', 'success');
}

function handleSchuleSubmission() {
  const date = isoToDMY(document.getElementById('schule-date-picker')?.value);
  if (!date) return showToast('Bitte Datum auswählen.', 'error');
  globalLoggedSessionsDatabaseMock.unshift({
    id: 'schule-' + Date.now(),
    type: 'schule',
    date,
    startTime: null,
    endTime: null,
    project: 'BERUFSSCHULE',
    duration: 0,
    breakTime: 0,
    notes: 'Schultag'
  });
  persistUserData();
  runGlobalApplicationMetricsEngine();
  renderHistoricalRecordsSheet();
  showToast('✓ Schultag gebucht', 'success');
}

function handleVacationDayLogSubmission(e) {
  e.preventDefault();
  const fromVal = document.getElementById('vacation-from-date-input')?.value;
  const toVal = document.getElementById('vacation-to-date-input')?.value;
  const notes = document.getElementById('vacation-notes-input')?.value.trim();
  if (!fromVal || !toVal || !notes) return showToast('Bitte alle Felder ausfüllen.', 'error');

  let cur = new Date(fromVal);
  const end = new Date(toVal);
  if (cur > end) return showToast('Bis-Datum muss nach Von-Datum liegen.', 'error');

  while (cur <= end) {
    const wd = cur.getDay();
    if (wd >= 1 && wd <= 5) {
      vacationLoggedDaysArrayCache.unshift({
        id: 'leave-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        type: activeLeaveSubManagementType,
        date: formatDateDMY(cur),
        notes
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  document.getElementById('vacation-entry-form')?.reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('vacation-from-date-input').value = today;
  document.getElementById('vacation-to-date-input').value = today;
  persistUserData();
  runGlobalApplicationMetricsEngine();
  renderVacationRecordsSheet();
  showToast('✓ Fehlzeit gespeichert', 'success');
}

function renderHistoricalRecordsSheet() {
  const container = document.getElementById('history-items-container');
  if (!container) return;
  const entries = [...(globalLoggedSessionsDatabaseMock || [])].sort((a, b) => parseDMYLocal(b.date) - parseDMYLocal(a.date));
  if (!entries.length) {
    container.innerHTML = `<div class="history-item"><div class="item-main-row"><div class="hist-left"><h5>Keine Einträge vorhanden.</h5><p>Neue Arbeitszeiten erscheinen hier.</p></div></div></div>`;
    return;
  }
  container.innerHTML = entries.map(r => {
    const isSchool = r.type === 'schule';
    const net = isSchool ? 0 : Math.max(0, (r.duration || 0) - ((r.breakTime || 0) / 60));
    return `<div class="history-item">
      <div class="item-main-row">
        <div class="hist-left">
          <h5>${escapeHtml(r.date)} · ${escapeHtml(isSchool ? 'BERUFSSCHULE' : (r.project || '-'))}</h5>
          <p>${isSchool ? 'Schultag' : `${escapeHtml(r.startTime || '-')} – ${escapeHtml(r.endTime || '-')} · Pause ${r.breakTime || 0} min`}</p>
          ${r.notes ? `<p>${escapeHtml(r.notes)}</p>` : ''}
        </div>
        <div class="hist-right">
          ${isSchool ? '🎓' : net.toFixed(2) + ' hrs'}
          <button class="action-icon-btn delete-hover" onclick="deleteWorkRecord('${r.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderVacationRecordsSheet() {
  const container = document.getElementById('vacation-days-list-container');
  if (!container) return;
  const entries = [...(vacationLoggedDaysArrayCache || [])].sort((a, b) => parseDMYLocal(b.date) - parseDMYLocal(a.date));
  if (!entries.length) {
    container.innerHTML = `<div class="history-item"><div class="hist-left"><h5>Keine Urlaubs- oder Krankheitsdaten.</h5></div></div>`;
    return;
  }
  container.innerHTML = entries.map(r => `<div class="history-item" style="border-left-color:${r.type === 'sick' ? '#ef4444' : '#3b82f6'};">
    <div class="item-main-row">
      <div class="hist-left">
        <h5>${escapeHtml(r.date)} · ${r.type === 'sick' ? 'KRANKMELDUNG' : 'URLAUB'}</h5>
        <p>${escapeHtml(r.notes || '-')}</p>
      </div>
      <div class="hist-right">1 Tag <button class="action-icon-btn delete-hover" onclick="deleteLeaveRecord('${r.id}')"><i class="fa-solid fa-trash"></i></button></div>
    </div>
  </div>`).join('');
}

function renderRecentlyDeletedBinSheet() {
  const container = document.getElementById('deleted-items-bin-container');
  if (!container) return;
  if (!recentlyDeletedItemsBinCache.length) {
    container.innerHTML = `<div class="history-item"><div class="hist-left"><h5>Papierkorb ist leer.</h5></div></div>`;
    return;
  }
  container.innerHTML = recentlyDeletedItemsBinCache.map(item => `<div class="history-item">
    <div class="item-main-row">
      <div class="hist-left"><h5>${escapeHtml(item.date || '-')} · ${escapeHtml(item.project || item.notes || item.type || '-')}</h5><p>Gelöscht</p></div>
      <button class="restore-btn" onclick="restoreDeletedItem('${item.id}')">Wiederherstellen</button>
    </div>
  </div>`).join('');
}

function deleteWorkRecord(id) {
  const idx = globalLoggedSessionsDatabaseMock.findIndex(r => r.id === id);
  if (idx < 0) return;
  const item = globalLoggedSessionsDatabaseMock.splice(idx, 1)[0];
  recentlyDeletedItemsBinCache.unshift(Object.assign({}, item, { deletedAt: Date.now(), source: 'work' }));
  persistUserData();
  runGlobalApplicationMetricsEngine();
  renderHistoricalRecordsSheet();
  renderRecentlyDeletedBinSheet();
  showToast('Eintrag gelöscht');
}
function deleteLeaveRecord(id) {
  const idx = vacationLoggedDaysArrayCache.findIndex(r => r.id === id);
  if (idx < 0) return;
  const item = vacationLoggedDaysArrayCache.splice(idx, 1)[0];
  recentlyDeletedItemsBinCache.unshift(Object.assign({}, item, { deletedAt: Date.now(), source: 'leave' }));
  persistUserData();
  runGlobalApplicationMetricsEngine();
  renderVacationRecordsSheet();
  renderRecentlyDeletedBinSheet();
  showToast('Eintrag gelöscht');
}
function restoreDeletedItem(id) {
  const idx = recentlyDeletedItemsBinCache.findIndex(r => r.id === id);
  if (idx < 0) return;
  const item = recentlyDeletedItemsBinCache.splice(idx, 1)[0];
  if (item.source === 'leave' || item.type === 'vacation' || item.type === 'sick') vacationLoggedDaysArrayCache.unshift(item);
  else globalLoggedSessionsDatabaseMock.unshift(item);
  persistUserData();
  runGlobalApplicationMetricsEngine();
  renderHistoricalRecordsSheet();
  renderVacationRecordsSheet();
  renderRecentlyDeletedBinSheet();
}

function getWeekMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function renderWeeklyChart() {
  const dash = document.getElementById('view-dashboard');
  if (!dash) return;

  let card = document.getElementById('weekly-chart-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'weekly-chart-card';
    const progress = document.getElementById('period-progress-container');
    const title = document.getElementById('lbl-dash-title');
    const parent = progress?.parentNode || title?.parentNode || dash.querySelector('.panel-scroll-content') || dash;
    if (progress && progress.parentNode === parent) {
      const next = progress.nextSibling;
      if (next && next.parentNode === parent) parent.insertBefore(card, next);
      else parent.appendChild(card);
    } else if (title && title.parentNode === parent) {
      parent.insertBefore(card, title);
    } else {
      parent.appendChild(card);
    }
  }

  const monday = getWeekMonday(new Date());
  const todayKey = formatDateDMY(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const dayData = days.map(d => {
    const key = formatDateDMY(d);
    const entries = (globalLoggedSessionsDatabaseMock || []).filter(r => r.date === key);
    const hrs = entries.reduce((sum, r) => {
      if (r.type !== 'work') return sum;
      return sum + Math.max(0, (r.duration || 0) - ((r.breakTime || 0) / 60));
    }, 0);
    return { date: d, key, entries, hrs };
  });

  const weekTotal = dayData.reduce((sum, d) => sum + d.hrs, 0);
  const maxHrs = Math.max(8.5, ...dayData.map(d => d.hrs));
  const labels = activeLanguageGlobal === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div>
        <div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;">
          <i class="fa-solid fa-chart-column" style="color:var(--primary-blue);margin-right:6px;"></i>
          ${activeLanguageGlobal === 'en' ? 'Weekly overview' : 'Klickbare Wochenübersicht'}
        </div>
        <div style="font-size:18px;font-weight:900;color:var(--text-main);margin-top:3px;">KW ${getISOWeekNumber(new Date())}</div>
      </div>
      <div style="font-size:13px;font-weight:900;color:var(--primary-blue);background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.2);padding:6px 12px;border-radius:999px;">
        ${weekTotal.toFixed(2)} h
      </div>
    </div>
    <div class="chart-bars-wrapper">
      ${dayData.map((d, i) => {
        const height = Math.max(3, Math.round((d.hrs / maxHrs) * 92));
        const isToday = d.key === todayKey;
        const color = isToday ? '#E30613' : (d.hrs > 8.5 ? '#f59e0b' : '#0ea5e9');
        return `
          <div class="chart-bar-col ${isToday ? 'selected' : ''}" onclick="renderWeeklyDayDetail('${d.key}')">
            <div class="chart-bar-val">${d.hrs ? d.hrs.toFixed(1) : ''}</div>
            <div class="chart-bar" style="height:${height}%;background:${color};opacity:${d.hrs ? 1 : 0.25};"></div>
            <div class="chart-bar-label" style="${isToday ? 'color:#E30613;font-weight:900;' : ''}">${labels[i]}</div>
          </div>`;
      }).join('')}
    </div>
    <div id="weekly-day-detail"></div>
  `;

  renderWeeklyDayDetail(todayKey, true);
}
function renderWeeklyDayDetail(dateKey, silent) {
  const detail = document.getElementById('weekly-day-detail');
  if (!detail) return;

  document.querySelectorAll('.chart-bar-col').forEach(col => col.classList.remove('selected'));

  const d = parseDMYLocal(dateKey);
  const entries = (globalLoggedSessionsDatabaseMock || []).filter(r => r.date === dateKey);
  const total = entries.reduce((sum, r) => {
    if (r.type !== 'work') return sum;
    return sum + Math.max(0, (r.duration || 0) - ((r.breakTime || 0) / 60));
  }, 0);

  const label = d.toLocaleDateString(activeLanguageGlobal === 'en' ? 'en-GB' : 'de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'short'
  });

  if (!entries.length) {
    detail.innerHTML = `
      <div class="wdd-header">
        <div class="wdd-date-badge"><span class="wdd-date-dot" style="background:#94a3b8;"></span><span class="wdd-date-label">${escapeHtml(label)}</span></div>
        <button class="wdd-close" onclick="closeWeeklyDayDetail()">×</button>
      </div>
      <div class="wdd-empty">${activeLanguageGlobal === 'en' ? 'No entries for this day.' : 'Keine Einträge für diesen Tag.'}</div>`;
    return;
  }

  detail.innerHTML = `
    <div class="wdd-header">
      <div class="wdd-date-badge"><span class="wdd-date-dot" style="background:var(--primary-blue);"></span><span class="wdd-date-label">${escapeHtml(label)}</span></div>
      <div style="display:flex;align-items:center;gap:8px;"><span class="wdd-total">${total.toFixed(2)} h</span><button class="wdd-close" onclick="closeWeeklyDayDetail()">×</button></div>
    </div>
    ${entries.map(r => {
      const isSchool = r.type === 'schule';
      const net = isSchool ? 0 : Math.max(0, (r.duration || 0) - ((r.breakTime || 0) / 60));
      return `
        <div class="wdd-entry">
          <div class="wdd-entry-icon" style="background:${isSchool ? 'rgba(14,165,233,0.1)' : 'rgba(227,6,19,0.08)'};color:${isSchool ? '#0ea5e9' : '#E30613'};">
            <i class="fa-solid ${isSchool ? 'fa-graduation-cap' : 'fa-helmet-safety'}"></i>
          </div>
          <div class="wdd-entry-body">
            <div class="wdd-entry-project">${escapeHtml(isSchool ? 'BERUFSSCHULE' : (r.project || '-'))}</div>
            <div class="wdd-entry-meta">${isSchool ? 'Schultag' : `${escapeHtml(r.startTime || '-')} – ${escapeHtml(r.endTime || '-')} · ${r.breakTime || 0} min Pause`}</div>
          </div>
          <div class="wdd-entry-hrs">${isSchool ? '🎓' : net.toFixed(2) + ' h'}</div>
        </div>`;
    }).join('')}
  `;
}
function closeWeeklyDayDetail() {
  const detail = document.getElementById('weekly-day-detail');
  if (detail) detail.innerHTML = '';
}

function runGlobalApplicationMetricsEngine() {
  dailyWorkTimeBreakdownLogs = {};
  dailyOvertimeBreakdownLogs = {};
  let totalNet = 0;
  let totalOt = 0;
  const target = parseFloat(document.getElementById('shift-target-constraint')?.value) || 8.5;

  (globalLoggedSessionsDatabaseMock || []).forEach(r => {
    if (r.type !== 'work') return;
    const net = Math.max(0, (r.duration || 0) - ((r.breakTime || 0) / 60));
    totalNet += net;
    dailyWorkTimeBreakdownLogs[r.date] = (dailyWorkTimeBreakdownLogs[r.date] || 0) + net;
  });

  Object.entries(dailyWorkTimeBreakdownLogs).forEach(([date, hrs]) => {
    const wd = parseDMYLocal(date).getDay();
    const soll = wd === 5 ? 6 : (wd === 0 || wd === 6 ? 0 : target);
    const ot = soll > 0 ? hrs - soll : 0;
    dailyOvertimeBreakdownLogs[date] = ot;
    totalOt += ot;
  });

  const grossEl = document.getElementById('dash-gross-hours');
  const otEl = document.getElementById('dash-overtime-hours');
  if (grossEl) grossEl.textContent = totalNet.toFixed(2) + ' hrs';
  if (otEl) {
    otEl.textContent = (totalOt >= 0 ? '+' : '') + totalOt.toFixed(2) + ' hrs';
    otEl.style.color = totalOt >= 0 ? '#10b981' : '#ef4444';
  }

  if (typeof renderPeriodProgressBar === 'function') renderPeriodProgressBar();
  if (typeof injectStreakCard === 'function') injectStreakCard();
  renderWeeklyChart();
  if (typeof updateNavBadge === 'function') updateNavBadge();
  if (typeof renderQuickStatsStrip === 'function') renderQuickStatsStrip();
}

function displayWorkTimeBreakdownSummary() {
  const rows = Object.entries(dailyWorkTimeBreakdownLogs).map(([d, h]) => `<div class="modal-report-row"><span>${d}</span><strong>${h.toFixed(2)} h</strong></div>`).join('') || '<p>Keine Arbeitsstunden erfasst.</p>';
  openReportModal('Netto-Arbeitszeit', rows, 'fa-clock');
}
function displayOvertimeBreakdownSummary() {
  const rows = Object.entries(dailyOvertimeBreakdownLogs).map(([d, h]) => `<div class="modal-report-row"><span>${d}</span><strong style="color:${h >= 0 ? '#10b981' : '#ef4444'}">${h >= 0 ? '+' : ''}${h.toFixed(2)} h</strong></div>`).join('') || '<p>Keine Überstunden im aktuellen Zeitraum.</p>';
  openReportModal('Überstunden', rows, 'fa-chart-line');
}
function displayLeaveStatementBalancesSummary() {
  const allowed = parseFloat(document.getElementById('vacation-allowed-bank')?.value) || 30;
  const vac = vacationLoggedDaysArrayCache.filter(r => r.type === 'vacation').length;
  const sick = vacationLoggedDaysArrayCache.filter(r => r.type === 'sick').length;
  openReportModal('Urlaub & Fehlzeiten', `<div class="statement-summary-box"><div><span>Jahresanspruch:</span><strong>${allowed} Tage</strong></div><div><span>Genommene Tage:</span><strong>${vac}</strong></div><div><span>Resturlaub:</span><strong>${(allowed - vac).toFixed(0)}</strong></div><div><span>Kranktage gesamt:</span><strong>${sick}</strong></div></div>`, 'fa-umbrella-beach');
}
function openReportModal(title, html, icon) {
  const backdrop = document.getElementById('custom-report-modal-backdrop');
  const titleEl = document.getElementById('custom-modal-title-header');
  const iconEl = document.getElementById('custom-modal-icon-header');
  const body = document.getElementById('modal-report-content-body');
  if (titleEl) titleEl.textContent = title;
  if (iconEl) iconEl.className = 'fa-solid ' + icon;
  if (body) body.innerHTML = html;
  if (backdrop) backdrop.classList.add('show');
}
function closeCustomReportModal() {
  document.getElementById('custom-report-modal-backdrop')?.classList.remove('show');
}

function switchActiveView(viewName, navEl) {
  document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('view-' + viewName);
  if (panel) panel.classList.add('active');
  document.querySelectorAll('.drawer-nav-list .nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  toggleSidebarDrawer(false);
  if (viewName === 'dashboard') renderWeeklyChart();
  if (viewName === 'history') renderHistoricalRecordsSheet();
  if (viewName === 'vacation') renderVacationRecordsSheet();
  if (viewName === 'deleted') renderRecentlyDeletedBinSheet();
  if (viewName === 'ai-scan' && typeof initAiKeyUI === 'function') initAiKeyUI();
  setTimeout(initFlatpickrInputs, 0);
}
function toggleSidebarDrawer(open) {
  document.getElementById('sidebar-drawer')?.classList.toggle('open', !!open);
  document.getElementById('menu-backdrop')?.classList.toggle('show', !!open);
}
function openHiddenTrashView() {
  switchActiveView('deleted', null);
}

function updateCloudBackupStatusIndicator() {
  const dot = document.getElementById('dash-backup-indicator');
  if (!dot) return;
  dot.classList.toggle('online', navigator.onLine);
  dot.classList.toggle('offline', !navigator.onLine);
}

function showProjectSuggestions(value) {
  const list = document.getElementById('project-autocomplete-list');
  if (!list) return;
  const q = String(value || '').toLowerCase();
  const projects = [...new Set((globalLoggedSessionsDatabaseMock || []).map(r => r.project).filter(Boolean))]
    .filter(p => p.toLowerCase().includes(q)).slice(0, 8);
  if (!q || !projects.length) {
    list.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  list.innerHTML = projects.map(p => `<div class="autocomplete-item" onclick="selectProjectSuggestion('${escapeHtml(p).replace(/'/g, "\\'")}')"><i class="fa-solid fa-location-dot"></i>${escapeHtml(p)}</div>`).join('');
  list.style.display = 'block';
}
function selectProjectSuggestion(project) {
  const input = document.getElementById('log-project-name');
  if (input) input.value = project;
  hideProjectSuggestions();
}
function hideProjectSuggestions() {
  const list = document.getElementById('project-autocomplete-list');
  if (list) list.style.display = 'none';
}

async function launchSessionUI() {
  _hideEl('landing-page');
  _hideEl('login-view');
  _showEl('app-view', 'block');
  document.body.classList.remove('admin-mode');

  const display = localStorage.getItem('schuermann_current_user') || authenticatedUserGlobal || 'User';
  document.getElementById('user-profile-title').textContent = display;
  document.getElementById('dash-profile-username').textContent = display;

  await loadUserDataFromCloud();
  restoreDraftWorkEntry();
  runGlobalApplicationMetricsEngine();
  renderHistoricalRecordsSheet();
  renderVacationRecordsSheet();
  renderRecentlyDeletedBinSheet();
  if (typeof renderLastLoginInfo === 'function') renderLastLoginInfo();
  if (typeof startLiveClock === 'function') startLiveClock();
  initFlatpickrInputs();
  if (typeof initializeDeviceTrackingEngine === 'function') initializeDeviceTrackingEngine(display);
  _hideLoadingScreen();

  if (typeof showWelcomeSplash === 'function') showWelcomeSplash(display);
}

async function _waitForFirebaseAuth(uid) {
  try {
    await new Promise(resolve => {
      const unsub = auth.onAuthStateChanged(user => {
        unsub();
        resolve(user);
      });
    });
    const cachedRole = localStorage.getItem('schuermann_auth_role') || 'user';
    authenticatedUserRoleGlobal = cachedRole;
    if (cachedRole === 'admin') {
      _hideEl('landing-page');
      _hideEl('app-view');
      _showEl('admin-full-view', 'block');
      document.body.classList.add('admin-mode');
      _hideLoadingScreen();
      if (typeof launchAdminDashboard === 'function') launchAdminDashboard();
    } else {
      await launchSessionUI();
    }
  } catch (e) {
    console.error(e);
    _hideLoadingScreen();
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const rawName = document.getElementById('username')?.value.trim().replace(/\s+/g, ' ');
  const code = document.getElementById('passcode')?.value.trim();
  const msg = document.getElementById('message-box');
  if (!rawName || !code) return;
  try {
    const loginKey = rawName.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/gi,'');
    const cred = await auth.signInWithEmailAndPassword(loginKey + '@sch.local', code);
    authenticatedUserGlobal = cred.user.uid;
    let displayName = rawName;
    let isAdmin = false;
    const snap = await db.collection('userProfiles').doc(cred.user.uid).get();
    if (snap.exists) {
      displayName = snap.data().name || displayName;
      isAdmin = snap.data().isAdmin === true;
    }
    authenticatedUserRoleGlobal = isAdmin ? 'admin' : 'user';
    localStorage.setItem('schuermann_auth_user', cred.user.uid);
    localStorage.setItem('schuermann_auth_role', authenticatedUserRoleGlobal);
    localStorage.setItem('schuermann_current_user', displayName);
    if (msg) { msg.textContent = 'Willkommen!'; msg.className = 'message success'; }
    launchSessionUI();
  } catch (err) {
    if (msg) { msg.textContent = 'Mitarbeiter nicht gefunden oder falsches Kennwort.'; msg.className = 'message error'; }
  }
}

function handleSecureSignOutRequest() {
  showConfirmModal(activeLanguageGlobal === 'de' ? 'Wirklich abmelden?' : 'Sign out?', () => {
    auth.signOut().catch(() => {});
    localStorage.removeItem('schuermann_auth_user');
    localStorage.removeItem('schuermann_auth_role');
    authenticatedUserGlobal = '';
    authenticatedUserRoleGlobal = 'user';
    _hideEl('app-view');
    _hideEl('admin-full-view');
    _hideEl('login-view');
    document.body.classList.remove('admin-mode');
    const lp = document.getElementById('landing-page');
    if (lp) { lp.classList.remove('app-shell-hidden'); lp.style.display = 'block'; }
  });
}

async function handlePasswordChange() {
  const cur = document.getElementById('pin-current')?.value;
  const nw = document.getElementById('pin-new')?.value;
  const conf = document.getElementById('pin-confirm')?.value;
  const msg = document.getElementById('pin-change-msg');
  if (!cur || !nw || !conf) { if (msg) { msg.style.color = '#ef4444'; msg.textContent = 'Alle Felder ausfüllen.'; } return; }
  if (nw !== conf) { if (msg) { msg.style.color = '#ef4444'; msg.textContent = 'Kennwörter stimmen nicht überein.'; } return; }
  try {
    const user = auth.currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, cur);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(nw);
    if (msg) { msg.style.color = '#10b981'; msg.textContent = '✓ Kennwort geändert.'; }
  } catch (e) {
    if (msg) { msg.style.color = '#ef4444'; msg.textContent = 'Fehler beim Ändern.'; }
  }
}

function handleFeedbackSubmissionEngine(e) {
  e.preventDefault();
  const box = document.getElementById('feedback-status-box');
  const msg = document.getElementById('feedback-message');
  if (box) { box.textContent = '✓ Feedback gesendet.'; box.className = 'message success'; }
  if (msg) msg.value = '';
}

function enforceTrashLifespanPurgeEngine() {
  const before = recentlyDeletedItemsBinCache.length;
  recentlyDeletedItemsBinCache = recentlyDeletedItemsBinCache.filter(r => Date.now() - (r.deletedAt || Date.now()) < 12 * 60 * 60 * 1000);
  if (before !== recentlyDeletedItemsBinCache.length) {
    persistUserData();
    renderRecentlyDeletedBinSheet();
  }
}

window.addEventListener('DOMContentLoaded', function() {
  populateLogTimeFormDropdowns();

  const today = new Date().toISOString().split('T')[0];
  ['log-date-picker', 'vacation-from-date-input', 'vacation-to-date-input', 'schule-date-picker'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });

  if (typeof getDefault20to20Period === 'function') {
    const def = getDefault20to20Period();
    const startInput = document.getElementById('export-start-date');
    const endInput = document.getElementById('export-end-date');
    if (startInput && endInput) {
      startInput.value = new Date(def.start.getTime() - def.start.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      endInput.value = new Date(def.end.getTime() - def.end.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    }
  }

  initFlatpickrInputs();
  setApplicationLanguage('de');
  setLeaveManagementType(activeLeaveSubManagementType);

  document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
  document.getElementById('log-date-picker')?.addEventListener('change', saveDraftWorkEntry);

  _trashPurgeInterval = setInterval(enforceTrashLifespanPurgeEngine, 60000);
  window.addEventListener('online', updateCloudBackupStatusIndicator);
  window.addEventListener('offline', updateCloudBackupStatusIndicator);
  updateCloudBackupStatusIndicator();

  ['log-project-name','log-start-time','log-end-time','log-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', saveDraftWorkEntry);
      el.addEventListener('change', saveDraftWorkEntry);
    }
  });

  window.addEventListener('online', flushOfflineQueue);
  window.addEventListener('online', updateOfflineBadge);
  window.addEventListener('offline', updateOfflineBadge);
  updateOfflineBadge();

  const cached = localStorage.getItem('schuermann_auth_user');
  if (!cached) return;
  _hideEl('landing-page');
  _showLoadingScreen();
  authenticatedUserGlobal = cached;
  _waitForFirebaseAuth(cached);
});
