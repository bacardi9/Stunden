window.addEventListener('DOMContentLoaded', () => {
  populateLogTimeFormDropdowns();
  setApplicationLanguage('de');
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('log-date-picker').value       = today;
  document.getElementById('vacation-from-date-input').value = today;
  document.getElementById('vacation-to-date-input').value   = today;
  document.getElementById('schule-date-picker').value    = today;

  const def = getDefault20to20Period();
  const startInput = document.getElementById('export-start-date');
  const endInput   = document.getElementById('export-end-date');
  if (startInput && endInput) {
    startInput.value = new Date(def.start.getTime() - def.start.getTimezoneOffset()*60000).toISOString().split('T')[0];
    endInput.value   = new Date(def.end.getTime()   - def.end.getTimezoneOffset()*60000).toISOString().split('T')[0];
  }

  // ── Init ALL flatpickr date pickers ─────────────────────────────
  if (window.flatpickr) {
    const commonOpts = {
      dateFormat: 'Y-m-d',
      allowInput: false,
      disableMobile: true, // force flatpickr on mobile too, no native picker
      locale: {
        firstDayOfWeek: 1,
        weekdays: {
          shorthand: ['So','Mo','Di','Mi','Do','Fr','Sa'],
          longhand:  ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
        },
        months: {
          shorthand: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
          longhand:  ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
        }
      }
    };

    // Log work date
    flatpickr('#log-date-picker', {
      ...commonOpts,
      defaultDate: today,
      onChange: () => {
        document.getElementById('log-start-time').value = '07:00';
        document.getElementById('log-end-time').value   = '16:15';
        document.querySelectorAll('.break-pill').forEach(p => p.classList.remove('active'));
        document.querySelector('.break-pill').classList.add('active');
        activeSelectedFormBreakDuration = 0;
        saveDraftWorkEntry();
      }
    });

    // Schule date
    flatpickr('#schule-date-picker', { ...commonOpts, defaultDate: today });

    // Vacation from/to
    flatpickr('#vacation-from-date-input', { ...commonOpts, defaultDate: today });
    flatpickr('#vacation-to-date-input',   { ...commonOpts, defaultDate: today });

    // Export range
    flatpickr('#export-start-date', { ...commonOpts });
    flatpickr('#export-end-date',   { ...commonOpts });

    // Admin absence dates (dark theme)
    const adminOpts = {
      ...commonOpts,
      dateFormat: 'Y-m-d',
    };
    flatpickr('#absence-start', adminOpts);
    flatpickr('#absence-end',   adminOpts);
  }

  // Make the whole form-group block clickable to open flatpickr
  document.querySelectorAll('.form-group').forEach(group => {
    const fp = group.querySelector('input._flatpickr, input[data-input]');
    if (!fp || !fp._flatpickr) {
      // Try finding by checking if flatpickr instance exists on the input
      const inp = group.querySelector('input[type="date"], input[type="text"][readonly]');
      if (inp && inp._flatpickr) {
        group.style.cursor = 'pointer';
        group.addEventListener('click', (e) => {
          if (e.target === inp) return; // let flatpickr handle direct clicks
          inp._flatpickr.open();
        });
      }
    }
  });

  document.getElementById('log-date-picker').addEventListener('change', saveDraftWorkEntry);

  setInterval(enforceTrashLifespanPurgeEngine, 60000);
  window.addEventListener('online',  updateCloudBackupStatusIndicator);
  window.addEventListener('offline', updateCloudBackupStatusIndicator);
  updateCloudBackupStatusIndicator();

  ['log-project-name','log-start-time','log-end-time','log-notes'].forEach(id => {
    document.getElementById(id)?.addEventListener('input',  saveDraftWorkEntry);
    document.getElementById(id)?.addEventListener('change', saveDraftWorkEntry);
  });

  // Auto-restore session
  const cached = localStorage.getItem('schuermann_auth_user');
  if (cached) {
    authenticatedUserGlobal = cached;
    (async () => {
      try {
        const snap = await db.collection('userProfiles').doc(cached).get();
        const profileData = snap.exists ? snap.data() : {};
        authenticatedUserRoleGlobal = profileData.isAdmin === true ? 'admin' : 'user';
        localStorage.setItem('schuermann_auth_role', authenticatedUserRoleGlobal);
      } catch(e) {
        authenticatedUserRoleGlobal = 'user';
      }
      launchSessionUI();
    })();
  }

  window.addEventListener('online',  flushOfflineQueue);
  window.addEventListener('online',  updateOfflineBadge);
  window.addEventListener('offline', updateOfflineBadge);
  updateOfflineBadge();
});

