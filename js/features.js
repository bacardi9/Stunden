function getRecordTimestamp(record) {
  const storedTimestamp = Number(
    record?.dateTimestamp ||
    record?.fromTimestamp ||
    record?.createdAt
  );

  if (Number.isFinite(storedTimestamp)) {
    return storedTimestamp;
  }

  if (typeof parseDMYLocal === 'function') {
    return parseDMYLocal(
      record?.date ||
      record?.fromDate ||
      record?.from ||
      ''
    );
  }

  return 0;
}

function getRecordDuration(record) {
  const duration = Number(
    record?.duration ??
    record?.hours ??
    record?.netHours ??
    0
  );

  return Number.isFinite(duration) ? duration : 0;
}

function getLeaveType(record) {
  const type = String(
    record?.type ||
    record?.leaveType ||
    ''
  ).toUpperCase();

  return type === 'SICK' ? 'SICK' : 'VACATION';
}

function getWorkType(record) {
  const type = String(record?.type || 'WORK').toUpperCase();
  return type === 'SCHOOL' ? 'SCHOOL' : 'WORK';
}

function getSafeRecordId(record, prefix) {
  if (record?.id) return String(record.id);

  const generatedId = typeof generateEntryId === 'function'
    ? generateEntryId(prefix)
    : `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  record.id = generatedId;
  return generatedId;
}

function createEmptyState(message, iconClass) {
  return `
    <div class="history-item" style="text-align:center;">
      <i class="${iconClass}"
         style="font-size:20px;color:#94a3b8;margin-bottom:8px;"></i>
      <h5>${escapeHtml(message)}</h5>
    </div>
  `;
}

function renderHistoricalRecordsSheet() {
  const container =
    document.getElementById('history-items-container');

  if (!container) return;

  const records = Array.isArray(globalLoggedSessionsDatabaseMock)
    ? [...globalLoggedSessionsDatabaseMock]
    : [];

  records.sort((left, right) => {
    return getRecordTimestamp(right) - getRecordTimestamp(left);
  });

  if (!records.length) {
    const message =
      uiTranslations?.[activeLanguageGlobal]?.emptyHist ||
      'Keine Einträge vorhanden.';

    container.innerHTML = createEmptyState(
      message,
      'fa-solid fa-clock-rotate-left'
    );

    renderQuickStatsStrip(records);
    return;
  }

  container.innerHTML = records.map(record => {
    const id = getSafeRecordId(record, 'work');
    const type = getWorkType(record);
    const isSchool = type === 'SCHOOL';

    const date = escapeHtml(record.date || '—');
    const project = escapeHtml(
      record.project ||
      record.projectName ||
      (isSchool ? 'Berufsschule' : 'Ohne Bezeichnung')
    );

    const startTime = escapeHtml(
      record.startTime || record.start || ''
    );

    const endTime = escapeHtml(
      record.endTime || record.end || ''
    );

    const breakMinutes = Number(
      record.breakMinutes ??
      record.breakDuration ??
      0
    ) || 0;

    const notes = escapeHtml(record.notes || '');
    const duration = getRecordDuration(record);

    const detailText = isSchool
      ? 'Schultag'
      : `${startTime || '—'} – ${endTime || '—'} · ` +
        `${breakMinutes} Min. Pause`;

    return `
      <article class="history-item"
               data-record-id="${escapeHtml(id)}">
        <div class="item-main-row">
          <div class="hist-left">
            <h5>
              ${isSchool
                ? '<i class="fa-solid fa-graduation-cap" ' +
                  'style="color:#0ea5e9;margin-right:6px;"></i>'
                : ''}
              ${project}
            </h5>
            <p>${date} · ${detailText}</p>
            ${notes && !isSchool
              ? `<p style="margin-top:5px;">${notes}</p>`
              : ''}
          </div>

          <div style="display:flex;align-items:center;gap:3px;">
            <div class="hist-right"
                 style="color:${isSchool ? '#0ea5e9' : '#E30613'};">
              ${isSchool ? 'Schule' : `${duration.toFixed(2)} h`}
            </div>

            <button type="button"
                    class="action-icon-btn delete-hover"
                    data-action="delete-work"
                    data-record-id="${escapeHtml(id)}"
                    title="Löschen"
                    aria-label="Eintrag löschen">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  container
    .querySelectorAll('[data-action="delete-work"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        deleteWorkRecord(button.dataset.recordId);
      });
    });

  renderQuickStatsStrip(records);
}

