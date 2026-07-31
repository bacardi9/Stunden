function getMetricRecordDate(record) {
  const storedTimestamp = Number(record?.dateTimestamp);

  if (Number.isFinite(storedTimestamp)) {
    return new Date(storedTimestamp);
  }

  const timestamp = typeof parseDMYLocal === 'function'
    ? parseDMYLocal(record?.date || '')
    : NaN;

  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function getMetricDuration(record) {
  const duration = Number(
    record?.duration ??
    record?.hours ??
    record?.netHours ??
    0
  );

  return Number.isFinite(duration) ? duration : 0;
}

function getDailyTargetHours(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 0;
  }

  const weekday = date.getDay();

  if (weekday === 0 || weekday === 6) return 0;
  if (weekday === 5) return 6;

  const configuredTarget = Number(
    document.getElementById('shift-target-constraint')?.value
  );

  return Number.isFinite(configuredTarget)
    ? configuredTarget
    : 8.5;
}

function getWorkMetrics() {
  const records = Array.isArray(globalLoggedSessionsDatabaseMock)
    ? globalLoggedSessionsDatabaseMock
    : [];

  const dailyHours = {};
  let totalHours = 0;
  let schoolDays = 0;

  records.forEach(record => {
    const type = String(record?.type || 'WORK').toUpperCase();

    if (type === 'SCHOOL') {
      schoolDays += 1;
      return;
    }

    const duration = getMetricDuration(record);
    const date = getMetricRecordDate(record);

    if (!date || duration <= 0) return;

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');

    totalHours += duration;
    dailyHours[dateKey] = (dailyHours[dateKey] || 0) + duration;
  });

  let overtimeHours = 0;
  dailyWorkTimeBreakdownLogs = {};
  dailyOvertimeBreakdownLogs = {};

  Object.entries(dailyHours).forEach(([dateKey, hours]) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    const target = getDailyTargetHours(date);
    const overtime = hours - target;

    dailyWorkTimeBreakdownLogs[dateKey] = Number(hours.toFixed(2));
    dailyOvertimeBreakdownLogs[dateKey] =
      Number(overtime.toFixed(2));

    overtimeHours += overtime;
  });

  return {
    totalHours: Number(totalHours.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    entryCount: records.length,
    schoolDays,
    dailyHours
  };
}

function runGlobalApplicationMetricsEngine() {
  const metrics = getWorkMetrics();

  const hoursElement =
    document.getElementById('dash-gross-hours');

  const overtimeElement =
    document.getElementById('dash-overtime-hours');

  if (hoursElement) {
    hoursElement.textContent =
      `${metrics.totalHours.toFixed(2)} hrs`;
  }

  if (overtimeElement) {
    const sign = metrics.overtimeHours >= 0 ? '+' : '';

    overtimeElement.textContent =
      `${sign}${metrics.overtimeHours.toFixed(2)} hrs`;

    overtimeElement.style.color =
      metrics.overtimeHours >= 0 ? '#10b981' : '#ef4444';
  }

  renderHistoricalRecordsSheet?.();
  renderVacationRecordsSheet?.();
}

function getSortedBreakdownEntries(source) {
  return Object.entries(source || {}).sort((left, right) => {
    return right[0].localeCompare(left[0]);
  });
}

function formatBreakdownDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Intl.DateTimeFormat(
    activeLanguageGlobal === 'en' ? 'en-GB' : 'de-DE',
    {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }
  ).format(new Date(year, month - 1, day, 12));
}

function openSummaryModal(title, iconClass, content) {
  const backdrop =
    document.getElementById('custom-report-modal-backdrop');

  const titleElement =
    document.getElementById('custom-modal-title-header');

  const iconElement =
    document.getElementById('custom-modal-icon-header');

  const body =
    document.getElementById('modal-report-content-body');

  if (!backdrop || !titleElement || !iconElement || !body) {
    return;
  }

  titleElement.textContent = title;
  iconElement.className = iconClass;
  body.innerHTML = content;
  backdrop.classList.add('show');
}

function closeCustomReportModal() {
  document
    .getElementById('custom-report-modal-backdrop')
    ?.classList.remove('show');
}