// ── After launchSessionUI re-init flatpickr on dynamic elements ──────────
function reinitDatePickers() {
  if (!window.flatpickr) return;
  const commonOpts = {
    dateFormat: 'Y-m-d',
    allowInput: false,
    disableMobile: true,
    locale: {
      firstDayOfWeek: 1,
      weekdays: {
        shorthand: ['So','Mo','Di','Mi','Do','Fr','Sa'],
        longhand:  ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
      },
      months: {
        shorthand: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
        longhand:  ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
      }
    }
  };
  const ids = ['log-date-picker','schule-date-picker','vacation-from-date-input',
               'vacation-to-date-input','export-start-date','export-end-date'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._flatpickr) flatpickr(el, commonOpts);
  });

  // Make all .form-group blocks with a date input open calendar on click
  setTimeout(() => {
    document.querySelectorAll('.form-group').forEach(group => {
      const inp = group.querySelector('input[type="date"], input[readonly]');
      if (inp && inp._flatpickr && !group.dataset.fpClick) {
        group.dataset.fpClick = '1';
        group.style.cursor = 'pointer';
        group.addEventListener('click', (e) => {
          if (e.target.tagName === 'LABEL') { inp._flatpickr.open(); return; }
          if (e.target === inp) return;
          inp._flatpickr.open();
        });
      }
    });
  }, 300);
}

function showToast(msg, type = 'success') {
  const toast  = document.getElementById('toast-notification');
  const icons  = { success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info' };
  const colors = { success:'#10b981', error:'#ef4444', info:'#3b82f6' };
  toast.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]};font-size:16px;"></i> ${msg}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const rawName   = document.getElementById('username').value.trim().replace(/\s+/g, ' ');
  const codeInput = document.getElementById('passcode').value.trim();
  const msgBox    = document.getElementById('message-box');

  msgBox.textContent = activeLanguageGlobal === 'de' ? 'Verbindung wird hergestellt...' : 'Connecting...';
  msgBox.className = 'message success';

  try {
    const loginKey = rawName.toLowerCase()
      .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
      .replace(/[^a-z0-9]/gi,'');

    if (!loginKey) throw new Error('empty-name');

    const email = loginKey + '@sch.local';
    const cred  = await auth.signInWithEmailAndPassword(email, codeInput);

    authenticatedUserGlobal = cred.user.uid;

    const displayName = rawName.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    let isAdminFlag = false;
    try {
      const profileSnap = await db.collection('userProfiles').doc(cred.user.uid).get();
      if (profileSnap.exists) isAdminFlag = profileSnap.data().isAdmin === true;
    } catch(e) { isAdminFlag = false; }

    authenticatedUserRoleGlobal = isAdminFlag ? 'admin' : 'user';
    localStorage.setItem('schuermann_auth_user',    authenticatedUserGlobal);
    localStorage.setItem('schuermann_auth_role',    authenticatedUserRoleGlobal);
    localStorage.setItem('schuermann_current_user', displayName);

    await db.collection('userProfiles').doc(cred.user.uid).set({
      name:      displayName,
      uid:       cred.user.uid,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    msgBox.textContent = activeLanguageGlobal === 'de'
      ? `Willkommen zurück, ${displayName}!`
      : `Welcome back, ${displayName}!`;
    msgBox.className = 'message success';
    setTimeout(() => launchSessionUI(), 500);

  } catch (err) {
    console.error(err);
    msgBox.innerHTML = activeLanguageGlobal === 'de'
      ? `Mitarbeiter nicht gefunden oder falsches Kennwort.<br><span style="font-size:11px;color:#aaa;font-weight:normal;">Groß-/Kleinschreibung beachten!</span>`
      : `Invalid name or password.<br><span style="font-size:11px;color:#aaa;font-weight:normal;">Check case sensitivity!</span>`;
    msgBox.className = 'message error';
  }
}

async function launchSessionUI() {
  document.getElementById('login-view').style.display = 'none';
  if (authenticatedUserRoleGlobal === 'admin') {
    document.getElementById('app-view').style.display        = 'none';
    document.getElementById('admin-full-view').style.display = 'block';
    document.getElementById('admin-user-display').textContent = localStorage.getItem('schuermann_current_user') || 'Admin';
    document.body.classList.add('admin-mode');
    launchAdminDashboard();
    return;
  }
  document.getElementById('admin-full-view').style.display = 'none';
  document.body.classList.remove('admin-mode');
  document.getElementById('app-view').style.display = 'block';
  const displayName = localStorage.getItem('schuermann_current_user') || authenticatedUserGlobal;
  document.getElementById('user-profile-title').textContent    = displayName;
  document.getElementById('dash-profile-username').textContent = displayName;
  document.getElementById('nav-admin-link').style.display      = 'none';
  setApplicationLanguage(activeLanguageGlobal);
  await loadUserDataFromCloud();
  renderHistoricalRecordsSheet();
  renderVacationRecordsSheet();
  renderRecentlyDeletedBinSheet();
  runGlobalApplicationMetricsEngine();
  updateCloudBackupStatusIndicator();
  updateOfflineBadge();
  setTimeout(restoreDraftWorkEntry, 400);
  setTimeout(reinitDatePickers, 500);
  if (navigator.onLine) flushOfflineQueue();
  initializeDeviceTrackingEngine(displayName);
}

function toggleSidebarDrawer(open) {
  document.getElementById('sidebar-drawer').classList.toggle('open', open);
  document.getElementById('menu-backdrop').classList.toggle('show', open);
}

function switchActiveView(targetId, navEl) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`view-${targetId}`);
  if (panel) panel.classList.add('active');
  const main = document.getElementById('main-content-layout');
  if (targetId === 'admin-panel') { main.classList.add('admin-layout-widescreen'); refreshAdminData(); }
  else main.classList.remove('admin-layout-widescreen');
  if (targetId === 'log-work') setTimeout(() => { restoreDraftWorkEntry(); reinitDatePickers(); }, 100);
  toggleSidebarDrawer(false);
}

