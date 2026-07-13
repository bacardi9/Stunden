// ══════════════════════════════════════════════════════════════════
//  PREMIUM FEATURES — Trillion Dollar Enterprise Feel
// ══════════════════════════════════════════════════════════════════

// ── FEATURE 17: Skeleton Loading ─────────────────────────────────
function showSkeletonLoader(containerId, rows = 3) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="skeleton-wrapper">${Array.from({length:rows},()=>`
    <div class="skeleton-item">
      <div class="skeleton-line skeleton-line-wide"></div>
      <div class="skeleton-line skeleton-line-medium"></div>
      <div class="skeleton-line skeleton-line-short"></div>
    </div>`).join('')}</div>`;
}
function hideSkeletonLoader(containerId) {
  const skel = document.getElementById(containerId)?.querySelector('.skeleton-wrapper');
  if (skel) skel.remove();
}

// ══════════════════════════════════════════════════════════════════
// FEATURE 17b: Niedersachsen Public Holidays
// ══════════════════════════════════════════════════════════════════

function getEasterSunday(year) {
  // Anonymous Gregorian algorithm
  const a = year % 19, b = Math.floor(year/100), c = year % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4;
  const l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31);
  const day   = ((h+l-7*m+114) % 31) + 1;
  return new Date(year, month-1, day);
}

function getNiedersachsenHolidays(year) {
  const easter = getEasterSunday(year);
  const add = (d, days) => { const r = new Date(d); r.setDate(r.getDate()+days); return r; };
  const fmt  = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

  const holidays = {
    [fmt(new Date(year,0,1))]:   'Neujahr',
    [fmt(add(easter,-2))]:       'Karfreitag',
    [fmt(easter)]:               'Ostersonntag',
    [fmt(add(easter,1))]:        'Ostermontag',
    [fmt(new Date(year,4,1))]:   'Tag der Arbeit',
    [fmt(add(easter,39))]:       'Christi Himmelfahrt',
    [fmt(add(easter,49))]:       'Pfingstsonntag',
    [fmt(add(easter,50))]:       'Pfingstmontag',
    [fmt(new Date(year,9,3))]:   'Tag der Deutschen Einheit',
    [fmt(new Date(year,9,31))]:  'Reformationstag',        // Niedersachsen-specific
    [fmt(new Date(year,11,25))]: '1. Weihnachtstag',
    [fmt(new Date(year,11,26))]: '2. Weihnachtstag',
  };
  return holidays;
}

function isNiedersachsenHoliday(dmyKey) {
  try {
    const [d,m,y] = dmyKey.split('/').map(Number);
    return getNiedersachsenHolidays(y)[dmyKey] || null;
  } catch(e) { return null; }
}

// Inject holiday awareness into getMissingDays so holidays are excluded
const _origGetMissingDays = window.getMissingDays;
window.getMissingDays = function(def) {
  if (typeof _origGetMissingDays !== 'function') return [];
  return _origGetMissingDays(def).filter(d => !isNiedersachsenHoliday(d.key));
};

// Show holiday badge on period progress bar
function injectHolidayBadges() {
  const def = (typeof getDefault20to20Period === 'function') ? getDefault20to20Period() : null;
  if (!def) return;
  const badges = [];
  const cursor = new Date(def.start); cursor.setHours(0,0,0,0);
  const end    = new Date(def.end);   end.setHours(23,59,59,999);
  const today  = new Date(); today.setHours(0,0,0,0);
  while (cursor <= end) {
    const dd  = String(cursor.getDate()).padStart(2,'0');
    const mm  = String(cursor.getMonth()+1).padStart(2,'0');
    const yy  = cursor.getFullYear();
    const key = `${dd}/${mm}/${yy}`;
    const name = isNiedersachsenHoliday(key);
    if (name) {
      const isPast = cursor < today;
      badges.push(`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#b45309;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;margin:3px;opacity:${isPast?0.5:1};">
        <i class="fa-solid fa-church" style="font-size:9px;"></i>${cursor.toLocaleDateString('de-DE',{day:'2-digit',month:'short'})} · ${name}
      </span>`);
    }
    cursor.setDate(cursor.getDate()+1);
  }
  if (!badges.length) return;
  ['period-progress-bar-card','period-progress-bar-card-hist'].forEach(id => {
    const card = document.getElementById(id);
    if (!card) return;
    if (card.querySelector('.holiday-badges-row')) return; // already injected
    const row = document.createElement('div');
    row.className = 'holiday-badges-row';
    row.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,0,0,0.06);padding-top:8px;';
    row.innerHTML = `<div style="font-size:9px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;"><i class="fa-solid fa-star-and-crescent" style="margin-right:4px;"></i>Feiertage (Niedersachsen)</div>${badges.join('')}`;
    card.appendChild(row);
  });
}

// Hook into renderPeriodProgressBar
document.addEventListener('DOMContentLoaded', function() {
  const _origRender = window.renderPeriodProgressBar;
  if (typeof _origRender === 'function') {
    window.renderPeriodProgressBar = function() {
      _origRender.apply(this, arguments);
      setTimeout(injectHolidayBadges, 60);
    };
  }
});

// ══════════════════════════════════════════════════════════════════
// FEATURE 25: Daily Reminder — "Hast du heute schon gebucht?"
// ══════════════════════════════════════════════════════════════════

const DAILY_REMINDER_KEY = 'sch_reminder_dismissed';

function checkAndShowDailyReminder() {
  // Only for logged-in users in app-view
  if (!authenticatedUserGlobal || authenticatedUserRoleGlobal === 'admin') return;
  if (document.getElementById('daily-reminder-banner')) return;

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) return; // No reminder on weekends

  const todayKey = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

  // Check if dismissed today
  const dismissed = localStorage.getItem(DAILY_REMINDER_KEY);
  if (dismissed === todayKey) return;

  // Check if holiday
  if (isNiedersachsenHoliday(todayKey)) return;

  // Check if already logged today
  const hasEntry = (globalLoggedSessionsDatabaseMock || []).some(s => s.date === todayKey)
                || (vacationLoggedDaysArrayCache || []).some(s => s.date === todayKey);
  if (hasEntry) return;

  // Only show after 12:00 (noon)
  if (today.getHours() < 12) {
    // Schedule for noon
    const msUntilNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0) - today;
    if (msUntilNoon > 0) setTimeout(checkAndShowDailyReminder, msUntilNoon);
    return;
  }

  showDailyReminderBanner(todayKey, today);
}

function showDailyReminderBanner(todayKey, today) {
  const appView = document.getElementById('app-view');
  if (!appView) return;

  const existing = document.getElementById('daily-reminder-banner');
  if (existing) existing.remove();

  const dayName = today.toLocaleDateString('de-DE', { weekday:'long' });
  const dateStr = today.toLocaleDateString('de-DE', { day:'2-digit', month:'long' });

  const banner = document.createElement('div');
  banner.id = 'daily-reminder-banner';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
      <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:bellRing 1s ease-in-out 2;">
        <i class="fa-solid fa-bell" style="color:#fff;font-size:16px;"></i>
      </div>
      <div style="min-width:0;">
        <div style="font-size:13px;font-weight:800;color:#92400e;line-height:1.2;">Hast du heute schon gebucht? ⏰</div>
        <div style="font-size:11px;color:#b45309;margin-top:2px;font-weight:500;">${dayName}, ${dateStr} · Kein Eintrag gefunden</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-shrink:0;">
      <button onclick="dismissReminderAndLog()" style="background:linear-gradient(135deg,#f59e0b,#d97706);border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;">
        <i class="fa-solid fa-pen-to-square" style="margin-right:4px;"></i>Jetzt buchen
      </button>
      <button onclick="dismissDailyReminder('${todayKey}')" style="background:rgba(180,83,9,0.12);border:1px solid rgba(180,83,9,0.2);color:#b45309;padding:8px;border-radius:8px;font-size:13px;cursor:pointer;">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>`;

  banner.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%) translateY(120px);
    background:linear-gradient(135deg,rgba(254,243,199,0.98),rgba(253,230,138,0.95));
    backdrop-filter:blur(16px);
    border:1px solid rgba(245,158,11,0.4);
    border-radius:16px; padding:14px 16px;
    box-shadow:0 16px 48px rgba(180,83,9,0.25),0 4px 12px rgba(0,0,0,0.1);
    z-index:8800; display:flex; align-items:center; gap:12px;
    width:calc(100% - 32px); max-width:480px;
    transition:transform 0.4s cubic-bezier(0.16,1,0.3,1);`;

  document.body.appendChild(banner);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.transform = 'translateX(-50%) translateY(0)';
    });
  });

  // Auto-dismiss after 12 seconds
  setTimeout(() => dismissDailyReminder(todayKey, true), 12000);
}

function dismissDailyReminder(todayKey, silent) {
  localStorage.setItem(DAILY_REMINDER_KEY, todayKey);
  const banner = document.getElementById('daily-reminder-banner');
  if (!banner) return;
  banner.style.transform = 'translateX(-50%) translateY(120px)';
  setTimeout(() => banner.remove(), 400);
  if (!silent) showEnhancedToast('Erinnerung geschlossen. Vergiss nicht zu buchen! 📝', 'info');
}

function dismissReminderAndLog() {
  const todayKey = `${String(new Date().getDate()).padStart(2,'0')}/${String(new Date().getMonth()+1).padStart(2,'0')}/${new Date().getFullYear()}`;
  localStorage.setItem(DAILY_REMINDER_KEY, todayKey);
  const banner = document.getElementById('daily-reminder-banner');
  if (banner) { banner.style.transform='translateX(-50%) translateY(120px)'; setTimeout(()=>banner.remove(),400); }
  if (typeof switchActiveView === 'function') {
    switchActiveView('log-work', document.querySelector('[onclick*="switchActiveView(\'log-work\'"]'));
  }
}

// Re-check after a new entry is saved
const _origPersist = window.persistUserData;
window.persistUserData = function() {
  if (typeof _origPersist === 'function') _origPersist.apply(this, arguments);
  // Remove reminder if user just logged today
  const banner = document.getElementById('daily-reminder-banner');
  if (!banner) return;
  const today = new Date();
  const todayKey = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
  const hasEntry = (globalLoggedSessionsDatabaseMock||[]).some(s=>s.date===todayKey)
                || (vacationLoggedDaysArrayCache||[]).some(s=>s.date===todayKey);
  if (hasEntry) {
    banner.style.transform='translateX(-50%) translateY(120px)';
    setTimeout(()=>banner.remove(),400);
    showEnhancedToast('✓ Heute gebucht — Erinnerung erledigt! 🎉','success');
  }
};

// ══════════════════════════════════════════════════════════════════
// FEATURE 35: Smart Duplicate Detection
// ══════════════════════════════════════════════════════════════════

function checkForDuplicateEntry(date, startTime, endTime, project) {
  if (!date || !startTime || !endTime) return null;
  const [sh,sm] = startTime.split(':').map(Number);
  const [eh,em] = endTime.split(':').map(Number);
  const newStart = sh*60+sm, newEnd = eh*60+em;

  for (const rec of (globalLoggedSessionsDatabaseMock||[])) {
    if (rec.type !== 'work' || rec.date !== date) continue;

    // Exact duplicate
    if (rec.startTime === startTime && rec.endTime === endTime) {
      return { type:'exact', rec };
    }

    // Overlap
    if (rec.startTime && rec.endTime) {
      const [rsh,rsm] = rec.startTime.split(':').map(Number);
      const [reh,rem] = rec.endTime.split(':').map(Number);
      const rStart = rsh*60+rsm, rEnd = reh*60+rem;
      if (newStart < rEnd && newEnd > rStart) {
        return { type:'overlap', rec };
      }
    }

    // Same project same day (near duplicate)
    if (project && rec.project && rec.project.toLowerCase().trim() === project.toLowerCase().trim()) {
      return { type:'same-project', rec };
    }
  }
  return null;
}

function showDuplicateWarning(dupResult, onProceed, onCancel) {
  const existing = document.getElementById('duplicate-warning-modal');
  if (existing) existing.remove();

  const messages = {
    exact:        { icon:'fa-copy',                color:'#ef4444', title:'Exakter Duplikat erkannt!',     desc:`Für diesen Tag gibt es bereits einen identischen Eintrag (${dupResult.rec.startTime}–${dupResult.rec.endTime}).` },
    overlap:      { icon:'fa-triangle-exclamation', color:'#f59e0b', title:'Zeitüberschneidung erkannt!',   desc:`Dieser Eintrag überschneidet sich mit: ${dupResult.rec.project} (${dupResult.rec.startTime}–${dupResult.rec.endTime}).` },
    'same-project':{ icon:'fa-clone',               color:'#3b82f6', title:'Gleiche Baustelle heute schon', desc:`Du hast heute schon einen Eintrag für "${dupResult.rec.project}" (${dupResult.rec.startTime}–${dupResult.rec.endTime}).` },
  };
  const m = messages[dupResult.type] || messages.exact;

  const modal = document.createElement('div');
  modal.id = 'duplicate-warning-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,10,25,0.75);backdrop-filter:blur(12px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;animation:modalEntrance 0.25s ease;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.3);">
      <div style="background:linear-gradient(135deg,${m.color}18,${m.color}08);border-bottom:2px solid ${m.color}30;padding:20px 22px;display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:12px;background:${m.color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fa-solid ${m.icon}" style="color:${m.color};font-size:18px;"></i>
        </div>
        <div>
          <div style="font-size:14px;font-weight:800;color:#0f172a;">${m.title}</div>
          <div style="font-size:12px;color:#64748b;margin-top:3px;line-height:1.4;">${m.desc}</div>
        </div>
      </div>
      <div style="padding:18px 22px;">
        <div style="background:#f8fafc;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12px;color:#475569;line-height:1.5;">
          <i class="fa-solid fa-circle-info" style="color:#3b82f6;margin-right:6px;"></i>
          Möchtest du den Eintrag <strong>trotzdem speichern</strong> oder abbrechen und korrigieren?
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="document.getElementById('duplicate-warning-modal').remove();if(typeof _dupCancel==='function')_dupCancel();"
            style="flex:1;background:#f1f5f9;border:1.5px solid #e2e8f0;color:#475569;padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-pen" style="margin-right:6px;"></i>Korrigieren
          </button>
          <button onclick="document.getElementById('duplicate-warning-modal').remove();if(typeof _dupProceed==='function')_dupProceed();"
            style="flex:1;background:${m.color};border:none;color:#fff;padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i>Trotzdem speichern
          </button>
        </div>
      </div>
    </div>`;
  window._dupProceed = onProceed;
  window._dupCancel  = onCancel;
  document.body.appendChild(modal);
}

