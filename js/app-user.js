function parseDMYLocal(dateStr) {
  const value = String(dateStr || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  const parts = value.split(/[./]/).map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return NaN;
  }

  return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
}

function formatDateDMY(date) {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear()
  ].join('.');
}

function generateEntryId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function timeToMinutes(time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);

  if (!match) return NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return NaN;
  }

  return (hours * 60) + minutes;
}

function calculateNetDuration(startTime, endTime, breakMinutes) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const pause = Math.max(0, Number(breakMinutes) || 0);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return NaN;
  }

  const grossMinutes = end - start;

  if (grossMinutes <= 0 || pause >= grossMinutes) {
    return NaN;
  }

  return Number(((grossMinutes - pause) / 60).toFixed(2));
}

function createWorkSession({
  date,
  project,
  startTime,
  endTime,
  breakMinutes = 0,
  notes = ''
}) {
  const cleanDate = String(date || '').trim();
  const cleanProject = String(project || '').trim();
  const cleanStartTime = String(startTime || '').trim();
  const cleanEndTime = String(endTime || '').trim();
  const cleanNotes = String(notes || '').trim();
  const safeBreakMinutes = Math.max(0, Number(breakMinutes) || 0);
  const dateTimestamp = parseDMYLocal(cleanDate);
  const duration = calculateNetDuration(
    cleanStartTime,
    cleanEndTime,
    safeBreakMinutes
  );

  if (
    !cleanDate ||
    !cleanProject ||
    !cleanStartTime ||
    !cleanEndTime ||
    !Number.isFinite(dateTimestamp)
  ) {
    throw new Error(
      'Bitte Datum, Baustelle und Arbeitszeiten vollständig eingeben.'
    );
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(
      'Arbeitsende muss nach Arbeitsbeginn und der Pausenzeit liegen.'
    );
  }

  const timestamp = Date.now();

  return {
    id: generateEntryId('work'),
    type: 'WORK',
    date: cleanDate,
    dateTimestamp,
    project: cleanProject,
    projectName: cleanProject,
    startTime: cleanStartTime,
    endTime: cleanEndTime,
    start: cleanStartTime,
    end: cleanEndTime,
    breakMinutes: safeBreakMinutes,
    breakDuration: safeBreakMinutes,
    notes: cleanNotes,
    duration,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function hasOverlappingWorkSession(date, startTime, endTime) {
  const proposedStart = timeToMinutes(startTime);
  const proposedEnd = timeToMinutes(endTime);

  return globalLoggedSessionsDatabaseMock.some(record => {
    if (
      record.type === 'SCHOOL' ||
      String(record.date) !== String(date)
    ) {
      return false;
    }

    const existingStart = timeToMinutes(
      record.startTime || record.start
    );

    const existingEnd = timeToMinutes(
      record.endTime || record.end
    );

    if (
      !Number.isFinite(existingStart) ||
      !Number.isFinite(existingEnd)
    ) {
      return false;
    }

    return proposedStart < existingEnd &&
      proposedEnd > existingStart;
  });
}

function countWorkingDays(fromTimestamp, toTimestamp) {
  let count = 0;
  const cursor = new Date(fromTimestamp);
  const end = new Date(toTimestamp);

  cursor.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);

  while (cursor <= end) {
    const weekday = cursor.getDay();

    if (weekday !== 0 && weekday !== 6) {
      count += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function refreshUserInterfaceAfterMutation() {
  if (typeof renderHistoricalRecordsSheet === 'function') {
    renderHistoricalRecordsSheet();
  }

  if (typeof renderVacationRecordsSheet === 'function') {
    renderVacationRecordsSheet();
  }

  if (typeof renderRecentlyDeletedBinSheet === 'function') {
    renderRecentlyDeletedBinSheet();
  }

  if (typeof runGlobalApplicationMetricsEngine === 'function') {
    runGlobalApplicationMetricsEngine();
  }
}

function handleNewRecordSubmission(event) {
  event.preventDefault();

  const date =
    document.getElementById('log-date-picker')?.value.trim() || '';

  const project =
    document.getElementById('log-project-name')?.value.trim() || '';

  const startTime =
    document.getElementById('log-start-time')?.value || '';

  const endTime =
    document.getElementById('log-end-time')?.value || '';

  const notes =
    document.getElementById('log-notes')?.value.trim() || '';

  let record;

  try {
    record = createWorkSession({
      date,
      project,
      startTime,
      endTime,
      breakMinutes: activeSelectedFormBreakDuration,
      notes
    });
  } catch (error) {
    showToast(
      error?.message || 'Arbeitszeit konnte nicht erstellt werden.',
      'error'
    );
    return;
  }

  if (hasOverlappingWorkSession(date, startTime, endTime)) {
    showToast(
      'Für diesen Zeitraum besteht bereits ein Arbeitseintrag.',
      'error'
    );
    return;
  }

  globalLoggedSessionsDatabaseMock.push(record);

  globalLoggedSessionsDatabaseMock.sort((left, right) => {
    return (right.dateTimestamp || parseDMYLocal(right.date)) -
      (left.dateTimestamp || parseDMYLocal(left.date));
  });

  clearDraftWorkEntry?.();

  const form = document.getElementById('shift-submission-form');
  form?.reset();

  activeSelectedFormBreakDuration = 0;

  document.querySelectorAll('.break-pill').forEach((pill, index) => {
    pill.classList.toggle('active', index === 0);
  });

  setDefaultDatePickerValue('log-date-picker');
  refreshUserInterfaceAfterMutation();
  persistUserData();

  showToast('Arbeitszeit wurde gespeichert.', 'success');
}

function handleVacationDayLogSubmission(event) {
  event.preventDefault();

  const fromDate =
    document
      .getElementById('vacation-from-date-input')
      ?.value.trim() || '';

  const toDate =
    document
      .getElementById('vacation-to-date-input')
      ?.value.trim() || '';

  const notes =
    document
      .getElementById('vacation-notes-input')
      ?.value.trim() || '';

  const fromTimestamp = parseDMYLocal(fromDate);
  const toTimestamp = parseDMYLocal(toDate);

  if (
    !fromDate ||
    !toDate ||
    !notes ||
    !Number.isFinite(fromTimestamp) ||
    !Number.isFinite(toTimestamp)
  ) {
    showToast(
      'Bitte Zeitraum und Beschreibung vollständig eingeben.',
      'error'
    );
    return;
  }

  if (toTimestamp < fromTimestamp) {
    showToast(
      'Das Enddatum darf nicht vor dem Startdatum liegen.',
      'error'
    );
    return;
  }

  const overlappingEntry = vacationLoggedDaysArrayCache.some(entry => {
    const existingStart = Number.isFinite(entry.fromTimestamp)
      ? entry.fromTimestamp
      : parseDMYLocal(entry.fromDate || entry.from || entry.date);

    const existingEnd = Number.isFinite(entry.toTimestamp)
      ? entry.toTimestamp
      : parseDMYLocal(entry.toDate || entry.to || entry.date);

    if (
      !Number.isFinite(existingStart) ||
      !Number.isFinite(existingEnd)
    ) {
      return false;
    }

    return fromTimestamp <= existingEnd &&
      toTimestamp >= existingStart;
  });

  if (overlappingEntry) {
    showToast(
      'Für diesen Zeitraum besteht bereits eine Fehlzeit.',
      'error'
    );
    return;
  }

  const days = countWorkingDays(fromTimestamp, toTimestamp);

  if (days === 0) {
    showToast(
      'Der ausgewählte Zeitraum enthält keine Arbeitstage.',
      'error'
    );
    return;
  }

  const type = activeLeaveSubManagementType === 'sick'
    ? 'SICK'
    : 'VACATION';

  vacationLoggedDaysArrayCache.push({
    id: generateEntryId('leave'),
    type,
    leaveType: type.toLowerCase(),
    fromDate,
    toDate,
    from: fromDate,
    to: toDate,
    fromTimestamp,
    toTimestamp,
    date: fromDate,
    notes,
    description: notes,
    days,
    duration: days,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  vacationLoggedDaysArrayCache.sort((left, right) => {
    const leftDate = left.fromTimestamp ||
      parseDMYLocal(left.fromDate || left.date);

    const rightDate = right.fromTimestamp ||
      parseDMYLocal(right.fromDate || right.date);

    return rightDate - leftDate;
  });

  document.getElementById('vacation-entry-form')?.reset();

  setDefaultDatePickerValue('vacation-from-date-input');
  setDefaultDatePickerValue('vacation-to-date-input');

  refreshUserInterfaceAfterMutation();
  persistUserData();

  showToast(
    type === 'SICK'
      ? 'Krankmeldung wurde gespeichert.'
      : 'Urlaub wurde gespeichert.',
    'success'
  );
}

function handleSchuleSubmission() {
  const date =
    document.getElementById('schule-date-picker')?.value.trim() || '';

  const dateTimestamp = parseDMYLocal(date);

  if (!date || !Number.isFinite(dateTimestamp)) {
    showToast('Bitte einen Schultag auswählen.', 'error');
    return;
  }

  const duplicate = globalLoggedSessionsDatabaseMock.some(record => {
    return String(record.date) === String(date) &&
      record.type === 'SCHOOL';
  });

  if (duplicate) {
    showToast(
      'Dieser Schultag wurde bereits eingetragen.',
      'error'
    );
    return;
  }

  globalLoggedSessionsDatabaseMock.push({
    id: generateEntryId('school'),
    type: 'SCHOOL',
    date,
    dateTimestamp,
    project: 'Berufsschule',
    projectName: 'Berufsschule',
    startTime: '',
    endTime: '',
    start: '',
    end: '',
    breakMinutes: 0,
    breakDuration: 0,
    notes: 'Berufsschule',
    duration: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  globalLoggedSessionsDatabaseMock.sort((left, right) => {
    return (right.dateTimestamp || parseDMYLocal(right.date)) -
      (left.dateTimestamp || parseDMYLocal(left.date));
  });

  setDefaultDatePickerValue('schule-date-picker');
  refreshUserInterfaceAfterMutation();
  persistUserData();

  showToast('Schultag wurde gespeichert.', 'success');
}

function selectBreakOption(minutes, button) {
  document.querySelectorAll('.break-pill').forEach(pill => {
    pill.classList.remove('active');
  });

  button?.classList.add('active');
  activeSelectedFormBreakDuration = Number(minutes) || 0;
  saveDraftWorkEntry?.();
}

function getKnownProjectNames() {
  return [
    ...new Set(
      globalLoggedSessionsDatabaseMock
        .filter(record => record.type !== 'SCHOOL')
        .map(record => record.project || record.projectName || '')
        .filter(Boolean)
    )
  ].sort((left, right) => left.localeCompare(right, 'de'));
}

function showProjectSuggestions(value) {
  const container =
    document.getElementById('project-autocomplete-list');

  if (!container) return;

  const query = String(value || '').trim().toLocaleLowerCase('de');

  if (!query) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  const matches = getKnownProjectNames()
    .filter(project => project.toLocaleLowerCase('de').includes(query))
    .slice(0, 8);

  if (!matches.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.innerHTML = matches.map(project => {
    const safeProject = escapeHtml(project);

    return `
      <div class="autocomplete-item"
           data-project="${safeProject}">
        <i class="fa-solid fa-location-dot"></i>
        <span>${safeProject}</span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('mousedown', event => {
      event.preventDefault();

      const input = document.getElementById('log-project-name');

      if (input) {
        input.value = item.dataset.project || '';
      }

      hideProjectSuggestions();
      saveDraftWorkEntry?.();
    });
  });

  container.style.display = 'block';
  saveDraftWorkEntry?.();
}

function hideProjectSuggestions() {
  const container =
    document.getElementById('project-autocomplete-list');

  if (!container) return;

  container.style.display = 'none';
}

async function handleFeedbackSubmissionEngine(event) {
  event.preventDefault();

  const input = document.getElementById('feedback-message');
  const button = document.getElementById('btn-feedback-submit');
  const message = input?.value.trim() || '';

  if (!message) {
    showToast('Bitte eine Nachricht eingeben.', 'error');
    return;
  }

  if (!auth.currentUser) {
    showToast('Bitte erneut anmelden.', 'error');
    return;
  }

  if (button) button.disabled = true;

  try {
    await db.collection('feedback').add({
      uid: auth.currentUser.uid,
      name:
        localStorage.getItem('schuermann_current_user') ||
        auth.currentUser.displayName ||
        'User',
      message,
      createdAt:
        firebase.firestore.FieldValue.serverTimestamp()
    });

    if (input) input.value = '';
    showToast('Feedback wurde gesendet.', 'success');
  } catch (error) {
    console.error('Feedback submission failed:', error);
    showToast('Feedback konnte nicht gesendet werden.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function handlePasswordChange() {
  const currentPassword =
    document.getElementById('pin-current')?.value || '';

  const newPassword =
    document.getElementById('pin-new')?.value || '';

  const confirmation =
    document.getElementById('pin-confirm')?.value || '';

  if (!auth.currentUser?.email) {
    showToast('Bitte erneut anmelden.', 'error');
    return;
  }

  if (!currentPassword || newPassword.length < 6) {
    showToast(
      'Das neue Kennwort muss mindestens 6 Zeichen haben.',
      'error'
    );
    return;
  }

  if (newPassword !== confirmation) {
    showToast('Die neuen Kennwörter stimmen nicht überein.', 'error');
    return;
  }

  try {
    const credential = firebase.auth.EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );

    await auth.currentUser.reauthenticateWithCredential(credential);
    await auth.currentUser.updatePassword(newPassword);

    ['pin-current', 'pin-new', 'pin-confirm'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });

    showToast('Kennwort wurde aktualisiert.', 'success');
  } catch (error) {
    console.error('Password update failed:', error);
    showToast(
      error?.code === 'auth/wrong-password' ||
      error?.code === 'auth/invalid-credential'
        ? 'Das aktuelle Kennwort ist falsch.'
        : 'Kennwort konnte nicht aktualisiert werden.',
      'error'
    );
  }
}

function logoutOtherDevicesEngine() {
  showToast(
    'Firebase unterstützt das Abmelden anderer Geräte nur über einen sicheren Server.',
    'info'
  );
}

function setDefaultDatePickerValue(elementId) {
  const element = document.getElementById(elementId);

  if (!element) return;

  const today = formatDateDMY(new Date());

  if (element._flatpickr) {
    element._flatpickr.setDate(today, false, 'd.m.Y');
  } else {
    element.value = today;
  }
}

function initializeTimeSelects() {
  const startSelect = document.getElementById('log-start-time');
  const endSelect = document.getElementById('log-end-time');

  if (!startSelect || !endSelect) return;

  const options = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 15) {
      const value =
        `${String(hour).padStart(2, '0')}:` +
        `${String(minute).padStart(2, '0')}`;

      options.push(`<option value="${value}">${value}</option>`);
    }
  }

  startSelect.innerHTML = options.join('');
  endSelect.innerHTML = options.join('');

  startSelect.value = '07:00';
  endSelect.value = '16:00';
}

function initializeUserDatePickers() {
  const pickerIds = [
    'log-date-picker',
    'schule-date-picker',
    'vacation-from-date-input',
    'vacation-to-date-input',
    'export-start-date',
    'export-end-date'
  ];

  pickerIds.forEach(id => {
    const element = document.getElementById(id);

    if (!element) return;

    if (typeof flatpickr === 'function' && !element._flatpickr) {
      flatpickr(element, {
        dateFormat: 'd.m.Y',
        allowInput: false,
        defaultDate: new Date(),
        locale: {
          firstDayOfWeek: 1
        }
      });
    } else if (!element.value) {
      element.value = formatDateDMY(new Date());
    }
  });
}

function showToast(message, type) {
  const toast = document.getElementById('toast-notification');

  if (!toast) return;

  toast.textContent = message;
  toast.className = type || 'info';
  toast.classList.add('show');

  clearTimeout(showToast._timer);

  showToast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  initializeTimeSelects();
  initializeUserDatePickers();
  restoreDraftWorkEntry?.();

  [
    'log-date-picker',
    'log-start-time',
    'log-end-time',
    'log-notes'
  ].forEach(id => {
    document.getElementById(id)?.addEventListener(
      'change',
      () => saveDraftWorkEntry?.()
    );
  });
});