function openHiddenTrashView() { renderRecentlyDeletedBinSheet(); switchActiveView('deleted', null); }

function handleSecureSignOutRequest() {
  toggleSidebarDrawer(false);
  showConfirmModal(activeLanguageGlobal === 'de' ? 'Wirklich abmelden?' : 'Sign out?', () => {
    auth.signOut().catch(()=>{});
    localStorage.removeItem('schuermann_auth_user');
    localStorage.removeItem('schuermann_auth_role');
    authenticatedUserGlobal = ''; authenticatedUserRoleGlobal = 'user';
    globalLoggedSessionsDatabaseMock = []; vacationLoggedDaysArrayCache = [];
    recentlyDeletedItemsBinCache = []; adminAllEntriesCache = [];
    document.getElementById('app-view').style.display        = 'none';
    document.getElementById('admin-full-view').style.display = 'none';
    document.getElementById('login-view').style.display      = 'flex';
    document.body.classList.remove('admin-mode');
  });
}

function updateCloudBackupStatusIndicator() {
  const dot = document.getElementById('dash-backup-indicator');
  if (!dot) return;
  if (navigator.onLine) { dot.className = 'backup-status-dot online'; dot.title = 'Cloud Sync Aktiv'; }
  else                  { dot.className = 'backup-status-dot offline'; dot.title = 'Offline'; }
}

function populateLogTimeFormDropdowns() {
  const startSel = document.getElementById('log-start-time');
  const endSel   = document.getElementById('log-end-time');
  startSel.innerHTML = ''; endSel.innerHTML = '';
  for (let h = 0; h < 24; h++) {
    for (let m of ['00','15','30','45']) {
      const t  = `${String(h).padStart(2,'0')}:${m}`;
      const os = document.createElement('option'); os.value = t; os.textContent = t; if (t==='07:00') os.selected=true; startSel.appendChild(os);
      const oe = document.createElement('option'); oe.value = t; oe.textContent = t; if (t==='16:15') oe.selected=true; endSel.appendChild(oe);
    }
  }
}