// Patch handleNewRecordSubmission to check for duplicates first
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('shift-submission-form');
  if (!form) return;
  // Remove old submit handler and add new one with duplicate check
  const newHandler = function(e) {
    e.preventDefault();
    const date    = typeof isoToDMY==='function' ? isoToDMY(document.getElementById('log-date-picker')?.value) : '';
    const project = document.getElementById('log-project-name')?.value.trim();
    const start   = document.getElementById('log-start-time')?.value;
    const end     = document.getElementById('log-end-time')?.value;
    if (!date || !project || !start || !end) { handleNewRecordSubmission(e); return; }

    const dup = checkForDuplicateEntry(date, start, end, project);
    if (dup) {
      showDuplicateWarning(
        dup,
        () => { handleNewRecordSubmission({ preventDefault:()=>{} }); }, // proceed
        () => {}  // cancel — user stays on form
      );
    } else {
      handleNewRecordSubmission(e);
    }
  };
  form.removeEventListener('submit', form._dupHandler);
  form._dupHandler = newHandler;
  form.addEventListener('submit', newHandler);
});


// ── INJECT ALL CSS ────────────────────────────────────────────────
(function injectAllCSS() {
  const s = document.createElement('style');
  s.textContent = `
    /* ── SKELETON ── */
    .skeleton-wrapper { padding: 4px 0; }
    .skeleton-item {
      background: rgba(255,255,255,0.88); border-radius: 14px; padding: 18px;
      margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.9);
      overflow: hidden; position: relative;
    }
    .skeleton-item::after {
      content:''; position:absolute; top:0; left:-100%; width:60%; height:100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
      animation: skeletonShimmer 1.4s infinite;
    }
    @keyframes skeletonShimmer { to { left: 200%; } }
    .skeleton-line { height:12px; background:linear-gradient(90deg,#e2e8f0,#f1f5f9,#e2e8f0); border-radius:6px; margin-bottom:10px; }
    .skeleton-line-wide { width:85%; } .skeleton-line-medium { width:60%; height:10px; } .skeleton-line-short { width:35%; height:8px; }
    body.dark-mode .skeleton-item { background:rgba(15,23,42,0.9); border-color:rgba(255,255,255,0.06); }
    body.dark-mode .skeleton-line { background:linear-gradient(90deg,#1e293b,#334155,#1e293b); }

    /* ── WEEKLY BAR CHART ── */
    #weekly-chart-card {
      background:rgba(255,255,255,0.88); backdrop-filter:blur(12px); border-radius:18px;
      padding:22px 24px; border:1px solid rgba(255,255,255,0.95);
      box-shadow:0 4px 16px rgba(0,0,0,0.08); margin-bottom:16px;
    }
    .chart-bars-wrapper { display:flex; align-items:flex-end; gap:6px; height:100px; margin-top:16px; padding-bottom:2px; }
    .chart-bar-col {
      flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;
      height:100%; justify-content:flex-end; cursor:pointer; border-radius:8px;
      padding:2px; transition:background 0.15s;
    }
    .chart-bar-col:hover { background:rgba(14,165,233,0.06); }
    .chart-bar-col.selected { background:rgba(14,165,233,0.1); }
    .chart-bar { width:100%; border-radius:6px 6px 0 0; min-height:3px; transition:all 0.25s cubic-bezier(0.16,1,0.3,1); }
    .chart-bar-col:hover .chart-bar { opacity:0.8; transform:scaleY(1.04); transform-origin:bottom; }
    .chart-bar-label { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.3px; }
    .chart-bar-val { font-size:9px; font-weight:800; color:var(--text-muted); font-variant-numeric:tabular-nums; }
    body.dark-mode #weekly-chart-card { background:rgba(15,23,42,0.9); border-color:rgba(255,255,255,0.06); }
    body.dark-mode .chart-bar-label { color:#475569; }

    /* ── WEEKLY DAY DETAIL PANEL ── */
    #weekly-day-detail {
      margin-top:14px; border-top:1px solid rgba(0,0,0,0.06); padding-top:14px;
      animation:slideInUp 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    .wdd-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .wdd-date-badge { display:flex; align-items:center; gap:8px; }
    .wdd-date-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .wdd-date-label { font-size:13px; font-weight:800; color:var(--text-main); }
    .wdd-total {
      font-size:12px; font-weight:700; color:var(--primary-blue);
      background:rgba(14,165,233,0.08); border:1px solid rgba(14,165,233,0.2);
      padding:3px 10px; border-radius:99px;
    }
    .wdd-close {
      background:none; border:none; color:#94a3b8; cursor:pointer;
      font-size:14px; padding:4px 6px; border-radius:6px; transition:all 0.12s; line-height:1;
    }
    .wdd-close:hover { color:#E30613; background:rgba(227,6,19,0.06); }
    .wdd-entry {
      background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.05);
      border-radius:10px; padding:11px 14px; margin-bottom:8px;
      display:flex; align-items:center; gap:12px; animation:slideInUp 0.18s ease;
    }
    .wdd-entry:last-child { margin-bottom:0; }
    .wdd-entry-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:13px; }
    .wdd-entry-body { flex:1; min-width:0; }
    .wdd-entry-project { font-size:13px; font-weight:700; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .wdd-entry-meta { font-size:11px; color:var(--text-muted); margin-top:2px; font-weight:500; }
    .wdd-entry-hrs { font-size:14px; font-weight:800; color:var(--primary-blue); font-variant-numeric:tabular-nums; white-space:nowrap; }
    .wdd-empty { text-align:center; padding:20px 12px; color:#94a3b8; font-size:12px; font-weight:600; }
    body.dark-mode #weekly-day-detail { border-top-color:rgba(255,255,255,0.06); }
    body.dark-mode .wdd-entry { background:rgba(15,23,42,0.7); border-color:rgba(255,255,255,0.06); }
    body.dark-mode .wdd-date-label { color:#f1f5f9; }
    body.dark-mode .wdd-entry-project { color:#f1f5f9; }

    /* ── STREAK CARD ── */
    #streak-card {
      background:linear-gradient(135deg,rgba(227,6,19,0.08),rgba(227,6,19,0.03));
      border:1px solid rgba(227,6,19,0.15); border-radius:14px;
      padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; gap:14px;
    }
    .streak-flame { font-size:28px; line-height:1; animation:flamePulse 1.5s ease-in-out infinite alternate; }
    @keyframes flamePulse { from{transform:scale(1)} to{transform:scale(1.12)} }
    .streak-info .streak-num { font-size:22px; font-weight:900; color:#E30613; letter-spacing:-1px; }
    .streak-info .streak-lbl { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; }
    .streak-best { margin-left:auto; text-align:right; }
    .streak-best .best-num { font-size:14px; font-weight:800; color:var(--text-muted); }
    .streak-best .best-lbl { font-size:10px; color:#94a3b8; font-weight:600; }

    /* ── NOTIFICATION CENTRE ── */
    #notif-bell-btn {
      position:relative; background:rgba(15,23,42,0.05); border:1px solid rgba(15,23,42,0.08);
      border-radius:8px; width:36px; height:36px; display:flex; align-items:center;
      justify-content:center; cursor:pointer; transition:all 0.15s;
    }
    #notif-bell-btn:hover { background:rgba(14,165,233,0.1); border-color:rgba(14,165,233,0.25); }
    #notif-bell-btn .bell-badge {
      position:absolute; top:-4px; right:-4px; background:#E30613; color:#fff;
      font-size:9px; font-weight:800; border-radius:99px; min-width:16px; height:16px;
      display:flex; align-items:center; justify-content:center; padding:0 3px;
      border:2px solid white; display:none;
    }
    #notif-bell-btn .bell-badge.show { display:flex; }
    body.dark-mode #notif-bell-btn { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.08); }
    body.dark-mode #notif-bell-btn .bell-badge { border-color:#0a0f1e; }
    #notif-panel {
      position:fixed; top:64px; right:16px; width:320px; max-height:420px;
      background:rgba(255,255,255,0.98); backdrop-filter:blur(24px);
      border-radius:16px; border:1px solid rgba(0,0,0,0.07);
      box-shadow:0 20px 60px rgba(0,0,0,0.18); z-index:7000; overflow:hidden;
      display:none; flex-direction:column;
    }
    #notif-panel.open { display:flex; }
    .notif-header { padding:14px 16px; border-bottom:1px solid rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:space-between; }
    .notif-header-title { font-size:13px; font-weight:800; color:#0f172a; }
    .notif-clear-btn { font-size:11px; font-weight:700; color:#94a3b8; background:none; border:none; cursor:pointer; padding:2px 6px; border-radius:6px; transition:all 0.12s; }
    .notif-clear-btn:hover { color:#E30613; background:rgba(227,6,19,0.06); }
    .notif-list { overflow-y:auto; flex:1; }
    .notif-item { padding:12px 16px; border-bottom:1px solid rgba(0,0,0,0.04); display:flex; gap:10px; align-items:flex-start; transition:background 0.12s; cursor:pointer; }
    .notif-item:hover { background:rgba(14,165,233,0.04); }
    .notif-item.unread { background:rgba(14,165,233,0.03); }
    .notif-icon { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:13px; }
    .notif-text { flex:1; }
    .notif-title-text { font-size:12px; font-weight:700; color:#0f172a; line-height:1.3; }
    .notif-sub { font-size:11px; color:#94a3b8; font-weight:500; margin-top:2px; }
    .notif-empty { text-align:center; padding:32px 16px; color:#94a3b8; font-size:13px; font-weight:600; }
    body.dark-mode #notif-panel { background:rgba(10,16,32,0.98); border-color:rgba(255,255,255,0.07); }
    body.dark-mode .notif-header { border-bottom-color:rgba(255,255,255,0.05); }
    body.dark-mode .notif-header-title { color:#f1f5f9; }
    body.dark-mode .notif-item { border-bottom-color:rgba(255,255,255,0.04); }
    body.dark-mode .notif-item:hover { background:rgba(255,255,255,0.03); }
    body.dark-mode .notif-title-text { color:#f1f5f9; }

    /* ── CONFETTI ── */
    .confetti-piece { position:fixed; width:8px; height:8px; border-radius:2px; pointer-events:none; z-index:9999; animation:confettiFall linear forwards; }
    @keyframes confettiFall { 0%{opacity:1;transform:translateY(0) rotate(0deg);} 100%{opacity:0;transform:translateY(100vh) rotate(720deg);} }

    /* ── UNDO SNACKBAR ── */
    #undo-snackbar {
      position:fixed; bottom:-80px; left:50%; transform:translateX(-50%);
      background:rgba(10,15,30,0.97); backdrop-filter:blur(16px);
      color:#fff; padding:13px 18px; border-radius:12px; font-size:13px; font-weight:600;
      z-index:8500; display:flex; align-items:center; gap:12px;
      box-shadow:0 12px 36px rgba(0,0,0,0.35);
      transition:bottom 0.32s cubic-bezier(0.16,1,0.3,1); white-space:nowrap;
    }
    #undo-snackbar.show { bottom:24px; }
    #undo-snackbar-btn { background:rgba(14,165,233,0.2); border:1px solid rgba(14,165,233,0.35); color:#38bdf8; padding:5px 12px; border-radius:7px; font-size:12px; font-weight:800; cursor:pointer; }
    #undo-progress { position:absolute; bottom:0; left:0; height:3px; background:#E30613; border-radius:0 0 12px 12px; transition:width linear; }

    /* ── LAST SAVED ── */
    #last-saved-indicator {
      display:flex; align-items:center; gap:5px; font-size:10px; font-weight:600; color:#94a3b8;
      padding:4px 10px; background:rgba(0,0,0,0.04); border-radius:99px; transition:all 0.3s;
      position:fixed; bottom:72px; right:16px; z-index:80; opacity:0; transform:translateY(4px);
    }
    #last-saved-indicator.show { opacity:1; transform:translateY(0); }
    #last-saved-indicator i { font-size:9px; color:#10b981; }
    body.dark-mode #last-saved-indicator { background:rgba(255,255,255,0.06); }

    /* ── CONNECTION QUALITY ── */
    #connection-quality-dot { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:700; padding:3px 9px; border-radius:99px; transition:all 0.4s; }
    #connection-quality-dot.fast   { background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); }
    #connection-quality-dot.medium { background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.2); }
    #connection-quality-dot.slow   { background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); }
    #connection-quality-dot.offline{ background:rgba(100,116,139,0.1);color:#64748b; border:1px solid rgba(100,116,139,0.2); }
    #connection-quality-dot .cq-dot { width:6px; height:6px; border-radius:50%; }

    /* ── HISTORY SORT BAR ── */
    #history-sort-bar { display:flex; align-items:center; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
    #history-sort-bar .sort-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
    .sort-pill { background:rgba(0,0,0,0.05); border:1.5px solid transparent; padding:6px 14px; border-radius:99px; font-size:12px; font-weight:700; color:var(--text-muted); cursor:pointer; transition:all 0.15s; white-space:nowrap; display:inline-flex; align-items:center; gap:5px; }
    .sort-pill:hover { background:rgba(14,165,233,0.07); border-color:rgba(14,165,233,0.2); color:var(--primary-blue); }
    .sort-pill.active { background:rgba(14,165,233,0.1); border-color:rgba(14,165,233,0.3); color:var(--primary-blue); }
    body.dark-mode .sort-pill { background:rgba(255,255,255,0.05); }
    body.dark-mode .sort-pill.active { background:rgba(14,165,233,0.15); }

    /* ── PULL TO REFRESH ── */
    #pull-refresh-indicator {
      position:fixed; top:-60px; left:50%; transform:translateX(-50%);
      width:44px; height:44px; background:rgba(255,255,255,0.95); border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 16px rgba(0,0,0,0.12); transition:top 0.2s ease; z-index:99;
    }
    #pull-refresh-indicator.visible { top:16px; }
    #pull-refresh-indicator i { color:#E30613; font-size:18px; }
    #pull-refresh-indicator.spinning i { animation:refreshSpin 0.6s linear infinite; }
    @keyframes refreshSpin { to { transform:rotate(360deg); } }

    /* ── AUTO LOGOUT ── */
    #inactivity-warning {
      position:fixed; bottom:-100px; left:50%; transform:translateX(-50%);
      background:rgba(10,15,30,0.97); backdrop-filter:blur(20px); color:#fff;
      padding:14px 20px; border-radius:14px; font-size:13px; font-weight:600;
      box-shadow:0 16px 40px rgba(0,0,0,0.4); z-index:8000; display:flex;
      align-items:center; gap:12px; min-width:280px; max-width:380px;
      transition:bottom 0.38s cubic-bezier(0.16,1,0.3,1);
    }
    #inactivity-warning.visible { bottom:24px; }
    #inactivity-warning .inact-icon { width:36px; height:36px; background:rgba(227,6,19,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    #inactivity-warning .inact-timer { font-size:18px; font-weight:900; color:#E30613; min-width:28px; text-align:center; }
    #inactivity-stay-btn { background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.15); color:#fff; padding:7px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; }

    /* ── SHARE BUTTON ── */
    .share-pdf-btn { background:linear-gradient(135deg,rgba(14,165,233,0.1),rgba(14,165,233,0.05)); border:1px solid rgba(14,165,233,0.25); color:var(--primary-blue); padding:8px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.18s; }
    .share-pdf-btn:hover { background:rgba(14,165,233,0.14); transform:translateY(-1px); }

    /* ── RIPPLE ── */
    .ripple-container { position:relative; overflow:hidden; }
    .ripple-effect { position:absolute; border-radius:50%; background:rgba(14,165,233,0.25); transform:scale(0); animation:rippleAnim 0.5s linear; pointer-events:none; }
    @keyframes rippleAnim { to { transform:scale(4); opacity:0; } }

    /* ── DAILY REMINDER BANNER ── */
    @keyframes bellRing {
      0%,100%{transform:rotate(0)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(15deg)}
      60%{transform:rotate(-10deg)} 80%{transform:rotate(10deg)}
    }

    /* ── HOLIDAY BADGES ── */
    .holiday-badges-row { animation:slideInUp 0.25s ease; }
    body.dark-mode .holiday-badges-row span {
      background:rgba(245,158,11,0.12) !important;
      border-color:rgba(245,158,11,0.2) !important;
      color:#fbbf24 !important;
    }

    /* ── DUPLICATE MODAL ── */
    @keyframes modalEntrance { from{opacity:0;transform:scale(0.95) translateY(-12px)} to{opacity:1;transform:scale(1) translateY(0)} }
  `;
  document.head.appendChild(s);
})();


