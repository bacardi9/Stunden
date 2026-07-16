let _persistTimer = null;
let _cloudDataLoading = false;
let _cloudDataLoaded = false;
let _cloudProfileRef = null;
let _cloudFieldNames = {
  work: 'workSessions',
  leave: 'leaveDays',
  trash: 'trash'
};
let _cloudBaseline = {
  work: 0,
  leave: 0,
  trash: 0
};

const WORK_FIELD_NAMES = [
  'workSessions',
  'workLogs',
  'sessions',
  'loggedSessions',
  'logs',
  'entries',
  'timeEntries',
  'workEntries'
];

const LEAVE_FIELD_NAMES = [
  'leaveDays',
  'vacationDays',
  'absences',
  'leaveEntries'
];

const TRASH_FIELD_NAMES = [
  'trash',
  'deletedItems',
  'trashItems'
];

function normalizeCloudIdentity(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

function toArray(value) {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.values(value).filter(item => {
      return item && typeof item === 'object';
    });
  }

  return [];
}

function readArrayFieldDetailed(data, fieldNames) {
  const sources = [
    data,
    data?.userData,
    data?.data,
    data?.profileData
  ].filter(Boolean);

  for (const source of sources) {
    for (const fieldName of fieldNames) {
      const value = source[fieldName];

      if (Array.isArray(value)) {
        return { values: value, fieldName };
      }

      if (value && typeof value === 'object') {
        return { values: toArray(value), fieldName };
      }
    }
  }

  return { values: [], fieldName: null };
}

function getProfileEntryCount(data) {
  const work = readArrayFieldDetailed(data, WORK_FIELD_NAMES).values.length;
  const leave = readArrayFieldDetailed(data, LEAVE_FIELD_NAMES).values.length;
  const trash = readArrayFieldDetailed(data, TRASH_FIELD_NAMES).values.length;
  return work + leave + trash;
}

async function getAuthenticatedUid() {
  if (auth.currentUser?.uid) {
    authenticatedUserGlobal = auth.currentUser.uid;
    localStorage.setItem('schuermann_auth_user', auth.currentUser.uid);
    return auth.currentUser.uid;
  }

  const user = await new Promise(resolve => {
    let unsubscribe = function() {};

    unsubscribe = auth.onAuthStateChanged(currentUser => {
      unsubscribe();
      resolve(currentUser || null);
    });
  });

  if (!user) return '';

  authenticatedUserGlobal = user.uid;
  localStorage.setItem('schuermann_auth_user', user.uid);
  return user.uid;
}

async function getCollectionSnapshotFromServer() {
  try {
    return await db.collection('userProfiles').get({ source: 'server' });
  } catch (error) {
    console.warn('Server profile scan failed, using available cache:', error);
    return db.collection('userProfiles').get();
  }
}

async function findBestUserProfile(uid) {
  const displayName = localStorage.getItem('schuermann_current_user') || '';
  const normalizedName = normalizeCloudIdentity(displayName);
  const normalizedEmail = normalizeCloudIdentity(
    String(auth.currentUser?.email || '').split('@')[0]
  );

  const candidates = new Map();

  function addCandidate(snapshot) {
    if (!snapshot?.exists) return;

    const data = snapshot.data() || {};
    const dataUid = String(data.uid || '');
    const dataName = normalizeCloudIdentity(
      data.name || data.displayName || data.username
    );
    const documentName = normalizeCloudIdentity(snapshot.id);

    const isUidMatch = snapshot.id === uid || dataUid === uid;
    const isNameMatch = normalizedName && (
      dataName === normalizedName ||
      documentName === normalizedName
    );
    const isEmailMatch = normalizedEmail && (
      dataName === normalizedEmail ||
      documentName === normalizedEmail
    );

    if (!isUidMatch && !isNameMatch && !isEmailMatch) return;

    const entryCount = getProfileEntryCount(data);
    let score = 0;

    if (isUidMatch) score += 100000;
    if (isNameMatch) score += 50000;
    if (isEmailMatch) score += 40000;

    // A matching legacy profile with data is preferred over a new empty UID profile.
    if (entryCount > 0) score += 200000 + Math.min(entryCount, 10000);

    candidates.set(snapshot.id, {
      snapshot,
      data,
      score,
      entryCount
    });
  }

  try {
    addCandidate(
      await db.collection('userProfiles').doc(uid).get({ source: 'server' })
    );
  } catch (error) {
    console.warn('Direct server profile load failed:', error);

    try {
      addCandidate(await db.collection('userProfiles').doc(uid).get());
    } catch (cacheError) {
      console.warn('Direct cached profile load failed:', cacheError);
    }
  }

  const allProfiles = await getCollectionSnapshotFromServer();
  allProfiles.forEach(addCandidate);

  const sortedCandidates = [...candidates.values()].sort((a, b) => {
    return b.score - a.score;
  });

  return sortedCandidates[0] || null;
}

