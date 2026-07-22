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
        return {
          values: toArray(value),
          fieldName
        };
      }
    }
  }

  return {
    values: [],
    fieldName: null
  };
}

function getProfileEntryCount(data) {
  const work =
    readArrayFieldDetailed(data, WORK_FIELD_NAMES).values.length;

  const leave =
    readArrayFieldDetailed(data, LEAVE_FIELD_NAMES).values.length;

  const trash =
    readArrayFieldDetailed(data, TRASH_FIELD_NAMES).values.length;

  return work + leave + trash;
}

async function getAuthenticatedUid() {
  if (auth.currentUser?.uid) {
    authenticatedUserGlobal = auth.currentUser.uid;

    localStorage.setItem(
      'schuermann_auth_user',
      auth.currentUser.uid
    );

    return auth.currentUser.uid;
  }

  const user = await new Promise(resolve => {
    let unsubscribe = null;

    unsubscribe = auth.onAuthStateChanged(currentUser => {
      if (unsubscribe) unsubscribe();
      resolve(currentUser || null);
    });
  });

  if (!user?.uid) return '';

  authenticatedUserGlobal = user.uid;

  localStorage.setItem(
    'schuermann_auth_user',
    user.uid
  );

  return user.uid;
}

async function findBestUserProfile(uid) {
  if (!uid) return null;

  const profileRef = db
    .collection('userProfiles')
    .doc(uid);

  let snapshot;

  try {
    snapshot = await profileRef.get({
      source: 'server'
    });
  } catch (serverError) {
    console.warn(
      'Server profile load failed, trying cache:',
      serverError
    );

    try {
      snapshot = await profileRef.get({
        source: 'cache'
      });
    } catch (cacheError) {
      console.warn(
        'Cached profile load failed:',
        cacheError
      );

      throw serverError;
    }
  }

  if (!snapshot.exists) {
    return {
      snapshot,
      data: {},
      score: 0,
      entryCount: 0
    };
  }

  const data = snapshot.data() || {};

  return {
    snapshot,
    data,
    score: 100000,
    entryCount: getProfileEntryCount(data)
  };
}

function hasSuspiciousEmptyOverwrite() {
  const currentTotal =
    (globalLoggedSessionsDatabaseMock?.length || 0) +
    (vacationLoggedDaysArrayCache?.length || 0) +
    (recentlyDeletedItemsBinCache?.length || 0);

  const baselineTotal =
    _cloudBaseline.work +
    _cloudBaseline.leave +
    _cloudBaseline.trash;

  return baselineTotal > 0 && currentTotal === 0;
}

function getCurrentCloudData() {
  return {
    work: Array.isArray(globalLoggedSessionsDatabaseMock)
      ? globalLoggedSessionsDatabaseMock
      : [],
    leave: Array.isArray(vacationLoggedDaysArrayCache)
      ? vacationLoggedDaysArrayCache
      : [],
    trash: Array.isArray(recentlyDeletedItemsBinCache)
      ? recentlyDeletedItemsBinCache
      : []
  };
}