// ══════════════════════════════════════════════════════════════════
// FEATURE 1: Ripple
// ══════════════════════════════════════════════════════════════════
function addRipple(e) {
  const btn = e.currentTarget;
  if (!btn.classList.contains('ripple-container')) btn.classList.add('ripple-container');
  const r = document.createElement('span');
  r.className = 'ripple-effect';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+(e.clientX-rect.left-size/2)+'px;top:'+(e.clientY-rect.top-size/2)+'px';
  btn.appendChild(r);
  r.addEventListener('animationend', function() { r.remove(); });
}
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.primary-btn,.break-pill,.sort-pill,.toggle-switch-btn');
  if (btn) addRipple({ currentTarget:btn, clientX:e.clientX, clientY:e.clientY });
});


// ══════════════════════════════════════════════════════════════════
// FEATURE 2: Enhanced Toast
// ══════════════════════════════════════════════════════════════════
let _toastTimer = null;
function showEnhancedToast(msg, type) {
  type = type || 'success';
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  const icons  = { success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info' };
  const colors = { success:'#10b981', error:'#ef4444', info:'#3b82f6' };
  clearTimeout(_toastTimer);
  toast.innerHTML = '<i class="fa-solid '+(icons[type]||icons.success)+'" style="color:'+(colors[type]||colors.success)+';font-size:16px;flex-shrink:0;"></i>'
    +'<span style="flex:1;">'+msg+'</span>'
    +'<div id="toast-progress" style="position:absolute;bottom:0;left:0;height:2px;background:'+(colors[type]||colors.success)+';border-radius:0 0 8px 8px;width:100%;transition:width 3s linear;"></div>';
  toast.classList.add('show');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { const p=document.getElementById('toast-progress'); if(p) p.style.width='0%'; });
  });
  _toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 3200);
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 4: Streak Counter
// ══════════════════════════════════════════════════════════════════
function computeWorkStreak() {
  const today = new Date(); today.setHours(0,0,0,0);
  const worked = new Set();
  (globalLoggedSessionsDatabaseMock||[]).forEach(function(s) {
    if (s.type==='work') {
      const p=s.date.split('/').map(Number);
      const d=new Date(p[2],p[1]-1,p[0]); d.setHours(0,0,0,0);
      worked.add(d.getTime());
    }
  });
  const isWorkday=function(d){const w=d.getDay();return w>=1&&w<=5;};
  const prevWD=function(d){const x=new Date(d);do{x.setDate(x.getDate()-1);}while(!isWorkday(x));return x;};
  let streak=0, cur=new Date(today);
  if(!worked.has(cur.getTime())&&isWorkday(cur)) cur=prevWD(cur);
  for(let i=0;i<365;i++){
    if(!isWorkday(cur)){cur=prevWD(cur);continue;}
    if(!worked.has(cur.getTime())) break;
    streak++; cur=prevWD(cur);
  }
  let best=0,run=0;
  const sorted=[...worked].sort((a,b)=>a-b);
  sorted.forEach(function(t,i){
    const d=new Date(t); if(!isWorkday(d)) return;
    run = (i===0||((t-sorted[i-1])/86400000)>3) ? 1 : run+1;
    if(run>best) best=run;
  });
  return {streak:streak,best:best};
}

