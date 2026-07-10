let _persistTimer = null;

async function persistUserDataNow() {
  if (!authenticatedUserGlobal || authenticatedUserRoleGlobal === 'admin') return;
  try {
    const docRef = db.collection('userProfiles').doc(authenticatedUserGlobal);
    const vacAllowedVal = parseFloat(document.getElementById('vacation-allowed-bank')?.value);
    const dataToSave = {
      name: localStorage.getItem('schuermann_current_user') || authenticatedUserGlobal,
      updatedAt: Date.now(),
      vacationAllowed: isNaN(vacAllowedVal) ? 30 : vacAllowedVal,
      // Fix #1: Always save arrays — even when empty (so deletions persist)
      workSessions: globalLoggedSessionsDatabaseMock,
      leaveDays:    vacationLoggedDaysArrayCache,
      trash:        recentlyDeletedItemsBinCache
    };
    await docRef.set(dataToSave, { merge: true });
  } catch (err) {
    console.error('Save failed:', err);
  }
}

function persistUserData() {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(persistUserDataNow, 400);
}

async function loadUserDataFromCloud() {
  if (!authenticatedUserGlobal || authenticatedUserRoleGlobal === 'admin') return;
  try {
    const snap = await db.collection('userProfiles').doc(authenticatedUserGlobal).get();
    const data = snap.exists ? (snap.data() || {}) : {};
    globalLoggedSessionsDatabaseMock = Array.isArray(data.workSessions) ? data.workSessions : [];
    vacationLoggedDaysArrayCache     = Array.isArray(data.leaveDays)    ? data.leaveDays    : [];
    recentlyDeletedItemsBinCache     = Array.isArray(data.trash)        ? data.trash        : [];
    const storedAllowance = parseFloat(data.vacationAllowed);
    if (!isNaN(storedAllowance)) {
      const inp = document.getElementById('vacation-allowed-bank');
      if (inp) inp.value = storedAllowance;
    }
  } catch (err) {
    console.error('Load failed:', err);
  }
}

const OFFLINE_QUEUE_KEY = 'sch_offline_queue';

function getOfflineQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); } catch(e) { return []; }
}

function saveOfflineQueue(q) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
  const badge = document.getElementById('offline-queue-badge');
  if (badge) { badge.classList.toggle('visible', q.length > 0); if (q.length) badge.textContent = '● ' + q.length + ' offline'; }
}

function updateOfflineBadge() {
  const q = getOfflineQueue();
  const badge = document.getElementById('offline-queue-badge');
  if (badge) { badge.classList.toggle('visible', q.length > 0); if (q.length) badge.textContent = '● ' + q.length + ' offline'; }
}

async function flushOfflineQueue() {
  if (!authenticatedUserGlobal || authenticatedUserRoleGlobal === 'admin') return;
  const q = getOfflineQueue();
  if (!q.length) return;
  showToast(activeLanguageGlobal === 'de' ? '↑ ' + q.length + ' Offline-Einträge werden synchronisiert...' : '↑ Syncing ' + q.length + ' offline entries...');
  const failed = [];
  for (const entry of q) {
    try { globalLoggedSessionsDatabaseMock.push(entry); await persistUserDataNow(); }
    catch(e) { failed.push(entry); }
  }
  saveOfflineQueue(failed);
  if (!failed.length) {
    showToast(activeLanguageGlobal === 'de' ? '✓ Alle Einträge synchronisiert' : '✓ All entries synced');
    runGlobalApplicationMetricsEngine();
    renderHistoricalRecordsSheet();
  }
}

const DRAFT_KEY = 'sch_work_draft';

function saveDraftWorkEntry() {
  const draft = {
    date:    document.getElementById('log-date-picker')?.value    || '',
    project: document.getElementById('log-project-name')?.value  || '',
    start:   document.getElementById('log-start-time')?.value    || '',
    end:     document.getElementById('log-end-time')?.value      || '',
    notes:   document.getElementById('log-notes')?.value         || '',
    brk:     activeSelectedFormBreakDuration
  };
  if (draft.project || draft.notes) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function restoreDraftWorkEntry() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.date)    { const el = document.getElementById('log-date-picker');   if (el) el.value = d.date; }
    if (d.project) { const el = document.getElementById('log-project-name'); if (el) el.value = d.project; }
    if (d.start)   { const el = document.getElementById('log-start-time');   if (el) el.value = d.start; }
    if (d.end)     { const el = document.getElementById('log-end-time');     if (el) el.value = d.end; }
    if (d.notes)   { const el = document.getElementById('log-notes');        if (el) el.value = d.notes; }
    if (d.brk != null) {
      activeSelectedFormBreakDuration = d.brk;
      document.querySelectorAll('.break-pill').forEach(p => {
        p.classList.toggle('active', parseInt(p.getAttribute('onclick')?.match(/\d+/)?.[0] || '0') === d.brk);
      });
    }
    if (d.project || d.notes) showToast(activeLanguageGlobal === 'de' ? '📝 Entwurf wiederhergestellt' : '📝 Draft restored');
  } catch(e) {}
}

function clearDraftWorkEntry() {
  localStorage.removeItem(DRAFT_KEY);
}