function hasSuspiciousEmptyOverwrite() {
  const currentTotal =
    globalLoggedSessionsDatabaseMock.length +
    vacationLoggedDaysArrayCache.length +
    recentlyDeletedItemsBinCache.length;

  const baselineTotal =
    _cloudBaseline.work +
    _cloudBaseline.leave +
    _cloudBaseline.trash;

  return baselineTotal > 0 && currentTotal === 0;
}

async function persistUserDataNow() {
  if (_cloudDataLoading || !_cloudDataLoaded) return;
  if (authenticatedUserRoleGlobal === 'admin') return;

  try {
    const uid = await getAuthenticatedUid();
    if (!uid || !_cloudProfileRef) {
      console.warn('Cloud save blocked: no verified profile document.');
      return;
    }

    if (hasSuspiciousEmptyOverwrite()) {
      console.error('Cloud save blocked: attempted to replace existing data with empty arrays.');
      showToast(
        'Speichern gestoppt: Leere Daten würden vorhandene Cloud-Daten überschreiben.',
        'error'
      );
      return;
    }

    const latestSnapshot = await _cloudProfileRef.get({ source: 'server' });
    if (!latestSnapshot.exists) {
      throw new Error('The verified cloud profile no longer exists.');
    }

    const latestData = latestSnapshot.data() || {};
    const latestCount = getProfileEntryCount(latestData);
    const currentCount =
      globalLoggedSessionsDatabaseMock.length +
      vacationLoggedDaysArrayCache.length +
      recentlyDeletedItemsBinCache.length;

    if (latestCount > 0 && currentCount === 0) {
      throw new Error('Blocked an unsafe empty cloud overwrite.');
    }

    const vacAllowedVal = parseFloat(
      document.getElementById('vacation-allowed-bank')?.value
    );

    const dataToSave = {
      uid,
      name:
        localStorage.getItem('schuermann_current_user') ||
        latestData.name ||
        uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      vacationAllowed: isNaN(vacAllowedVal)
        ? (parseFloat(latestData.vacationAllowed) || 30)
        : vacAllowedVal
    };

    dataToSave[_cloudFieldNames.work] =
      Array.isArray(globalLoggedSessionsDatabaseMock)
        ? globalLoggedSessionsDatabaseMock
        : [];

    dataToSave[_cloudFieldNames.leave] =
      Array.isArray(vacationLoggedDaysArrayCache)
        ? vacationLoggedDaysArrayCache
        : [];

    dataToSave[_cloudFieldNames.trash] =
      Array.isArray(recentlyDeletedItemsBinCache)
        ? recentlyDeletedItemsBinCache
        : [];

    await _cloudProfileRef.set(dataToSave, { merge: true });

    _cloudBaseline = {
      work: globalLoggedSessionsDatabaseMock.length,
      leave: vacationLoggedDaysArrayCache.length,
      trash: recentlyDeletedItemsBinCache.length
    };
  } catch (error) {
    console.error('Cloud save failed:', error);
    showToast('Cloud-Speicherung wurde aus Sicherheitsgründen gestoppt.', 'error');
    throw error;
  }
}

function persistUserData() {
  if (_cloudDataLoading || !_cloudDataLoaded) return;

  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(persistUserDataNow, 400);
}

async function loadUserDataFromCloud() {
  if (authenticatedUserRoleGlobal === 'admin') return false;

  _cloudDataLoading = true;
  _cloudDataLoaded = false;
  _cloudProfileRef = null;

  try {
    const uid = await getAuthenticatedUid();
    if (!uid) {
      throw new Error('No authenticated Firebase user found.');
    }

    const profile = await findBestUserProfile(uid);
    if (!profile?.snapshot?.exists) {
      throw new Error('No matching Firebase profile was found.');
    }

    const data = profile.data || {};
    const workResult = readArrayFieldDetailed(data, WORK_FIELD_NAMES);
    const leaveResult = readArrayFieldDetailed(data, LEAVE_FIELD_NAMES);
    const trashResult = readArrayFieldDetailed(data, TRASH_FIELD_NAMES);

    globalLoggedSessionsDatabaseMock = workResult.values;
    vacationLoggedDaysArrayCache = leaveResult.values;
    recentlyDeletedItemsBinCache = trashResult.values;

    _cloudFieldNames = {
      work: workResult.fieldName || 'workSessions',
      leave: leaveResult.fieldName || 'leaveDays',
      trash: trashResult.fieldName || 'trash'
    };

    _cloudBaseline = {
      work: globalLoggedSessionsDatabaseMock.length,
      leave: vacationLoggedDaysArrayCache.length,
      trash: recentlyDeletedItemsBinCache.length
    };

    _cloudProfileRef = profile.snapshot.ref;

    const storedAllowance = parseFloat(data.vacationAllowed);
    if (!isNaN(storedAllowance)) {
      const input = document.getElementById('vacation-allowed-bank');
      if (input) input.value = storedAllowance;
    }

    if (data.name) {
      localStorage.setItem('schuermann_current_user', data.name);
    }

    if (data.companyName) {
      localStorage.setItem('schuermann_company_name', data.companyName);
    }

    _cloudDataLoaded = true;

    console.info(
      `Loaded ${globalLoggedSessionsDatabaseMock.length} work logs from profile ${profile.snapshot.id}.`
    );

    return true;
  } catch (error) {
    console.error('Cloud load failed:', error);

    globalLoggedSessionsDatabaseMock = [];
    vacationLoggedDaysArrayCache = [];
    recentlyDeletedItemsBinCache = [];

    showToast(
      'Cloud-Daten konnten nicht sicher geladen werden. Speichern ist deaktiviert.',
      'error'
    );

    return false;
  } finally {
    _cloudDataLoading = false;
  }
}