function renderQuickStatsStrip(records) {
  const container = document.getElementById('quick-stats-strip');

  if (!container) return;

  const workRecords = records.filter(record => {
    return getWorkType(record) === 'WORK';
  });

  const schoolDays = records.filter(record => {
    return getWorkType(record) === 'SCHOOL';
  }).length;

  const totalHours = workRecords.reduce((sum, record) => {
    return sum + getRecordDuration(record);
  }, 0);

  container.innerHTML = `
    <div style="
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin-bottom:14px;
    ">
      <div class="app-card"
           style="padding:12px;text-align:center;margin:0;">
        <div style="font-size:10px;color:#64748b;font-weight:700;">
          EINTRÄGE
        </div>
        <div style="font-size:18px;font-weight:800;margin-top:4px;">
          ${records.length}
        </div>
      </div>

      <div class="app-card"
           style="padding:12px;text-align:center;margin:0;">
        <div style="font-size:10px;color:#64748b;font-weight:700;">
          STUNDEN
        </div>
        <div style="
          font-size:18px;
          font-weight:800;
          color:#E30613;
          margin-top:4px;
        ">
          ${totalHours.toFixed(2)}
        </div>
      </div>

      <div class="app-card"
           style="padding:12px;text-align:center;margin:0;">
        <div style="font-size:10px;color:#64748b;font-weight:700;">
          SCHULTAGE
        </div>
        <div style="
          font-size:18px;
          font-weight:800;
          color:#0ea5e9;
          margin-top:4px;
        ">
          ${schoolDays}
        </div>
      </div>
    </div>
  `;
}