function selectBreakOption(minutes, btn) {
  document.querySelectorAll('.break-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  activeSelectedFormBreakDuration = minutes;
}

function setLeaveManagementType(leaveType) {
  activeLeaveSubManagementType = leaveType;
  const t       = uiTranslations[activeLanguageGlobal];
  const vacBtn  = document.getElementById('toggle-leave-vacation');
  const sickBtn = document.getElementById('toggle-leave-sick');
  const lbl     = document.getElementById('leave-context-label');
  const inp     = document.getElementById('vacation-notes-input');
  const subBtn  = document.getElementById('leave-submit-btn');
  if (!vacBtn) return;
  if (leaveType === 'vacation') {
    vacBtn.classList.add('active'); sickBtn.classList.remove('active');
    if (lbl)    lbl.textContent    = t.vacContextV;
    if (inp)    inp.placeholder    = t.vacPlhV;
    if (subBtn) { subBtn.textContent = t.vacSubmitV; subBtn.style.background = '#3b82f6'; }
  } else {
    sickBtn.classList.add('active'); vacBtn.classList.remove('active');
    if (lbl)    lbl.textContent    = t.vacContextS;
    if (inp)    inp.placeholder    = t.vacPlhS;
    if (subBtn) { subBtn.textContent = t.vacSubmitS; subBtn.style.background = '#10b981'; }
  }
}

function computeRawHoursDiff(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff / 60 : 0;
}

function handleNewRecordSubmission(event) {
  event.preventDefault();
  const startVal = document.getElementById('log-start-time').value;
  const endVal   = document.getElementById('log-end-time').value;
  const grossHrs = computeRawHoursDiff(startVal, endVal);
  if (grossHrs <= 0) { showToast(activeLanguageGlobal === 'de' ? '⚠ Endzeit muss nach Startzeit liegen' : '⚠ End time must be after start'); return; }

  const dateRaw       = document.getElementById('log-date-picker').value;
  const [y,mo,d]      = dateRaw.split('-');
  const dateFormatted = `${d}/${mo}/${y}`;
  const startMins     = parseInt(startVal.split(':')[0])*60 + parseInt(startVal.split(':')[1]);
  const endMins       = parseInt(endVal.split(':')[0])*60   + parseInt(endVal.split(':')[1]);
  const existing      = globalLoggedSessionsDatabaseMock.filter(r => r.type === 'work' && r.date === dateFormatted);

  for (const rec of existing) {
    const rStart = parseInt(rec.startTime.split(':')[0])*60 + parseInt(rec.startTime.split(':')[1]);
    const rEnd   = parseInt(rec.endTime.split(':')[0])*60   + parseInt(rec.endTime.split(':')[1]);
    if (startMins < rEnd && endMins > rStart) {
      showToast(activeLanguageGlobal === 'de' ? `⚠ Überschneidung mit ${rec.startTime}–${rec.endTime}` : `⚠ Overlap with ${rec.startTime}–${rec.endTime}`);
      return;
    }
  }

  const record = {
    id: 'work-' + Date.now(), type: 'work', date: dateFormatted,
    startTime: startVal, endTime: endVal,
    project:   document.getElementById('log-project-name').value.trim(),
    duration:  grossHrs, breakTime: activeSelectedFormBreakDuration,
    notes:     document.getElementById('log-notes').value.trim()
  };

  if (!navigator.onLine) {
    const q = getOfflineQueue(); q.push(record); saveOfflineQueue(q);
    document.getElementById('log-project-name').value = '';
    document.getElementById('log-notes').value        = '';
    clearDraftWorkEntry();
    selectBreakOption(0, document.querySelectorAll('.break-pill')[0]);
    showToast(activeLanguageGlobal === 'de' ? '📶 Offline gespeichert' : '📶 Saved offline');
    return;
  }

  globalLoggedSessionsDatabaseMock.unshift(record);
  persistUserData();
  clearDraftWorkEntry();
  document.getElementById('log-project-name').value = '';
  document.getElementById('log-notes').value        = '';
  selectBreakOption(0, document.querySelectorAll('.break-pill')[0]);
  renderHistoricalRecordsSheet();
  runGlobalApplicationMetricsEngine();
  document.getElementById('log-start-time').value = endVal;
  document.getElementById('log-project-name').focus();
  showToast(activeLanguageGlobal === 'de' ? '✓ Gespeichert' : '✓ Saved');
}

function handleSchuleSubmission() {
  const dateRaw = document.getElementById('schule-date-picker').value;
  if (!dateRaw) { showToast(activeLanguageGlobal === 'de' ? '⚠ Bitte Datum wählen' : '⚠ Please select date', 'error'); return; }
  const [y,mo,d]      = dateRaw.split('-');
  const dateFormatted = `${d}/${mo}/${y}`;
  const exists = globalLoggedSessionsDatabaseMock.find(r => r.date === dateFormatted && (r.type === 'schule' || r.type === 'work'));
  if (exists) { showToast(activeLanguageGlobal === 'de' ? '⚠ Für diesen Tag existiert bereits ein Eintrag' : '⚠ Entry already exists for this date', 'error'); return; }
  const record = { id:'schule-'+Date.now(), type:'schule', date:dateFormatted, startTime:null, endTime:null, project:'BERUFSSCHULE', duration:0, breakTime:0, notes:'Schultag' };
  globalLoggedSessionsDatabaseMock.unshift(record);
  persistUserData(); runGlobalApplicationMetricsEngine(); renderHistoricalRecordsSheet();
  showToast(activeLanguageGlobal === 'de' ? '✓ Schultag gebucht' : '✓ School day logged');
}

function handleVacationDayLogSubmission(event) {
  event.preventDefault();
  const fromRaw = document.getElementById('vacation-from-date-input').value;
  const toRaw   = document.getElementById('vacation-to-date-input').value;
  if (!fromRaw || !toRaw) return;
  const fromObj   = new Date(fromRaw), toObj = new Date(toRaw);
  if (toObj < fromObj) { alert(activeLanguageGlobal === 'de' ? 'Fehler: Enddatum vor Startdatum!' : 'Error: To-date before From-date!'); return; }
  const totalDays = Math.round((toObj - fromObj) / 86400000) + 1;
  const isSick    = (activeLeaveSubManagementType === 'sick');
  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(fromObj); cur.setDate(fromObj.getDate() + i);
    const dd  = String(cur.getDate()).padStart(2,'0'), mm = String(cur.getMonth()+1).padStart(2,'0');
    vacationLoggedDaysArrayCache.unshift({ id:'vacation-'+Date.now()+'-'+i, type:isSick?'sick':'vacation', date:`${dd}/${mm}/${cur.getFullYear()}`, project:isSick?'Krankheit':'Urlaub', notes:document.getElementById('vacation-notes-input').value.trim(), duration:0, breakTime:0 });
  }
  persistUserData();
  document.getElementById('vacation-from-date-input').value = '';
  document.getElementById('vacation-to-date-input').value   = '';
  document.getElementById('vacation-notes-input').value     = '';
  renderVacationRecordsSheet(); runGlobalApplicationMetricsEngine();
  showToast(activeLanguageGlobal === 'de' ? `✓ ${totalDays} Tag(e) eingebucht` : `✓ ${totalDays} day(s) logged`);
}

function renderHistoricalRecordsSheet() {
  const mount = document.getElementById('history-items-container');
  const t     = uiTranslations[activeLanguageGlobal];
  if (!mount) return;
  mount.innerHTML = '';
  if (!globalLoggedSessionsDatabaseMock.length) { mount.innerHTML = `<p style="color:#64748b;font-size:13px;text-align:center;padding:24px;">${t.emptyHist}</p>`; return; }
  globalLoggedSessionsDatabaseMock.forEach(s => {
    const isSchule = s.type === 'schule';
    const net      = isSchule ? 0 : (s.duration - (s.breakTime / 60));
    const card     = document.createElement('div');
    card.className = 'history-item'; card.style.borderLeftColor = 'var(--primary-blue)'; card.id = `item-card-${s.id}`;
    card.innerHTML = `
      <div class="item-main-row">
        <div class="hist-left">
          <h5>${isSchule ? '🎓 BERUFSSCHULE' : s.project}</h5>
          <p><i class="fa-solid fa-calendar-day" style="font-size:11px;margin-right:4px;"></i>${s.date}${s.notes ? ` | ${s.notes}` : ''}</p>
        </div>
        <div style="display:flex;align-items:center;">
          <div class="hist-right">
            <div>${isSchule ? 'Schultag' : net.toFixed(2) + ' hrs'}</div>
            <div style="font-size:10px;color:#64748b;font-weight:500;">${isSchule ? 'Kein Abzug' : t.lblBreak + ': ' + s.breakTime + 'm'}</div>
          </div>
          <button class="action-icon-btn" onclick="initializeInlineEditRow('${s.id}')" style="${isSchule ? 'display:none' : ''}"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="action-icon-btn delete-hover" onclick="sendItemToTrashBin('${s.id}','${s.type}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div id="inline-edit-container-${s.id}" style="display:none;"></div>`;
    mount.appendChild(card);
  });
}