async function persistUserDataNow() {
  if (_cloudDataLoading) return false;

  if (authenticatedUserRoleGlobal === 'admin') {
    return false;
  }

  try {
    const uid = await getAuthenticatedUid();

    if (!uid || !auth.currentUser) {
      throw new Error(
        'Cloud save blocked: no authenticated Firebase user.'
      );
    }

    if (auth.currentUser.uid !== uid) {
      throw new Error(
        'Cloud save blocked: authentication UID mismatch.'
      );
    }

    const profileRef = db
      .collection('userProfiles')
      .doc(uid);

    _cloudProfileRef = profileRef;

    if (hasSuspiciousEmptyOverwrite()) {
      throw new Error(
        'Cloud save blocked: existing cloud data would be replaced with empty arrays.'
      );
    }

    const currentData = getCurrentCloudData();

    let latestData = {};
    let latestSnapshot = null;

    try {
      latestSnapshot = await profileRef.get({
        source: 'server'
      });

      if (latestSnapshot.exists) {
        latestData = latestSnapshot.data() || {};
      }
    } catch (readError) {
      console.warn(
        'Pre-save profile check failed; continuing with merge save:',
        readError
      );
    }

    const latestCount = getProfileEntryCount(latestData);

    const currentCount =
      currentData.work.length +
      currentData.leave.length +
      currentData.trash.length;

    if (latestCount > 0 && currentCount === 0) {
      throw new Error(
        'Cloud save blocked: unsafe empty overwrite.'
      );
    }

    const vacationInput =
      document.getElementById('vacation-allowed-bank');

    const vacationValue = parseFloat(
      vacationInput?.value
    );

    const displayName =
      localStorage.getItem('schuermann_current_user') ||
      latestData.name ||
      auth.currentUser.displayName ||
      uid;

    const dataToSave = {
      uid,
      name: displayName,
      updatedAt:
        firebase.firestore.FieldValue.serverTimestamp(),
      vacationAllowed: Number.isFinite(vacationValue)
        ? vacationValue
        : (parseFloat(latestData.vacationAllowed) || 30)
    };

    dataToSave[_cloudFieldNames.work] =
      currentData.work;

    dataToSave[_cloudFieldNames.leave] =
      currentData.leave;

    dataToSave[_cloudFieldNames.trash] =
      currentData.trash;

    // merge:true preserves all other existing profile fields.
    await profileRef.set(dataToSave, {
      merge: true
    });

    _cloudBaseline = {
      work: currentData.work.length,
      leave: currentData.leave.length,
      trash: currentData.trash.length
    };

    _cloudDataLoaded = true;
    _cloudProfileRef = profileRef;

    console.info(
      `Cloud save successful: ${currentData.work.length} work logs saved to userProfiles/${uid}.`
    );

    return true;
  } catch (error) {
    console.error('Cloud save failed:', error);

    showToast(
      error?.code === 'permission-denied'
        ? 'Cloud-Speicherung nicht erlaubt. Bitte Firebase-Regeln und Anmeldung prüfen.'
        : 'Cloud-Speicherung fehlgeschlagen. Deine Daten bleiben in der App erhalten.',
      'error'
    );

    return false;
  }
}

function persistUserData() {
  if (_cloudDataLoading) return;

  if (authenticatedUserRoleGlobal === 'admin') {
    return;
  }

  if (_persistTimer) {
    clearTimeout(_persistTimer);
  }

  _persistTimer = setTimeout(async () => {
    _persistTimer = null;
    await persistUserDataNow();
  }, 400);
}