function renderVacationRecordsSheet() {
  const container =
    document.getElementById('vacation-days-list-container');

  if (!container) return;

  const records = Array.isArray(vacationLoggedDaysArrayCache)
    ? [...vacationLoggedDaysArrayCache]
    : [];

  records.sort((left, right) => {
    return getRecordTimestamp(right) - getRecordTimestamp(left);
  });

  if (!records.length) {
    const message =
      uiTranslations?.[activeLanguageGlobal]?.emptyLeave ||
      'Keine Urlaubs- oder Krankheitsdaten.';

    container.innerHTML = createEmptyState(
      message,
      'fa-solid fa-calendar-check'
    );

    return;
  }

  container.innerHTML = records.map(record => {
    const id = getSafeRecordId(record, 'leave');
    const type = getLeaveType(record);
    const isSick = type === 'SICK';

    const fromDate = escapeHtml(
      record.fromDate ||
      record.from ||
      record.date ||
      '—'
    );

    const toDate = escapeHtml(
      record.toDate ||
      record.to ||
      record.date ||
      '—'
    );

    const notes = escapeHtml(
      record.notes ||
      record.description ||
      ''
    );

    const days = Number(
      record.days ??
      record.duration ??
      0
    ) || 0;

    const title = isSick
      ? 'Arbeitsunfähigkeit'
      : 'Erholungsurlaub';

    const color = isSick ? '#ef4444' : '#3b82f6';
    const icon = isSick
      ? 'fa-solid fa-notes-medical'
      : 'fa-solid fa-umbrella-beach';

    return `
      <article class="history-item"
               style="border-left-color:${color};"
               data-leave-id="${escapeHtml(id)}">
        <div class="item-main-row">
          <div class="hist-left">
            <h5>
              <i class="${icon}"
                 style="color:${color};margin-right:6px;"></i>
              ${title}
            </h5>
            <p>
              ${fromDate}${fromDate !== toDate ? ` – ${toDate}` : ''}
            </p>
            ${notes
              ? `<p style="margin-top:5px;">${notes}</p>`
              : ''}
          </div>

          <div style="display:flex;align-items:center;gap:3px;">
            <div class="hist-right" style="color:${color};">
              ${days} ${days === 1 ? 'Tag' : 'Tage'}
            </div>

            <button type="button"
                    class="action-icon-btn delete-hover"
                    data-action="delete-leave"
                    data-leave-id="${escapeHtml(id)}"
                    title="Löschen"
                    aria-label="Fehlzeit löschen">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  container
    .querySelectorAll('[data-action="delete-leave"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        deleteLeaveRecord(button.dataset.leaveId);
      });
    });
}

function purgeExpiredTrashItems() {
  const expirationTime = 12 * 60 * 60 * 1000;
  const now = Date.now();

  const originalLength = recentlyDeletedItemsBinCache.length;

  recentlyDeletedItemsBinCache =
    recentlyDeletedItemsBinCache.filter(item => {
      const deletedAt = Number(item.deletedAt || 0);

      return !deletedAt || now - deletedAt < expirationTime;
    });

  return recentlyDeletedItemsBinCache.length !== originalLength;
}

function renderRecentlyDeletedBinSheet() {
  const container =
    document.getElementById('deleted-items-bin-container');

  if (!container) return;

  const removedExpiredItems = purgeExpiredTrashItems();

  if (removedExpiredItems) {
    persistUserData();
  }

  const records = Array.isArray(recentlyDeletedItemsBinCache)
    ? [...recentlyDeletedItemsBinCache]
    : [];

  records.sort((left, right) => {
    return Number(right.deletedAt || 0) -
      Number(left.deletedAt || 0);
  });

  if (!records.length) {
    const message =
      uiTranslations?.[activeLanguageGlobal]?.emptyTrash ||
      'Papierkorb ist leer.';

    container.innerHTML = createEmptyState(
      message,
      'fa-solid fa-trash-can'
    );

    return;
  }

  container.innerHTML = records.map(record => {
    const trashId = getSafeRecordId(record, 'trash');
    const sourceKind = record.sourceKind || inferTrashSource(record);

    const title = sourceKind === 'leave'
      ? getLeaveType(record) === 'SICK'
        ? 'Arbeitsunfähigkeit'
        : 'Erholungsurlaub'
      : getWorkType(record) === 'SCHOOL'
        ? 'Berufsschule'
        : record.project || record.projectName || 'Arbeitseintrag';

    const date = record.date ||
      record.fromDate ||
      record.from ||
      '—';

    return `
      <article class="history-item"
               style="border-left-color:#64748b;"
               data-trash-id="${escapeHtml(trashId)}">
        <div class="item-main-row">
          <div class="hist-left">
            <h5>${escapeHtml(title)}</h5>
            <p>
              ${escapeHtml(date)}
              · gelöscht
              ${formatDeletedTime(record.deletedAt)}
            </p>
          </div>

          <div style="display:flex;align-items:center;gap:5px;">
            <button type="button"
                    class="restore-btn"
                    data-action="restore"
                    data-trash-id="${escapeHtml(trashId)}">
              Wiederherstellen
            </button>

            <button type="button"
                    class="action-icon-btn delete-hover"
                    data-action="delete-permanently"
                    data-trash-id="${escapeHtml(trashId)}"
                    title="Endgültig löschen"
                    aria-label="Endgültig löschen">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  container
    .querySelectorAll('[data-action="restore"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        restoreDeletedRecord(button.dataset.trashId);
      });
    });

  container
    .querySelectorAll('[data-action="delete-permanently"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        permanentlyDeleteRecord(button.dataset.trashId);
      });
    });
}

function inferTrashSource(record) {
  const type = String(
    record?.type ||
    record?.leaveType ||
    ''
  ).toUpperCase();

  return type === 'VACATION' || type === 'SICK'
    ? 'leave'
    : 'work';
}

function formatDeletedTime(timestamp) {
  const value = Number(timestamp);

  if (!Number.isFinite(value)) return '';

  return new Date(value).toLocaleString(
    activeLanguageGlobal === 'en' ? 'en-GB' : 'de-DE',
    {
      dateStyle: 'short',
      timeStyle: 'short'
    }
  );
}

function moveRecordToTrash(record, sourceKind) {
  const trashRecord = {
    ...record,
    sourceKind,
    deletedAt: Date.now()
  };

  getSafeRecordId(trashRecord, 'trash');
  recentlyDeletedItemsBinCache.push(trashRecord);
}

function deleteWorkRecord(id) {
  const index = globalLoggedSessionsDatabaseMock.findIndex(record => {
    return String(record.id) === String(id);
  });

  if (index === -1) return;

  const [deletedRecord] =
    globalLoggedSessionsDatabaseMock.splice(index, 1);

  moveRecordToTrash(deletedRecord, 'work');
  refreshAllDataViews();
  persistUserData();

  showToast('Eintrag wurde in den Papierkorb verschoben.', 'success');
}