function renderVacationRecordsSheet() {
  const mount = document.getElementById('vacation-days-list-container');
  const t     = uiTranslations[activeLanguageGlobal];
  if (!mount) return;
  mount.innerHTML = '';
  if (!vacationLoggedDaysArrayCache.length) { mount.innerHTML = `<p style="color:#64748b;font-size:13px;text-align:center;padding:12px;">${t.emptyLeave}</p>`; return; }
  vacationLoggedDaysArrayCache.forEach(v => {
    const isSick = v.type === 'sick';
    const card   = document.createElement('div'); card.className = 'history-item'; card.style.borderLeftColor = isSick ? '#ef4444' : '#10b981';
    card.innerHTML = `
      <div class="item-main-row">
        <div class="hist-left">
          <h5>${v.notes || (isSick ? t.lblSickToken : t.lblVacToken)}</h5>
          <p><i class="${isSick ? 'fa-solid fa-briefcase-medical' : 'fa-solid fa-umbrella-beach'}" style="font-size:11px;margin-right:4px;"></i>
             ${v.date}
             <span style="font-size:10px;background:#f1f5f9;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:700;color:#475569;">${isSick ? t.lblSickToken : t.lblVacToken}</span>
          </p>
        </div>
        <div style="display:flex;align-items:center;">
          <div class="hist-right" style="color:${isSick ? '#ef4444' : '#10b981'};">1 ${t.lblDay}</div>
          <button class="action-icon-btn delete-hover" onclick="sendItemToTrashBin('${v.id}','leave')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>`;
    mount.appendChild(card);
  });
}

function renderRecentlyDeletedBinSheet() {
  const mount = document.getElementById('deleted-items-bin-container');
  const t     = uiTranslations[activeLanguageGlobal];
  if (!mount) return;
  mount.innerHTML = '';
  if (!recentlyDeletedItemsBinCache.length) { mount.innerHTML = `<p style="color:#64748b;font-size:13px;text-align:center;padding:24px;">${t.emptyTrash}</p>`; return; }
  recentlyDeletedItemsBinCache.forEach(item => {
    const typeLabel = item.type==='work' ? (activeLanguageGlobal==='de'?'Arbeitszeit':'Work Record') : item.type==='sick' ? (activeLanguageGlobal==='de'?'Krankmeldung':'Sick Leave') : (activeLanguageGlobal==='de'?'Urlaubstag':'Vacation Day');
    const row = document.createElement('div'); row.className = 'history-item'; row.style.borderLeftColor = '#94a3b8';
    row.innerHTML = `
      <div class="item-main-row">
        <div class="hist-left">
          <h5 style="color:#94a3b8;">[${activeLanguageGlobal==='de'?'Gelöscht':'Deleted'}] ${item.project || item.notes || '–'}</h5>
          <p>${item.date || ''} (${typeLabel})</p>
        </div>
        <button class="restore-btn" onclick="restoreItemFromTrashBin('${item.id}')">${activeLanguageGlobal==='de'?'Reaktivieren':'Restore'}</button>
      </div>`;
    mount.appendChild(row);
  });
}

window.initializeInlineEditRow = function(id) {
  const s = globalLoggedSessionsDatabaseMock.find(i => i.id === id); if (!s) return;
  const box = document.getElementById(`inline-edit-container-${id}`);
  box.innerHTML = `
    <div class="inline-edit-box">
      <div class="form-group"><label style="font-size:10px;">Baustelle/Kunde</label><input type="text" id="edit-proj-${id}" value="${s.project}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group"><label style="font-size:10px;">Kommen</label><input type="text" id="edit-start-${id}" value="${s.startTime||'07:00'}"></div>
        <div class="form-group"><label style="font-size:10px;">Gehen</label><input type="text" id="edit-end-${id}" value="${s.endTime||''}"></div>
      </div>
      <div class="form-group"><label style="font-size:10px;">Pause</label>
        <select id="edit-brk-${id}">
          <option value="0"  ${s.breakTime===0?'selected':''}>Keine</option>
          <option value="15" ${s.breakTime===15?'selected':''}>15m</option>
          <option value="30" ${s.breakTime===30?'selected':''}>30m</option>
          <option value="45" ${s.breakTime===45?'selected':''}>45m</option>
          <option value="60" ${s.breakTime===60?'selected':''}>1h</option>
        </select>
      </div>
      <div class="inline-edit-actions">
        <button class="inline-btn" style="background:#cbd5e1;color:#333;" onclick="closeInlineEditorFrame('${id}')">Abbrechen</button>
        <button class="inline-btn" style="background:#10b981;color:white;" onclick="commitInlineChanges('${id}')">Übernehmen</button>
      </div>
    </div>`;
  box.style.display = 'block';
};