function injectStreakCard() {
  if(document.getElementById('streak-card')){updateStreakCard();return;}
  const dash=document.getElementById('view-dashboard'); if(!dash) return;
  const grid=dash.querySelector('.metrics-grid'); if(!grid) return;
  const card=document.createElement('div'); card.id='streak-card';
  card.onclick=function(){showEnhancedToast('Streak = aufeinanderfolgende Arbeitstage!','info');};
  const parent = grid.parentNode;
  if (parent && parent.contains(grid)) {
    const next = grid.nextSibling;
    if (next && next.parentNode === parent) parent.insertBefore(card, next);
    else parent.appendChild(card);
  } else {
    dash.appendChild(card);
  }
  updateStreakCard();
}
function updateStreakCard() {
  const card=document.getElementById('streak-card'); if(!card) return;
  const r=computeWorkStreak(); const streak=r.streak, best=r.best;
  card.innerHTML='<div class="streak-flame">'+(streak>=7?'🔥':streak>=3?'⚡':'📅')+'</div>'
    +'<div class="streak-info"><div class="streak-num">'+streak+' Tag'+(streak!==1?'e':'')+'</div><div class="streak-lbl">Aktuelle Serie</div></div>'
    +'<div class="streak-best"><div class="best-num">'+best+' Tage</div><div class="best-lbl">Bestleistung</div></div>';
  if(streak>0&&streak%5===0) triggerConfetti();
}

// ══════════════════════════════════════════════════════════════════
// Start daily reminder check after session loads
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  // Hook into launchSessionUI completion
  const _origLaunch = window.launchSessionUI;
  if (typeof _origLaunch === 'function') {
    window.launchSessionUI = async function() {
      await _origLaunch.apply(this, arguments);
      setTimeout(checkAndShowDailyReminder, 3000); // 3s after login
    };
  }

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