function displayWorkTimeBreakdownSummary() {
  const metrics = getWorkMetrics();
  const entries = getSortedBreakdownEntries(
    dailyWorkTimeBreakdownLogs
  );

  const translations =
    uiTranslations?.[activeLanguageGlobal] ||
    uiTranslations?.de;

  const rows = entries.length
    ? entries.map(([dateKey, hours]) => `
        <div class="modal-report-row">
          <span>${formatBreakdownDate(dateKey)}</span>
          <strong>${Number(hours).toFixed(2)} h</strong>
        </div>
      `).join('')
    : `<p style="color:#64748b;font-size:13px;">
         ${translations?.noWorkMsg || 'Keine Arbeitsstunden erfasst.'}
       </p>`;

  openSummaryModal(
    translations?.modalWorkTitle || 'Netto-Arbeitszeit',
    'fa-solid fa-clock',
    `
      <div class="statement-summary-box">
        <div>
          <span>Gesamt</span>
          <strong>${metrics.totalHours.toFixed(2)} h</strong>
        </div>
        <div>
          <span>Einträge</span>
          <strong>${metrics.entryCount}</strong>
        </div>
        <div>
          <span>Schultage</span>
          <strong>${metrics.schoolDays}</strong>
        </div>
      </div>
      ${rows}
    `
  );
}

function displayOvertimeBreakdownSummary() {
  const metrics = getWorkMetrics();
  const entries = getSortedBreakdownEntries(
    dailyOvertimeBreakdownLogs
  );

  const translations =
    uiTranslations?.[activeLanguageGlobal] ||
    uiTranslations?.de;

  const rows = entries.length
    ? entries.map(([dateKey, overtime]) => {
        const value = Number(overtime);
        const sign = value >= 0 ? '+' : '';
        const color = value >= 0 ? '#10b981' : '#ef4444';

        return `
          <div class="modal-report-row">
            <span>${formatBreakdownDate(dateKey)}</span>
            <strong style="color:${color};">
              ${sign}${value.toFixed(2)} h
            </strong>
          </div>
        `;
      }).join('')
    : `<p style="color:#64748b;font-size:13px;">
         ${translations?.noOtMsg ||
           'Keine Überstunden im aktuellen Zeitraum.'}
       </p>`;

  const totalSign = metrics.overtimeHours >= 0 ? '+' : '';
  const totalColor =
    metrics.overtimeHours >= 0 ? '#10b981' : '#ef4444';

  openSummaryModal(
    translations?.modalOtTitle || 'Überstunden',
    'fa-solid fa-chart-line',
    `
      <div class="statement-summary-box">
        <div>
          <span>Gesamtsaldo</span>
          <strong style="color:${totalColor};">
            ${totalSign}${metrics.overtimeHours.toFixed(2)} h
          </strong>
        </div>
      </div>
      ${rows}
    `
  );
}

function getLeaveMetrics() {
  const records = Array.isArray(vacationLoggedDaysArrayCache)
    ? vacationLoggedDaysArrayCache
    : [];

  let vacationDays = 0;
  let sickDays = 0;

  records.forEach(record => {
    const type = String(
      record?.type ||
      record?.leaveType ||
      ''
    ).toUpperCase();

    const days = Number(
      record?.days ??
      record?.duration ??
      0
    );

    const safeDays = Number.isFinite(days) ? days : 0;

    if (type === 'SICK') {
      sickDays += safeDays;
    } else {
      vacationDays += safeDays;
    }
  });

  const configuredAllowance = Number(
    document.getElementById('vacation-allowed-bank')?.value
  );

  const allowance = Number.isFinite(configuredAllowance)
    ? configuredAllowance
    : 30;

  return {
    allowance,
    vacationDays,
    sickDays,
    remainingDays: allowance - vacationDays
  };
}