window.closeInlineEditorFrame = function(id) { document.getElementById(`inline-edit-container-${id}`).style.display = 'none'; };

window.commitInlineChanges = function(id) {
  const s     = globalLoggedSessionsDatabaseMock.find(i => i.id === id); if (!s) return;
  const proj  = document.getElementById(`edit-proj-${id}`).value.trim();
  const start = document.getElementById(`edit-start-${id}`).value.trim();
  const end   = document.getElementById(`edit-end-${id}`).value.trim();
  const brk   = parseInt(document.getElementById(`edit-brk-${id}`).value);
  if (!proj || !start || !end) { alert('Bitte alle Felder ausfüllen.'); return; }
  const hrs = computeRawHoursDiff(start, end);
  if (hrs <= 0) { alert('Ungültige Zeitspanne.'); return; }
  s.project = proj; s.duration = hrs; s.breakTime = brk;
  persistUserData(); renderHistoricalRecordsSheet(); runGlobalApplicationMetricsEngine();
  showToast(activeLanguageGlobal === 'de' ? '✓ Gespeichert' : '✓ Saved');
};

window.sendItemToTrashBin = function(id, type) {
  if (type === 'work' || type === 'schule') {
    const idx = globalLoggedSessionsDatabaseMock.findIndex(s => s.id === id);
    if (idx > -1) { const obj = globalLoggedSessionsDatabaseMock.splice(idx,1)[0]; obj.deletedAtTimestamp = Date.now(); recentlyDeletedItemsBinCache.push(obj); }
  } else {
    const idx = vacationLoggedDaysArrayCache.findIndex(v => v.id === id);
    if (idx > -1) { const obj = vacationLoggedDaysArrayCache.splice(idx,1)[0]; obj.deletedAtTimestamp = Date.now(); recentlyDeletedItemsBinCache.push(obj); }
  }
  persistUserData(); renderHistoricalRecordsSheet(); renderVacationRecordsSheet(); runGlobalApplicationMetricsEngine();
  showToast(activeLanguageGlobal === 'de' ? 'In Papierkorb verschoben.' : 'Moved to trash.', 'info');
};

window.restoreItemFromTrashBin = function(id) {
  const idx = recentlyDeletedItemsBinCache.findIndex(i => i.id === id);
  if (idx > -1) {
    const item = recentlyDeletedItemsBinCache.splice(idx,1)[0];
    delete item.deletedAtTimestamp;
    if (item.type === 'work' || item.type === 'schule') globalLoggedSessionsDatabaseMock.unshift(item);
    else vacationLoggedDaysArrayCache.unshift(item);
  }
  persistUserData(); renderRecentlyDeletedBinSheet(); renderHistoricalRecordsSheet(); renderVacationRecordsSheet(); runGlobalApplicationMetricsEngine();
  showToast(activeLanguageGlobal === 'de' ? '✓ Wiederhergestellt' : '✓ Restored');
};

function enforceTrashLifespanPurgeEngine() {
  const limit = 12 * 60 * 60 * 1000, now = Date.now();
  recentlyDeletedItemsBinCache = recentlyDeletedItemsBinCache.filter(i => (now - i.deletedAtTimestamp) < limit);
  persistUserData();
  if (document.getElementById('view-deleted').classList.contains('active')) renderRecentlyDeletedBinSheet();
}

function runGlobalApplicationMetricsEngine() {
  let netHrs = 0, otHrs = 0;
  dailyWorkTimeBreakdownLogs = {}; dailyOvertimeBreakdownLogs = {};
  const target = parseFloat(document.getElementById('shift-target-constraint').value) || 8.5;

  globalLoggedSessionsDatabaseMock.forEach(s => {
    const net = s.duration - (s.breakTime / 60);
    netHrs += net;
    dailyWorkTimeBreakdownLogs[s.date] = (dailyWorkTimeBreakdownLogs[s.date] || 0) + net;
    const [dd,mm,yy] = s.date.split('/');
    const dow        = new Date(yy, mm - 1, dd).getDay();
    const dayTarget  = (dow === 5) ? 6.0 : (dow === 0 || dow === 6) ? 0 : target;
    if (net > dayTarget) { const ot = net - dayTarget; otHrs += ot; dailyOvertimeBreakdownLogs[s.date] = (dailyOvertimeBreakdownLogs[s.date] || 0) + ot; }
  });

  const grossEl = document.getElementById('dash-gross-hours');
  const otEl    = document.getElementById('dash-overtime-hours');
  if (grossEl) { grossEl.textContent = `${netHrs.toFixed(2)} hrs`; grossEl.parentElement.style.borderTop = netHrs > 0 ? '4px solid var(--primary-blue)' : '4px solid #cbd5e1'; }
  if (otEl)    { otEl.textContent    = `+${otHrs.toFixed(2)} hrs`; otEl.parentElement.style.borderTop    = otHrs  > 0 ? '4px solid #10b981'             : '4px solid #cbd5e1'; }
}