const OFFLINE_QUEUE_KEY = 'sch_offline_queue';

function getOfflineQueue() {
  try {
    const value = JSON.parse(
      localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'
    );
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function saveOfflineQueue(queue) {
  const safeQueue = Array.isArray(queue) ? queue : [];
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(safeQueue));

  const badge = document.getElementById('offline-queue-badge');
  if (!badge) return;

  badge.classList.toggle('visible', safeQueue.length > 0);
  badge.textContent = safeQueue.length
    ? '● ' + safeQueue.length + ' offline'
    : '● Offline';
}

function updateOfflineBadge() {
  saveOfflineQueue(getOfflineQueue());
}

async function flushOfflineQueue() {
  if (authenticatedUserRoleGlobal === 'admin') return;
  if (!_cloudDataLoaded || !_cloudProfileRef) return;

  const queue = getOfflineQueue();
  if (!queue.length) return;

  showToast(
    activeLanguageGlobal === 'de'
      ? '↑ ' + queue.length + ' Offline-Einträge werden synchronisiert...'
      : '↑ Syncing ' + queue.length + ' offline entries...',
    'info'
  );

  const failed = [];

  for (const entry of queue) {
    try {
      const alreadyExists = globalLoggedSessionsDatabaseMock.some(item => {
        return item.id && entry.id && item.id === entry.id;
      });

      if (!alreadyExists) {
        globalLoggedSessionsDatabaseMock.push(entry);
      }

      await persistUserDataNow();
    } catch (error) {
      failed.push(entry);
    }
  }

  saveOfflineQueue(failed);

  if (!failed.length) {
    showToast(
      activeLanguageGlobal === 'de'
        ? '✓ Alle Einträge synchronisiert'
        : '✓ All entries synced',
      'success'
    );

    runGlobalApplicationMetricsEngine();
    renderHistoricalRecordsSheet();
  }
}

const DRAFT_KEY = 'sch_work_draft';

function saveDraftWorkEntry() {
  const draft = {
    date: document.getElementById('log-date-picker')?.value || '',
    project: document.getElementById('log-project-name')?.value || '',
    start: document.getElementById('log-start-time')?.value || '',
    end: document.getElementById('log-end-time')?.value || '',
    notes: document.getElementById('log-notes')?.value || '',
    brk: activeSelectedFormBreakDuration
  };

  if (draft.project || draft.notes) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }
}

function restoreDraftWorkEntry() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    const draft = JSON.parse(raw);

    const dateElement = document.getElementById('log-date-picker');
    const projectElement = document.getElementById('log-project-name');
    const startElement = document.getElementById('log-start-time');
    const endElement = document.getElementById('log-end-time');
    const notesElement = document.getElementById('log-notes');

    if (draft.date && dateElement) dateElement.value = draft.date;
    if (draft.project && projectElement) projectElement.value = draft.project;
    if (draft.start && startElement) startElement.value = draft.start;
    if (draft.end && endElement) endElement.value = draft.end;
    if (draft.notes && notesElement) notesElement.value = draft.notes;

    if (draft.brk != null) {
      activeSelectedFormBreakDuration = Number(draft.brk) || 0;

      document.querySelectorAll('.break-pill').forEach(pill => {
        const minutes = parseInt(
          pill.getAttribute('onclick')?.match(/\d+/)?.[0] || '0'
        );

        pill.classList.toggle(
          'active',
          minutes === activeSelectedFormBreakDuration
        );
      });
    }

    if (draft.project || draft.notes) {
      showToast(
        activeLanguageGlobal === 'de'
          ? '📝 Entwurf wiederhergestellt'
          : '📝 Draft restored',
        'info'
      );
    }
  } catch (error) {
    console.warn('Draft restore failed:', error);
  }
}

function clearDraftWorkEntry() {
  localStorage.removeItem(DRAFT_KEY);
}