async function loadUserDataFromCloud() {
  if (authenticatedUserRoleGlobal === 'admin') {
    return false;
  }

  _cloudDataLoading = true;
  _cloudDataLoaded = false;
  _cloudProfileRef = null;

  try {
    const uid = await getAuthenticatedUid();

    if (!uid || !auth.currentUser) {
      throw new Error(
        'No authenticated Firebase user found.'
      );
    }

    if (auth.currentUser.uid !== uid) {
      throw new Error(
        'Authenticated Firebase UID does not match the active user.'
      );
    }

    const profileRef = db
      .collection('userProfiles')
      .doc(uid);

    const profile = await findBestUserProfile(uid);
    const snapshot = profile?.snapshot;

    if (!snapshot) {
      throw new Error(
        'Firebase profile could not be loaded.'
      );
    }

    _cloudProfileRef = profileRef;

    // A missing UID profile can be initialized without deleting local data.
    if (!snapshot.exists) {
      const currentData = getCurrentCloudData();

      await profileRef.set({
        uid,
        name:
          localStorage.getItem('schuermann_current_user') ||
          auth.currentUser.displayName ||
          uid,
        vacationAllowed: 30,
        workSessions: currentData.work,
        leaveDays: currentData.leave,
        trash: currentData.trash,
        createdAt:
          firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:
          firebase.firestore.FieldValue.serverTimestamp()
      }, {
        merge: true
      });

      _cloudFieldNames = {
        work: 'workSessions',
        leave: 'leaveDays',
        trash: 'trash'
      };

      _cloudBaseline = {
        work: currentData.work.length,
        leave: currentData.leave.length,
        trash: currentData.trash.length
      };

      _cloudDataLoaded = true;

      console.info(
        `Created UID-based profile userProfiles/${uid}.`
      );

      return true;
    }

    if (snapshot.id !== uid) {
      throw new Error(
        'Loaded profile does not belong to the authenticated user.'
      );
    }

    const data = profile.data || {};
    const workResult =
      readArrayFieldDetailed(data, WORK_FIELD_NAMES);

    const leaveResult =
      readArrayFieldDetailed(data, LEAVE_FIELD_NAMES);

    const trashResult =
      readArrayFieldDetailed(data, TRASH_FIELD_NAMES);

    globalLoggedSessionsDatabaseMock =
      workResult.values;

    vacationLoggedDaysArrayCache =
      leaveResult.values;

    recentlyDeletedItemsBinCache =
      trashResult.values;

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

    const storedAllowance = parseFloat(
      data.vacationAllowed
    );

    if (Number.isFinite(storedAllowance)) {
      const input =
        document.getElementById('vacation-allowed-bank');

      if (input) {
        input.value = storedAllowance;
      }
    }

    if (data.name) {
      localStorage.setItem(
        'schuermann_current_user',
        data.name
      );
    }

    if (data.companyName) {
      localStorage.setItem(
        'schuermann_company_name',
        data.companyName
      );
    }

    _cloudDataLoaded = true;

    console.info(
      `Loaded ${globalLoggedSessionsDatabaseMock.length} work logs from userProfiles/${uid}.`
    );

    return true;
  } catch (error) {
    console.error('Cloud load failed:', error);

    _cloudDataLoaded = false;
    _cloudProfileRef = null;

    showToast(
      error?.code === 'permission-denied'
        ? 'Cloud-Zugriff nicht erlaubt. Bitte Firebase-Regeln und Anmeldung prüfen.'
        : 'Cloud-Daten konnten nicht geladen werden. Vorhandene Daten bleiben erhalten.',
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
  const safeQueue = Array.isArray(queue)
    ? queue
    : [];

  localStorage.setItem(
    OFFLINE_QUEUE_KEY,
    JSON.stringify(safeQueue)
  );

  const badge =
    document.getElementById('offline-queue-badge');

  if (!badge) return;

  badge.classList.toggle(
    'visible',
    safeQueue.length > 0
  );

  badge.textContent = safeQueue.length
    ? `● ${safeQueue.length} offline`
    : '● Offline';
}

function updateOfflineBadge() {
  saveOfflineQueue(getOfflineQueue());
}

async function flushOfflineQueue() {
  if (authenticatedUserRoleGlobal === 'admin') {
    return;
  }

  if (!_cloudDataLoaded || !_cloudProfileRef) {
    return;
  }

  const queue = getOfflineQueue();

  if (!queue.length) return;

  showToast(
    activeLanguageGlobal === 'de'
      ? `↑ ${queue.length} Offline-Einträge werden synchronisiert...`
      : `↑ Syncing ${queue.length} offline entries...`,
    'info'
  );

  const failed = [];

  for (const entry of queue) {
    try {
      const alreadyExists =
        globalLoggedSessionsDatabaseMock.some(item => {
          return item.id &&
            entry.id &&
            item.id === entry.id;
        });

      if (!alreadyExists) {
        globalLoggedSessionsDatabaseMock.push(entry);
      }

      const saved = await persistUserDataNow();

      if (!saved) {
        failed.push(entry);
      }
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
    date:
      document.getElementById('log-date-picker')
        ?.value || '',
    project:
      document.getElementById('log-project-name')
        ?.value || '',
    start:
      document.getElementById('log-start-time')
        ?.value || '',
    end:
      document.getElementById('log-end-time')
        ?.value || '',
    notes:
      document.getElementById('log-notes')
        ?.value || '',
    brk: activeSelectedFormBreakDuration
  };

  if (draft.project || draft.notes) {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(draft)
    );
  }
}

function restoreDraftWorkEntry() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);

    if (!raw) return;

    const draft = JSON.parse(raw);

    const dateElement =
      document.getElementById('log-date-picker');

    const projectElement =
      document.getElementById('log-project-name');

    const startElement =
      document.getElementById('log-start-time');

    const endElement =
      document.getElementById('log-end-time');

    const notesElement =
      document.getElementById('log-notes');

    if (draft.date && dateElement) {
      dateElement.value = draft.date;
    }

    if (draft.project && projectElement) {
      projectElement.value = draft.project;
    }

    if (draft.start && startElement) {
      startElement.value = draft.start;
    }

    if (draft.end && endElement) {
      endElement.value = draft.end;
    }

    if (draft.notes && notesElement) {
      notesElement.value = draft.notes;
    }

    if (draft.brk != null) {
      activeSelectedFormBreakDuration =
        Number(draft.brk) || 0;

      document
        .querySelectorAll('.break-pill')
        .forEach(pill => {
          const onclickValue =
            pill.getAttribute('onclick') || '';

          const minutes = parseInt(
            onclickValue.match(/\d+/)?.[0] || '0',
            10
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