function closeCustomReportModal() { document.getElementById('custom-report-modal-backdrop').classList.remove('show'); }

function displayWorkTimeBreakdownSummary() {
  const t    = uiTranslations[activeLanguageGlobal];
  document.getElementById('custom-modal-title-header').textContent = t.modalWorkTitle;
  document.getElementById('custom-modal-icon-header').className    = 'fa-solid fa-briefcase';
  const body = document.getElementById('modal-report-content-body'); body.innerHTML = '';
  const keys = Object.keys(dailyWorkTimeBreakdownLogs);
  if (!keys.length) { body.innerHTML = `<div style="text-align:center;padding:20px;color:#64748b;"><i class="fa-solid fa-circle-notch" style="font-size:32px;color:#cbd5e1;display:block;margin-bottom:10px;"></i><p style="font-size:14px;font-weight:600;">${t.noWorkMsg}</p></div>`; }
  else { keys.forEach(k => { const row = document.createElement('div'); row.className = 'modal-report-row'; row.innerHTML = `<span><i class="fa-regular fa-calendar-days" style="margin-right:6px;color:#94a3b8;"></i>${t.lblDay}: ${k}</span><span style="font-weight:700;color:var(--primary-blue);">${dailyWorkTimeBreakdownLogs[k].toFixed(2)} hrs</span>`; body.appendChild(row); }); }
  document.getElementById('custom-report-modal-backdrop').classList.add('show');
}

function displayOvertimeBreakdownSummary() {
  const t    = uiTranslations[activeLanguageGlobal];
  document.getElementById('custom-modal-title-header').textContent = t.modalOtTitle;
  document.getElementById('custom-modal-icon-header').className    = 'fa-solid fa-clock';
  const body = document.getElementById('modal-report-content-body'); body.innerHTML = '';
  const keys = Object.keys(dailyOvertimeBreakdownLogs);
  if (!keys.length) { body.innerHTML = `<div style="text-align:center;padding:20px;color:#64748b;"><i class="fa-solid fa-circle-check" style="font-size:32px;color:#cbd5e1;display:block;margin-bottom:10px;"></i><p style="font-size:14px;font-weight:600;">${t.noOtMsg}</p></div>`; }
  else { keys.forEach(k => { const row = document.createElement('div'); row.className = 'modal-report-row'; row.innerHTML = `<span><i class="fa-regular fa-calendar-check" style="margin-right:6px;color:#94a3b8;"></i>${t.lblDay}: ${k}</span><span style="font-weight:700;color:#10b981;">+${dailyOvertimeBreakdownLogs[k].toFixed(2)} hrs</span>`; body.appendChild(row); }); }
  document.getElementById('custom-report-modal-backdrop').classList.add('show');
}

function displayLeaveStatementBalancesSummary() {
  const t    = uiTranslations[activeLanguageGlobal];
  document.getElementById('custom-modal-title-header').textContent = t.modalLeaveTitle;
  document.getElementById('custom-modal-icon-header').className    = 'fa-solid fa-folder-open';
  const body      = document.getElementById('modal-report-content-body'); body.innerHTML = '';
  const allowed   = parseFloat(document.getElementById('vacation-allowed-bank').value) || 30;
  const vacTaken  = vacationLoggedDaysArrayCache.filter(i => i.type === 'vacation').length;
  const sickTaken = vacationLoggedDaysArrayCache.filter(i => i.type === 'sick').length;
  const remaining = allowed - vacTaken;
  const box = document.createElement('div'); box.className = 'statement-summary-box';
  box.innerHTML = `
    <div><span>${t.lblYearlyAllow}</span><span style="color:#0259b6;font-weight:700;">${allowed} ${t.lblDays}</span></div>
    <div><span>${t.lblVacConsumed}</span><span style="color:#ef4444;font-weight:700;">${vacTaken} ${t.lblDays}</span></div>
    <div style="border-top:1px solid #cbd5e1;margin-top:6px;padding-top:6px;">
      <span style="font-weight:700;">${t.lblNetVac}</span>
      <span style="font-weight:700;color:${remaining >= 0 ? '#10b981' : '#dc2626'};">${remaining} ${t.lblDays}</span>
    </div>
    <div style="margin-top:4px;"><span>${t.lblTotalSick}</span><span style="color:#10b981;font-weight:700;">${sickTaken} ${t.lblDays}</span></div>`;
  body.appendChild(box);
  if (!vacationLoggedDaysArrayCache.length) { const p = document.createElement('p'); p.style.cssText='text-align:center;padding:12px;color:#94a3b8;font-size:12px;font-weight:600;'; p.textContent = t.noAbsLogs; body.appendChild(p); }
  document.getElementById('custom-report-modal-backdrop').classList.add('show');
}

function handleFeedbackSubmissionEngine(event) {
  event.preventDefault();
  const t   = uiTranslations[activeLanguageGlobal];
  const inp = document.getElementById('feedback-message');
  const btn = document.getElementById('btn-feedback-submit');
  const box = document.getElementById('feedback-status-box');
  if (!inp.value.trim()) return;
  btn.disabled = true; btn.textContent = t.feedbackSending;
  setTimeout(() => {
    inp.value = ''; btn.disabled = false; btn.textContent = t.feedbackBtn;
    box.innerHTML = t.feedbackDone; box.className = 'message success';
    setTimeout(() => { box.style.display = 'none'; }, 4000);
  }, 1200);
}