function deleteLeaveRecord(id) {
  const index = vacationLoggedDaysArrayCache.findIndex(record => {
    return String(record.id) === String(id);
  });

  if (index === -1) return;

  const [deletedRecord] =
    vacationLoggedDaysArrayCache.splice(index, 1);

  moveRecordToTrash(deletedRecord, 'leave');
  refreshAllDataViews();
  persistUserData();

  showToast(
    'Fehlzeit wurde in den Papierkorb verschoben.',
    'success'
  );
}

function restoreDeletedRecord(id) {
  const index = recentlyDeletedItemsBinCache.findIndex(record => {
    return String(record.id) === String(id);
  });

  if (index === -1) return;

  const [record] = recentlyDeletedItemsBinCache.splice(index, 1);
  const sourceKind = record.sourceKind || inferTrashSource(record);

  const restoredRecord = { ...record };
  delete restoredRecord.deletedAt;
  delete restoredRecord.sourceKind;

  if (sourceKind === 'leave') {
    const duplicate = vacationLoggedDaysArrayCache.some(item => {
      return String(item.id) === String(restoredRecord.id);
    });

    if (!duplicate) {
      vacationLoggedDaysArrayCache.push(restoredRecord);
    }
  } else {
    const duplicate = globalLoggedSessionsDatabaseMock.some(item => {
      return String(item.id) === String(restoredRecord.id);
    });

    if (!duplicate) {
      globalLoggedSessionsDatabaseMock.push(restoredRecord);
    }
  }

  refreshAllDataViews();
  persistUserData();

  showToast('Eintrag wurde wiederhergestellt.', 'success');
}

function permanentlyDeleteRecord(id) {
  const index = recentlyDeletedItemsBinCache.findIndex(record => {
    return String(record.id) === String(id);
  });

  if (index === -1) return;

  const confirmed = window.confirm(
    'Diesen Eintrag endgültig löschen?'
  );

  if (!confirmed) return;

  recentlyDeletedItemsBinCache.splice(index, 1);

  renderRecentlyDeletedBinSheet();
  persistUserData();

  showToast('Eintrag wurde endgültig gelöscht.', 'success');
}

function refreshAllDataViews() {
  renderHistoricalRecordsSheet();
  renderVacationRecordsSheet();
  renderRecentlyDeletedBinSheet();

  if (typeof runGlobalApplicationMetricsEngine === 'function') {
    runGlobalApplicationMetricsEngine();
  }
}

function setLeaveManagementType(type) {
  activeLeaveSubManagementType =
    type === 'sick' ? 'sick' : 'vacation';

  const isSick = activeLeaveSubManagementType === 'sick';

  document
    .getElementById('toggle-leave-vacation')
    ?.classList.toggle('active', !isSick);

  document
    .getElementById('toggle-leave-sick')
    ?.classList.toggle('active', isSick);

  const label = document.getElementById('leave-context-label');
  const input = document.getElementById('vacation-notes-input');
  const button = document.getElementById('leave-submit-btn');

  const translations =
    uiTranslations?.[activeLanguageGlobal] ||
    uiTranslations?.de;

  if (label) {
    label.textContent = isSick
      ? translations?.vacContextS || 'Grund / Attest'
      : translations?.vacContextV || 'Urlaubsgrund';
  }

  if (input) {
    input.placeholder = isSick
      ? translations?.vacPlhS || 'Krankmeldung'
      : translations?.vacPlhV || 'Erholungsurlaub';
  }

  if (button) {
    button.textContent = isSick
      ? translations?.vacSubmitS || 'Krankmeldung registrieren'
      : translations?.vacSubmitV || 'Urlaub eintragen';
  }
}

function openHiddenTrashView() {
  switchActiveView('deleted', null);
}

function handleSecureSignOutRequest() {
  localStorage.removeItem('schuermann_auth_user');
  localStorage.removeItem('schuermann_current_user');

  auth.signOut().finally(() => {
    window.location.reload();
  });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return String(text == null ? '' : text).replace(
    /[&<>"']/g,
    character => map[character]
  );
}