function displayLeaveStatementBalancesSummary() {
  const metrics = getLeaveMetrics();

  const translations =
    uiTranslations?.[activeLanguageGlobal] ||
    uiTranslations?.de;

  const records = Array.isArray(vacationLoggedDaysArrayCache)
    ? [...vacationLoggedDaysArrayCache]
    : [];

  records.sort((left, right) => {
    const leftTime = Number(
      left.fromTimestamp ||
      parseDMYLocal(left.fromDate || left.from || left.date)
    );

    const rightTime = Number(
      right.fromTimestamp ||
      parseDMYLocal(right.fromDate || right.from || right.date)
    );

    return rightTime - leftTime;
  });

  const rows = records.length
    ? records.map(record => {
        const type = String(
          record.type ||
          record.leaveType ||
          ''
        ).toUpperCase();

        const isSick = type === 'SICK';
        const days = Number(
          record.days ??
          record.duration ??
          0
        ) || 0;

        const from =
          record.fromDate ||
          record.from ||
          record.date ||
          '—';

        const to =
          record.toDate ||
          record.to ||
          record.date ||
          '—';

        return `
          <div class="modal-report-row">
            <span>
              ${isSick
                ? translations?.lblSickToken || 'KRANKMELDUNG'
                : translations?.lblVacToken || 'URLAUB'}
              <small style="display:block;color:#64748b;">
                ${escapeHtml(from)}
                ${from !== to ? ` – ${escapeHtml(to)}` : ''}
              </small>
            </span>
            <strong>${days} ${days === 1 ? 'Tag' : 'Tage'}</strong>
          </div>
        `;
      }).join('')
    : `<p style="color:#64748b;font-size:13px;">
         ${translations?.noAbsLogs ||
           'Keine Fehlzeiten eingetragen.'}
       </p>`;

  openSummaryModal(
    translations?.modalLeaveTitle || 'Urlaub & Fehlzeiten',
    'fa-solid fa-umbrella-beach',
    `
      <div class="statement-summary-box">
        <div>
          <span>${translations?.lblYearlyAllow || 'Jahresanspruch:'}</span>
          <strong>${metrics.allowance} Tage</strong>
        </div>
        <div>
          <span>${translations?.lblVacConsumed || 'Genommene Tage:'}</span>
          <strong>${metrics.vacationDays} Tage</strong>
        </div>
        <div>
          <span>${translations?.lblNetVac || 'Resturlaub:'}</span>
          <strong>${metrics.remainingDays} Tage</strong>
        </div>
        <div>
          <span>${translations?.lblTotalSick || 'Kranktage gesamt:'}</span>
          <strong>${metrics.sickDays} Tage</strong>
        </div>
      </div>
      ${rows}
    `
  );
}

function toggleDarkMode() {
  const enabled = !document.body.classList.contains('dark-mode');

  document.body.classList.toggle('dark-mode', enabled);

  localStorage.setItem(
    'schuermann_dark_mode',
    String(enabled)
  );

  const button = document.getElementById('dark-mode-btn');

  if (button) {
    button.textContent = enabled ? '☀️' : '🌙';
  }
}

function restoreDarkModePreference() {
  const enabled =
    localStorage.getItem('schuermann_dark_mode') === 'true';

  document.body.classList.toggle('dark-mode', enabled);

  const button = document.getElementById('dark-mode-btn');

  if (button) {
    button.textContent = enabled ? '☀️' : '🌙';
  }
}

function switchActiveView(view, element) {
  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  document
    .getElementById(`view-${view}`)
    ?.classList.add('active');

  document.querySelectorAll('.drawer-nav-list .nav-item').forEach(item => {
    item.classList.remove('active');
  });

  element?.classList.add('active');

  if (view === 'history') {
    renderHistoricalRecordsSheet?.();
  } else if (view === 'vacation') {
    renderVacationRecordsSheet?.();
  } else if (view === 'deleted') {
    renderRecentlyDeletedBinSheet?.();
  } else if (view === 'dashboard') {
    runGlobalApplicationMetricsEngine();
  }

  toggleSidebarDrawer(false);
}

function toggleSidebarDrawer(open) {
  const drawer = document.getElementById('sidebar-drawer');
  const backdrop = document.getElementById('menu-backdrop');

  const shouldOpen = open === undefined
    ? !drawer?.classList.contains('open')
    : open !== false;

  drawer?.classList.toggle('open', shouldOpen);
  backdrop?.classList.toggle('show', shouldOpen);
}

function refreshApplicationAfterCloudLoad() {
  renderHistoricalRecordsSheet?.();
  renderVacationRecordsSheet?.();
  renderRecentlyDeletedBinSheet?.();
  runGlobalApplicationMetricsEngine();
  updateOfflineBadge?.();
}

async function waitForCloudLoadCompletion() {
  let attempts = 0;

  while (
    typeof _cloudDataLoading !== 'undefined' &&
    _cloudDataLoading &&
    attempts < 100
  ) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts += 1;
  }

  if (
    typeof _cloudDataLoaded !== 'undefined' &&
    !_cloudDataLoaded &&
    auth.currentUser &&
    typeof loadUserDataFromCloud === 'function'
  ) {
    await loadUserDataFromCloud();
  }

  refreshApplicationAfterCloudLoad();
}

document.addEventListener('DOMContentLoaded', () => {
  restoreDarkModePreference();

  if (typeof auth === 'undefined') return;

  auth.onAuthStateChanged(user => {
    if (!user || authenticatedUserRoleGlobal === 'admin') return;

    waitForCloudLoadCompletion().catch(error => {
      console.warn('Post-login UI refresh failed:', error);
    });
  });

  window.addEventListener('online', () => {
    flushOfflineQueue?.();
  });

  updateOfflineBadge?.();
});