async function handlePasswordChange() {
  const cur  = document.getElementById('pin-current')?.value.trim();
  const nw   = document.getElementById('pin-new')?.value.trim();
  const conf = document.getElementById('pin-confirm')?.value.trim();
  const msg  = document.getElementById('pin-change-msg');
  if (!cur||!nw||!conf) { msg.style.color='#dc2626'; msg.textContent = activeLanguageGlobal==='de'?'Alle Felder ausfüllen.':'Fill in all fields.'; return; }
  if (nw !== conf)       { msg.style.color='#dc2626'; msg.textContent = activeLanguageGlobal==='de'?'Kennwörter stimmen nicht überein.':'Passwords do not match.'; return; }
  if (nw.length < 6)     { msg.style.color='#dc2626'; msg.textContent = activeLanguageGlobal==='de'?'Mind. 6 Zeichen erforderlich.':'Minimum 6 characters required.'; return; }
  try {
    const user = auth.currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, cur);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(nw);
    msg.style.color = '#16a34a';
    msg.textContent = activeLanguageGlobal==='de'?'✓ Kennwort geändert.':'✓ Password updated.';
    document.getElementById('pin-current').value = '';
    document.getElementById('pin-new').value     = '';
    document.getElementById('pin-confirm').value = '';
  } catch(err) {
    msg.style.color = '#dc2626';
    msg.textContent = (err.code==='auth/wrong-password'||err.code==='auth/invalid-credential')
      ? (activeLanguageGlobal==='de'?'Aktuelles Kennwort ist falsch.':'Current password is incorrect.')
      : (activeLanguageGlobal==='de'?'Fehler: '+err.message:'Error: '+err.message);
  }
}

function showProjectSuggestions(query) {
  const list = document.getElementById('project-autocomplete-list'); if (!list) return;
  const q    = query.trim().toLowerCase();
  if (!q) { list.style.display = 'none'; return; }
  const names = [...new Set(globalLoggedSessionsDatabaseMock.filter(r => r.type==='work' && r.project && r.project.toLowerCase().includes(q)).map(r => r.project))].slice(0,8);
  if (!names.length) { list.style.display = 'none'; return; }
  list.innerHTML = names.map(n => `<div class="autocomplete-item" onmousedown="pickProjectSuggestion('${n.replace(/'/g,"&#39;")}')"><i class="fa-solid fa-building"></i>${n}</div>`).join('');
  list.style.display = 'block';
}
function pickProjectSuggestion(name) { const inp = document.getElementById('log-project-name'); if(inp) inp.value = name; hideProjectSuggestions(); saveDraftWorkEntry(); }
function hideProjectSuggestions()    { const list = document.getElementById('project-autocomplete-list'); if(list) list.style.display='none'; }

function showConfirmModal(message, onConfirm) {
  const existing = document.getElementById('custom-confirm-backdrop');
  if (existing) existing.remove();
  const backdrop = document.createElement('div');
  backdrop.id = 'custom-confirm-backdrop';
  backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(3,6,15,0.75);backdrop-filter:blur(12px) saturate(140%);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';
  backdrop.innerHTML = `
    <div style="width:100%;max-width:360px;border-radius:20px;overflow:hidden;animation:modalEntrance 0.3s cubic-bezier(0.16,1,0.3,1);">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 26px 22px;position:relative;border:1px solid rgba(251,191,36,0.2);border-bottom:none;">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#E30613,#f59e0b,#E30613);"></div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(251,191,36,0.2),rgba(251,191,36,0.05));border:1px solid rgba(251,191,36,0.3);display:flex;align-items:center;justify-content:center;">
            <i class="fa-solid fa-shield-halved" style="color:#E30613;font-size:18px;"></i>
          </div>
          <div>
            <div style="font-size:11px;font-weight:800;color:#E30613;letter-spacing:1.2px;text-transform:uppercase;">MEINE STUNDEN</div>
            <div style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-0.3px;margin-top:1px;">${activeLanguageGlobal==='de'?'Sitzung beenden':'End Session'}</div>
          </div>
        </div>
        <div style="font-size:14px;color:#cbd5e1;line-height:1.6;">${message}</div>
      </div>
      <div style="background:rgba(2,6,15,0.9);padding:16px 20px;border:1px solid rgba(251,191,36,0.2);border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:10px;justify-content:flex-end;">
        <button id="confirm-cancel" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#e2e8f0;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">${activeLanguageGlobal==='de'?'Abbrechen':'Cancel'}</button>
        <button id="confirm-ok"     style="background:linear-gradient(135deg,#E30613 0%,#f59e0b 100%);border:none;color:#0f172a;padding:10px 22px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(251,191,36,0.3);">${activeLanguageGlobal==='de'?'Abmelden':'Sign Out'}</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById('confirm-cancel').onclick = () => backdrop.remove();
  document.getElementById('confirm-ok').onclick     = () => { backdrop.remove(); if (onConfirm) onConfirm(); };
  backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
}
