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

    /* ── COMMAND PALETTE ── */
    #cmd-palette-backdrop {
      position:fixed; inset:0; background:rgba(5,10,25,0.75);
      backdrop-filter:blur(16px) saturate(150%); -webkit-backdrop-filter:blur(16px) saturate(150%);
      z-index:8888; display:none; align-items:flex-start; justify-content:center; padding-top:80px;
    }
    #cmd-palette-backdrop.open { display:flex; }
    #cmd-palette-box {
      width:100%; max-width:580px; background:rgba(255,255,255,0.97);
      backdrop-filter:blur(32px); border-radius:20px; overflow:hidden;
      box-shadow:0 32px 80px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.5) inset;
      animation:cmdEntrance 0.22s cubic-bezier(0.16,1,0.3,1); margin:0 16px;
    }
    @keyframes cmdEntrance { from{opacity:0;transform:scale(0.96) translateY(-12px)} to{opacity:1;transform:scale(1) translateY(0)} }
    #cmd-search-wrap { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.06); }
    #cmd-search-wrap i { color:#94a3b8; font-size:18px; flex-shrink:0; }
    #cmd-input { flex:1; border:none; outline:none; font-size:16px; font-weight:500; color:#0f172a; background:transparent; font-family:'Inter',sans-serif; }
    #cmd-input::placeholder { color:#94a3b8; }
    .cmd-kbd { font-size:10px; font-weight:700; color:#94a3b8; background:#f1f5f9; border:1px solid #e2e8f0; padding:3px 7px; border-radius:5px; }
    #cmd-results { max-height:360px; overflow-y:auto; padding:8px 0; }
    .cmd-section-label { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; padding:8px 20px 4px; }
    .cmd-item { display:flex; align-items:center; gap:14px; padding:11px 20px; cursor:pointer; transition:background 0.12s; color:#0f172a; }
    .cmd-item:hover,.cmd-item.focused { background:rgba(14,165,233,0.06); }
    .cmd-item i { width:20px; text-align:center; color:#64748b; font-size:14px; }
    .cmd-item-label { font-size:14px; font-weight:600; flex:1; }
    .cmd-item-hint { font-size:11px; color:#94a3b8; font-weight:500; }
    #cmd-footer { padding:10px 20px; border-top:1px solid rgba(0,0,0,0.05); display:flex; gap:16px; background:rgba(248,250,252,0.9); }
    .cmd-footer-hint { font-size:11px; color:#94a3b8; font-weight:500; display:flex; align-items:center; gap:5px; }
    body.dark-mode #cmd-palette-box { background:rgba(10,16,32,0.98); }
    body.dark-mode #cmd-input { color:#f1f5f9; }
    body.dark-mode #cmd-search-wrap { border-bottom-color:rgba(255,255,255,0.06); }
    body.dark-mode .cmd-item { color:#f1f5f9; }
    body.dark-mode .cmd-item:hover,body.dark-mode .cmd-item.focused { background:rgba(14,165,233,0.08); }
    body.dark-mode #cmd-footer { background:rgba(5,10,20,0.9); border-top-color:rgba(255,255,255,0.05); }
    body.dark-mode .cmd-kbd { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.1); color:#64748b; }

    /* ── WEEKLY BAR CHART ── */
    #weekly-chart-card {
      background:rgba(255,255,255,0.88); backdrop-filter:blur(12px); border-radius:18px;
      padding:22px 24px; border:1px solid rgba(255,255,255,0.95);
      box-shadow:0 4px 16px rgba(0,0,0,0.08); margin-bottom:16px;
    }
    .chart-bars-wrapper { display:flex; align-items:flex-end; gap:6px; height:100px; margin-top:16px; padding-bottom:2px; }
    .chart-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end; }
    .chart-bar { width:100%; border-radius:6px 6px 0 0; min-height:3px; transition:height 0.8s cubic-bezier(0.16,1,0.3,1); cursor:pointer; }
    .chart-bar:hover { opacity:0.85; }
    .chart-bar-label { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.3px; }
    .chart-bar-val { font-size:9px; font-weight:800; color:var(--text-muted); font-variant-numeric:tabular-nums; }
    body.dark-mode #weekly-chart-card { background:rgba(15,23,42,0.9); border-color:rgba(255,255,255,0.06); }
    body.dark-mode .chart-bar-label { color:#475569; }

    /* ── STREAK CARD ── */
    #streak-card {
      background:linear-gradient(135deg,rgba(227,6,19,0.08),rgba(227,6,19,0.03));
      border:1px solid rgba(227,6,19,0.15); border-radius:14px;
      padding:14px 18px; margin-bottom:16px;
      display:flex; align-items:center; gap:14px;
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
      animation:notifEntrance 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    #notif-panel.open { display:flex; }
    @keyframes notifEntrance { from{opacity:0;transform:translateY(-8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
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
    .confetti-piece {
      position:fixed; width:8px; height:8px; border-radius:2px;
      pointer-events:none; z-index:9999;
      animation:confettiFall linear forwards;
    }
    @keyframes confettiFall {
      0%   { opacity:1; transform:translateY(0) rotate(0deg); }
      100% { opacity:0; transform:translateY(100vh) rotate(720deg); }
    }

    /* ── UNDO SNACKBAR ── */
    #undo-snackbar {
      position:fixed; bottom:-80px; left:50%; transform:translateX(-50%);
      background:rgba(10,15,30,0.97); backdrop-filter:blur(16px);
      color:#fff; padding:13px 18px; border-radius:12px;
      font-size:13px; font-weight:600; z-index:8500;
      display:flex; align-items:center; gap:12px;
      box-shadow:0 12px 36px rgba(0,0,0,0.35);
      transition:bottom 0.32s cubic-bezier(0.16,1,0.3,1);
      white-space:nowrap;
    }
    #undo-snackbar.show { bottom:24px; }
    #undo-snackbar-btn {
      background:rgba(14,165,233,0.2); border:1px solid rgba(14,165,233,0.35);
      color:#38bdf8; padding:5px 12px; border-radius:7px;
      font-size:12px; font-weight:800; cursor:pointer; transition:all 0.15s;
    }
    #undo-snackbar-btn:hover { background:rgba(14,165,233,0.3); }
    #undo-progress { position:absolute; bottom:0; left:0; height:3px; background:#E30613; border-radius:0 0 12px 12px; transition:width linear; }

    /* ── LAST SAVED INDICATOR ── */
    #last-saved-indicator {
      display:flex; align-items:center; gap:5px;
      font-size:10px; font-weight:600; color:#94a3b8;
      padding:4px 10px; background:rgba(0,0,0,0.04);
      border-radius:99px; transition:all 0.3s;
      position:fixed; bottom:72px; right:16px; z-index:80;
      opacity:0; transform:translateY(4px);
    }
    #last-saved-indicator.show { opacity:1; transform:translateY(0); }
    #last-saved-indicator i { font-size:9px; color:#10b981; }
    body.dark-mode #last-saved-indicator { background:rgba(255,255,255,0.06); }

    /* ── CONNECTION QUALITY ── */
    #connection-quality-dot {
      display:inline-flex; align-items:center; gap:5px;
      font-size:10px; font-weight:700; padding:3px 9px;
      border-radius:99px; transition:all 0.4s;
    }
    #connection-quality-dot.fast   { background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); }
    #connection-quality-dot.medium { background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.2); }
    #connection-quality-dot.slow   { background:rgba(239,68,68,0.1);  color:#ef4444; border:1px solid rgba(239,68,68,0.2); }
    #connection-quality-dot.offline{ background:rgba(100,116,139,0.1);color:#64748b; border:1px solid rgba(100,116,139,0.2); }
    #connection-quality-dot .cq-dot { width:6px; height:6px; border-radius:50%; }

    /* ── HISTORY SORT BAR ── */
    #history-sort-bar {
      display:flex; align-items:center; gap:6px;
      margin-bottom:12px; flex-wrap:wrap;
    }
    #history-sort-bar .sort-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
    .sort-pill {
      background:rgba(0,0,0,0.05); border:1.5px solid transparent;
      padding:6px 14px; border-radius:99px; font-size:12px; font-weight:700;
      color:var(--text-muted); cursor:pointer; transition:all 0.15s; white-space:nowrap;
      display:inline-flex; align-items:center; gap:5px;
    }
    .sort-pill:hover { background:rgba(14,165,233,0.07); border-color:rgba(14,165,233,0.2); color:var(--primary-blue); }
    .sort-pill.active { background:rgba(14,165,233,0.1); border-color:rgba(14,165,233,0.3); color:var(--primary-blue); }
    body.dark-mode .sort-pill { background:rgba(255,255,255,0.05); }
    body.dark-mode .sort-pill:hover { background:rgba(14,165,233,0.1); }
    body.dark-mode .sort-pill.active { background:rgba(14,165,233,0.15); }

    /* ── PULL TO REFRESH ── */
    #pull-refresh-indicator {
      position:fixed; top:-60px; left:50%; transform:translateX(-50%);
      width:44px; height:44px; background:rgba(255,255,255,0.95);
      border-radius:50%; display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 16px rgba(0,0,0,0.12); transition:top 0.2s ease;
      z-index:99; border:1px solid rgba(0,0,0,0.06);
    }
    #pull-refresh-indicator.visible { top:16px; }
    #pull-refresh-indicator i { color:#E30613; font-size:18px; }
    #pull-refresh-indicator.spinning i { animation:refreshSpin 0.6s linear infinite; }
    @keyframes refreshSpin { to { transform:rotate(360deg); } }
    body.dark-mode #pull-refresh-indicator { background:rgba(15,23,42,0.98); border-color:rgba(255,255,255,0.1); }

    /* ── AUTO LOGOUT ── */
    #inactivity-warning {
      position:fixed; bottom:-100px; left:50%; transform:translateX(-50%);
      background:rgba(10,15,30,0.97); backdrop-filter:blur(20px); color:#fff;
      padding:14px 20px; border-radius:14px; font-size:13px; font-weight:600;
      box-shadow:0 16px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(227,6,19,0.3) inset;
      z-index:8000; display:flex; align-items:center; gap:12px;
      min-width:280px; max-width:380px; transition:bottom 0.38s cubic-bezier(0.16,1,0.3,1);
    }
    #inactivity-warning.visible { bottom:24px; }
    #inactivity-warning .inact-icon { width:36px; height:36px; background:rgba(227,6,19,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    #inactivity-warning .inact-timer { font-size:18px; font-weight:900; color:#E30613; min-width:28px; text-align:center; }
    #inactivity-stay-btn { background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.15); color:#fff; padding:7px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; transition:background 0.15s; }
    #inactivity-stay-btn:hover { background:rgba(255,255,255,0.2); }

    /* ── SHARE BUTTON ── */
    .share-pdf-btn { background:linear-gradient(135deg,rgba(14,165,233,0.1),rgba(14,165,233,0.05)); border:1px solid rgba(14,165,233,0.25); color:var(--primary-blue); padding:8px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.18s; }
    .share-pdf-btn:hover { background:rgba(14,165,233,0.14); transform:translateY(-1px); }

    /* ── MICRO RIPPLE ── */
    .ripple-container { position:relative; overflow:hidden; }
    .ripple-effect {
      position:absolute; border-radius:50%; background:rgba(14,165,233,0.25);
      transform:scale(0); animation:rippleAnim 0.5s linear;
      pointer-events:none;
    }
    @keyframes rippleAnim { to { transform:scale(4); opacity:0; } }
  `;
  document.head.appendChild(s);
})();


// ══════════════════════════════════════════════════════════════════
// FEATURE 1: Micro-animations (Ripple on buttons)
// ══════════════════════════════════════════════════════════════════
function addRipple(e) {
  const btn = e.currentTarget;
  if (!btn.classList.contains('ripple-container')) btn.classList.add('ripple-container');
  const r = document.createElement('span');
  r.className = 'ripple-effect';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.primary-btn, .break-pill, .sort-pill, .toggle-switch-btn');
  if (btn) addRipple({ currentTarget: btn, clientX: e.clientX, clientY: e.clientY });
});


// ══════════════════════════════════════════════════════════════════
// FEATURE 2: Toast with progress bar
// ══════════════════════════════════════════════════════════════════
let _toastTimer = null;
function showEnhancedToast(msg, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const icons  = { success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info' };
  const colors = { success:'#10b981', error:'#ef4444', info:'#3b82f6' };
  clearTimeout(_toastTimer);
  toast.innerHTML = `
    <i class="fa-solid ${icons[type]||icons.success}" style="color:${colors[type]||colors.success};font-size:16px;flex-shrink:0;"></i>
    <span style="flex:1;">${msg}</span>
    <div id="toast-progress" style="position:absolute;bottom:0;left:0;height:2px;background:${colors[type]||colors.success};border-radius:0 0 8px 8px;width:100%;transition:width 3s linear;"></div>`;
  toast.classList.add('show');
  requestAnimationFrame(() => { requestAnimationFrame(() => { const p = document.getElementById('toast-progress'); if(p) p.style.width='0%'; }); });
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 4: Streak Counter
// ══════════════════════════════════════════════════════════════════
function computeWorkStreak() {
  const today = new Date(); today.setHours(0,0,0,0);
  const worked = new Set();
  (globalLoggedSessionsDatabaseMock || []).forEach(s => {
    if (s.type === 'work') {
      const [dd,mm,yy] = s.date.split('/').map(Number);
      const d = new Date(yy, mm-1, dd); d.setHours(0,0,0,0);
      worked.add(d.getTime());
    }
  });
  const isWorkday = d => { const wd = d.getDay(); return wd >= 1 && wd <= 5; };
  const prevWorkday = (d) => { const x = new Date(d); do { x.setDate(x.getDate()-1); } while(!isWorkday(x)); return x; };
  let streak = 0, cur = new Date(today);
  if (!worked.has(cur.getTime())) { if (isWorkday(cur)) cur = prevWorkday(cur); }
  for (let i = 0; i < 365; i++) {
    if (!isWorkday(cur)) { cur = prevWorkday(cur); continue; }
    if (!worked.has(cur.getTime())) break;
    streak++; cur = prevWorkday(cur);
  }
  let best = 0, run = 0;
  const sortedDays = [...worked].sort((a,b)=>a-b);
  sortedDays.forEach((t,i) => {
    const d = new Date(t);
    if (!isWorkday(d)) return;
    if (i === 0) { run = 1; }
    else {
      const diff = (t - sortedDays[i-1]) / 86400000;
      run = diff <= 3 ? run + 1 : 1;
    }
    if (run > best) best = run;
  });
  return { streak, best };
}

function injectStreakCard() {
  if (document.getElementById('streak-card')) { updateStreakCard(); return; }
  const dash = document.getElementById('view-dashboard');
  if (!dash) return;
  const metricsGrid = dash.querySelector('.metrics-grid');
  if (!metricsGrid) return;
  const card = document.createElement('div');
  card.id = 'streak-card';
  card.onclick = () => showEnhancedToast('🔥 Streak = aufeinanderfolgende Arbeitstage!', 'info');
  metricsGrid.parentNode.insertBefore(card, metricsGrid.nextSibling);
  updateStreakCard();
}

function updateStreakCard() {
  const card = document.getElementById('streak-card');
  if (!card) return;
  const { streak, best } = computeWorkStreak();
  card.innerHTML = `
    <div class="streak-flame">${streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '📅'}</div>
    <div class="streak-info">
      <div class="streak-num">${streak} Tag${streak !== 1 ? 'e' : ''}</div>
      <div class="streak-lbl">Aktuelle Serie</div>
    </div>
    <div class="streak-best">
      <div class="best-num">${best} Tage</div>
      <div class="best-lbl">Bestleistung</div>
    </div>`;
  if (streak > 0 && streak % 5 === 0) triggerConfetti();
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 5: Confetti Burst
// ══════════════════════════════════════════════════════════════════
function triggerConfetti() {
  const colors = ['#E30613','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ec4899','#fff'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left:${Math.random()*100}vw; top:-10px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${6+Math.random()*6}px; height:${6+Math.random()*6}px;
      border-radius:${Math.random()>0.5?'50%':'2px'};
      animation-duration:${1.5+Math.random()*2}s;
      animation-delay:${Math.random()*0.6}s;`;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 6: Undo Snackbar
// ══════════════════════════════════════════════════════════════════
let _undoSnackTimer = null, _undoCallback = null;

function showUndoSnackbar(message, undoFn, durationMs = 5000) {
  let bar = document.getElementById('undo-snackbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'undo-snackbar';
    bar.innerHTML = `<span id="undo-msg"></span><button id="undo-snackbar-btn">↩ Rückgängig</button><div id="undo-progress"></div>`;
    document.body.appendChild(bar);
    document.getElementById('undo-snackbar-btn').onclick = () => {
      if (_undoCallback) { _undoCallback(); _undoCallback = null; }
      clearTimeout(_undoSnackTimer);
      bar.classList.remove('show');
    };
  }
  clearTimeout(_undoSnackTimer);
  _undoCallback = undoFn;
  document.getElementById('undo-msg').textContent = message;
  const prog = document.getElementById('undo-progress');
  prog.style.transition = 'none'; prog.style.width = '100%';
  bar.classList.add('show');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      prog.style.transition = `width ${durationMs}ms linear`;
      prog.style.width = '0%';
    });
  });
  _undoSnackTimer = setTimeout(() => { bar.classList.remove('show'); _undoCallback = null; }, durationMs);
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 13: Notification Centre
// ══════════════════════════════════════════════════════════════════
let notifStore = [], notifUnread = 0;

function addNotification(title, sub, iconClass, iconBg) {
  notifStore.unshift({ title, sub, iconClass, iconBg, time: Date.now(), read: false });
  if (notifStore.length > 20) notifStore.pop();
  notifUnread++;
  updateBellBadge();
}

function updateBellBadge() {
  const badge = document.getElementById('notif-bell-badge');
  if (!badge) return;
  badge.textContent = notifUnread > 9 ? '9+' : notifUnread;
  badge.classList.toggle('show', notifUnread > 0);
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (isOpen) {
    renderNotifList();
    notifUnread = 0; updateBellBadge();
    notifStore.forEach(n => n.read = true);
    setTimeout(() => {
      const close = (e) => {
        if (!panel.contains(e.target) && !document.getElementById('notif-bell-btn')?.contains(e.target)) {
          panel.classList.remove('open');
          document.removeEventListener('click', close);
        }
      };
      document.addEventListener('click', close);
    }, 50);
  }
}

function renderNotifList() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!notifStore.length) {
    list.innerHTML = '<div class="notif-empty"><i class="fa-solid fa-bell-slash" style="font-size:24px;color:#cbd5e1;display:block;margin-bottom:8px;"></i>Keine Benachrichtigungen</div>';
    return;
  }
  list.innerHTML = notifStore.map(n => {
    const rel = relativeTime(n.time);
    return `<div class="notif-item${n.read?'':' unread'}">
      <div class="notif-icon" style="background:${n.iconBg||'rgba(14,165,233,0.1)'}"><i class="fa-solid ${n.iconClass||'fa-bell'}" style="color:${n.iconBg?'':'#0ea5e9'}"></i></div>
      <div class="notif-text"><div class="notif-title-text">${n.title}</div><div class="notif-sub">${n.sub} · ${rel}</div></div>
    </div>`;
  }).join('');
}

function clearAllNotifs() {
  notifStore = []; notifUnread = 0;
  updateBellBadge(); renderNotifList();
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Gerade eben';
  if (diff < 3600000) return Math.floor(diff/60000) + ' min';
  if (diff < 86400000) return Math.floor(diff/3600000) + ' Std';
  return Math.floor(diff/86400000) + ' Tage';
}

function injectNotifBell() {
  if (document.getElementById('notif-bell-btn')) return;
  const header = document.querySelector('.app-header > div:last-child');
  if (!header) return;
  const btn = document.createElement('button');
  btn.id = 'notif-bell-btn';
  btn.onclick = toggleNotifPanel;
  btn.setAttribute('title', 'Benachrichtigungen');
  btn.innerHTML = `<i class="fa-solid fa-bell" style="font-size:14px;color:#64748b;"></i><span class="bell-badge" id="notif-bell-badge">0</span>`;
  header.prepend(btn);
  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-header">
      <div class="notif-header-title"><i class="fa-solid fa-bell" style="margin-right:7px;color:#E30613;font-size:12px;"></i>Benachrichtigungen</div>
      <button class="notif-clear-btn" onclick="clearAllNotifs()">Alle löschen</button>
    </div>
    <div class="notif-list" id="notif-list"></div>`;
  document.body.appendChild(panel);
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 18: Command Palette (Cmd+K / Ctrl+K)
// ══════════════════════════════════════════════════════════════════
const CMD_COMMANDS = [
  { icon:'fa-chart-simple',       label:'Dashboard',             hint:'Übersicht',            action: () => switchActiveView('dashboard',null) },
  { icon:'fa-pen-to-square',      label:'Arbeitszeit erfassen',  hint:'Neuen Eintrag buchen', action: () => switchActiveView('log-work',null) },
  { icon:'fa-umbrella-beach',     label:'Urlaub & Fehlzeiten',   hint:'Abwesenheiten',        action: () => switchActiveView('vacation',null) },
  { icon:'fa-clock-rotate-left',  label:'Stundenzettel-Archiv',  hint:'Verlauf',              action: () => switchActiveView('history',null) },
  { icon:'fa-camera-retro',       label:'KI-Scan',               hint:'Fotos scannen',        action: () => switchActiveView('ai-scan',null) },
  { icon:'fa-sliders',            label:'Einstellungen',         hint:'Konfigurationen',      action: () => switchActiveView('settings',null) },
  { icon:'fa-file-pdf',           label:'PDF exportieren',       hint:'Aktueller Zeitraum',   action: () => triggerPDFExportEngine(false) },
  { icon:'fa-moon',               label:'Dark Mode umschalten',  hint:'Erscheinungsbild',     action: () => toggleDarkMode() },
  { icon:'fa-rotate-right',       label:'Daten aktualisieren',   hint:'Cloud-Sync',           action: () => { loadUserDataFromCloud().then(()=>{ runGlobalApplicationMetricsEngine(); renderHistoricalRecordsSheet(); showEnhancedToast('✓ Daten aktualisiert'); }); } },
  { icon:'fa-right-from-bracket', label:'Abmelden',              hint:'Sitzung beenden',      action: () => handleSecureSignOutRequest() },
];
let cmdFocusIndex = 0, cmdFilteredCommands = [...CMD_COMMANDS];

function openCommandPalette() {
  const backdrop = document.getElementById('cmd-palette-backdrop'); if (!backdrop) return;
  backdrop.classList.add('open');
  const input = document.getElementById('cmd-input');
  if (input) { input.value = ''; input.focus(); }
  cmdFocusIndex = 0; renderCmdResults('');
}
function closeCommandPalette() { document.getElementById('cmd-palette-backdrop')?.classList.remove('open'); }
function renderCmdResults(query) {
  const container = document.getElementById('cmd-results'); if (!container) return;
  const q = query.toLowerCase().trim();
  cmdFilteredCommands = q ? CMD_COMMANDS.filter(c => c.label.toLowerCase().includes(q)||(c.hint||'').toLowerCase().includes(q)) : CMD_COMMANDS;
  if (!cmdFilteredCommands.length) { container.innerHTML = `<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;font-weight:600;"><i class="fa-solid fa-magnifying-glass" style="display:block;font-size:24px;margin-bottom:10px;color:#cbd5e1;"></i>Keine Ergebnisse für "${query}"</div>`; return; }
  cmdFocusIndex = Math.min(cmdFocusIndex, cmdFilteredCommands.length - 1);
  container.innerHTML = (q ? '' : '<div class="cmd-section-label">Schnellzugriff</div>') +
    cmdFilteredCommands.map((c,i) => `<div class="cmd-item${i===cmdFocusIndex?' focused':''}" data-idx="${i}" onmousedown="executeCmdItem(${i})"><i class="fa-solid ${c.icon}"></i><span class="cmd-item-label">${c.label}</span><span class="cmd-item-hint">${c.hint||''}</span></div>`).join('');
}
function executeCmdItem(idx) {
  const cmd = cmdFilteredCommands[idx]; if (!cmd) return;
  closeCommandPalette(); setTimeout(() => cmd.action(), 80);
}
document.addEventListener('keydown', (e) => {
  const isOpen = document.getElementById('cmd-palette-backdrop')?.classList.contains('open');
  if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); isOpen ? closeCommandPalette() : openCommandPalette(); return; }
  if (!isOpen) return;
  if (e.key==='Escape') { closeCommandPalette(); return; }
  if (e.key==='ArrowDown') { e.preventDefault(); cmdFocusIndex=Math.min(cmdFocusIndex+1,cmdFilteredCommands.length-1); renderCmdResults(document.getElementById('cmd-input')?.value||''); document.querySelector('.cmd-item.focused')?.scrollIntoView({block:'nearest'}); }
  if (e.key==='ArrowUp')   { e.preventDefault(); cmdFocusIndex=Math.max(cmdFocusIndex-1,0); renderCmdResults(document.getElementById('cmd-input')?.value||''); document.querySelector('.cmd-item.focused')?.scrollIntoView({block:'nearest'}); }
  if (e.key==='Enter') { e.preventDefault(); executeCmdItem(cmdFocusIndex); }
});


// ══════════════════════════════════════════════════════════════════
// FEATURE 7: Weekly Bar Chart — always Mo–So of the CURRENT week
// ══════════════════════════════════════════════════════════════════
function injectWeeklyChart() {
  const dash = document.getElementById('view-dashboard');
  if (!dash || document.getElementById('weekly-chart-card')) return;
  const container = dash.querySelector('.panel-scroll-content'); if (!container) return;
  const card = document.createElement('div');
  card.id = 'weekly-chart-card';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="fa-solid fa-chart-column" style="color:var(--primary-blue);font-size:16px;"></i>
        <div>
          <div style="font-size:14px;font-weight:800;color:var(--text-main);">Wochenübersicht</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:1px;" id="weekly-chart-subtitle">KW – Netto-Arbeitsstunden</div>
        </div>
      </div>
      <div id="chart-total-badge" style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.2);padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;color:var(--primary-blue);">0 h</div>
    </div>
    <div class="chart-bars-wrapper" id="weekly-bars"></div>`;
  container.appendChild(card);
  renderWeeklyChart();
}

function renderWeeklyChart() {
  const barsEl    = document.getElementById('weekly-bars');
  const badgeEl   = document.getElementById('chart-total-badge');
  const subtitleEl= document.getElementById('weekly-chart-subtitle');
  if (!barsEl) return;

  const now     = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Find Monday of the current week (week starts Monday)
  const jsDay    = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diffToMon = (jsDay === 0) ? -6 : 1 - jsDay; // days to subtract to reach Monday
  const monday   = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0,0,0,0);

  const DAY_LABELS = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  const BAR_COLORS = ['#E30613','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#6366f1','#ec4899'];

  // Build the 7 days Mo→So
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d  = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dd  = String(d.getDate()).padStart(2,'0');
    const mm  = String(d.getMonth()+1).padStart(2,'0');
    const yy  = d.getFullYear();
    const key = `${dd}/${mm}/${yy}`;
    const isToday   = d.getTime() === todayMs;
    const isFuture  = d.getTime() > todayMs;
    let hrs = 0;
    (globalLoggedSessionsDatabaseMock || []).forEach(s => {
      if (s.type === 'work' && s.date === key)
        hrs += Math.max(0, (s.duration || 0) - ((s.breakTime || 0) / 60));
    });
    days.push({ label: DAY_LABELS[i], hrs, key, isToday, isFuture, color: BAR_COLORS[i] });
  }

  // KW number
  const getKW = (d) => {
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  };
  const kw = getKW(monday);
  const monFmt = monday.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' });
  const sunDate = new Date(monday); sunDate.setDate(monday.getDate() + 6);
  const sunFmt = sunDate.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' });
  if (subtitleEl) subtitleEl.textContent = `KW ${kw} · ${monFmt} – ${sunFmt}`;

  const totalWk = days.reduce((s, d) => s + d.hrs, 0);
  const maxHrs  = Math.max(...days.map(d => d.hrs), 1);
  if (badgeEl) badgeEl.textContent = totalWk.toFixed(1) + ' h';

  barsEl.innerHTML = days.map(d => {
    const heightPct = d.hrs > 0 ? Math.max((d.hrs / maxHrs) * 100, 8) : 3;
    // Future days get a very faint placeholder bar
    const opacity = d.isFuture ? '0.12' : d.hrs > 0 ? '1' : '0.22';
    const barColor = d.isToday ? '#E30613' : d.color;
    const shadow   = d.isToday ? 'box-shadow:0 4px 14px rgba(227,6,19,0.35);' : '';
    const labelColor = d.isToday ? '#E30613' : d.isFuture ? '#cbd5e1' : '';
    const labelWeight = d.isToday ? '800' : '700';
    return `
      <div class="chart-bar-col" title="${d.label}: ${d.isFuture ? 'noch kein Eintrag' : d.hrs.toFixed(2) + ' h'}">
        <div class="chart-bar-val">${(!d.isFuture && d.hrs > 0) ? d.hrs.toFixed(1) : ''}</div>
        <div class="chart-bar" style="height:${heightPct}%;background:${barColor};opacity:${opacity};${shadow}"></div>
        <div class="chart-bar-label" style="color:${labelColor};font-weight:${labelWeight};">${d.label}</div>
      </div>`;
  }).join('');
}


// ══════════════════════════════════════════════════════════════════
// HISTORY SORT BAR
// ══════════════════════════════════════════════════════════════════
let _historySortMode = 'date-desc';

function injectHistorySortBar() {
  if (document.getElementById('history-sort-bar')) { updateSortPills(); return; }
  const container = document.querySelector('#view-history .panel-scroll-content');
  if (!container) return;
  const histItems = document.getElementById('history-items-container'); if (!histItems) return;
  const bar = document.createElement('div');
  bar.id = 'history-sort-bar';
  bar.innerHTML = `
    <span class="sort-label"><i class="fa-solid fa-arrow-up-wide-short" style="margin-right:4px;"></i>Sortieren:</span>
    <button class="sort-pill active" data-sort="date-desc" onclick="setHistorySort('date-desc')"><i class="fa-solid fa-arrow-down"></i> Neueste zuerst</button>
    <button class="sort-pill" data-sort="date-asc"  onclick="setHistorySort('date-asc')"><i class="fa-solid fa-arrow-up"></i> Älteste zuerst</button>
    <button class="sort-pill" data-sort="edited"    onclick="setHistorySort('edited')"><i class="fa-solid fa-clock-rotate-left"></i> Zuletzt bearbeitet</button>`;
  container.insertBefore(bar, histItems);
}

function setHistorySort(mode) {
  _historySortMode = mode;
  updateSortPills();
  renderHistoricalRecordsSheet();
}

function updateSortPills() {
  document.querySelectorAll('.sort-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.sort === _historySortMode);
  });
}

function getSortedSessions() {
  const sessions = [...(globalLoggedSessionsDatabaseMock || [])];
  const parseDate = (dmy) => { const [d,m,y] = dmy.split('/').map(Number); return new Date(y,m-1,d); };
  if (_historySortMode === 'date-asc')  return sessions.sort((a,b) => parseDate(a.date) - parseDate(b.date));
  if (_historySortMode === 'date-desc') return sessions.sort((a,b) => parseDate(b.date) - parseDate(a.date));
  if (_historySortMode === 'edited')    return sessions.sort((a,b) => {
    const ta = parseInt((a.id||'0').replace(/\D.*$/,'').replace('work-','')) || 0;
    const tb = parseInt((b.id||'0').replace(/\D.*$/,'').replace('work-','')) || 0;
    return tb - ta;
  });
  return sessions;
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 29: Connection Quality Indicator
// ══════════════════════════════════════════════════════════════════
let _cqInterval = null;
function injectConnectionQuality() {
  if (document.getElementById('connection-quality-dot')) return;
  const clockEl = document.getElementById('live-clock-display');
  if (!clockEl) return;
  const dot = document.createElement('div');
  dot.id = 'connection-quality-dot';
  dot.className = 'fast';
  dot.innerHTML = `<span class="cq-dot" style="background:#10b981;"></span><span id="cq-label">Schnell</span>`;
  clockEl.parentNode.insertBefore(dot, clockEl);
  measureConnectionQuality();
  _cqInterval = setInterval(measureConnectionQuality, 15000);
}

async function measureConnectionQuality() {
  const dot = document.getElementById('connection-quality-dot');
  const lbl = document.getElementById('cq-label');
  if (!dot || !lbl) return;
  if (!navigator.onLine) {
    dot.className = 'connection-quality-dot offline';
    dot.querySelector('.cq-dot').style.background = '#64748b';
    lbl.textContent = 'Offline'; return;
  }
  try {
    const t0 = performance.now();
    await fetch('https://www.gstatic.com/generate_204', { mode:'no-cors', cache:'no-store' });
    const ms = performance.now() - t0;
    if (ms < 120)      { dot.className='connection-quality-dot fast';   dot.querySelector('.cq-dot').style.background='#10b981'; lbl.textContent='Schnell'; }
    else if (ms < 400) { dot.className='connection-quality-dot medium'; dot.querySelector('.cq-dot').style.background='#f59e0b'; lbl.textContent='Mittel'; }
    else               { dot.className='connection-quality-dot slow';   dot.querySelector('.cq-dot').style.background='#ef4444'; lbl.textContent='Langsam'; }
  } catch(e) {
    dot.className='connection-quality-dot offline'; dot.querySelector('.cq-dot').style.background='#64748b'; lbl.textContent='Offline';
  }
}


// ══════════════════════════════════════════════════════════════════
// LAST SAVED INDICATOR
// ══════════════════════════════════════════════════════════════════
let _lastSavedTimer = null;
function showLastSavedIndicator() {
  let ind = document.getElementById('last-saved-indicator');
  if (!ind) {
    ind = document.createElement('div');
    ind.id = 'last-saved-indicator';
    ind.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><span>Gerade gespeichert</span>`;
    document.body.appendChild(ind);
  }
  ind.classList.add('show');
  clearTimeout(_lastSavedTimer);
  _lastSavedTimer = setTimeout(() => ind.classList.remove('show'), 3000);
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 28: Pull-to-Refresh
// ══════════════════════════════════════════════════════════════════
(function initPullToRefresh() {
  let startY=0, pulling=false, refreshTriggered=false;
  const THRESHOLD=72;
  document.addEventListener('touchstart',(e)=>{ if(window.scrollY===0&&e.touches.length===1){startY=e.touches[0].clientY;pulling=true;refreshTriggered=false;} },{passive:true});
  document.addEventListener('touchmove',(e)=>{ if(!pulling)return; const dy=e.touches[0].clientY-startY; if(dy>20&&window.scrollY===0){const ind=document.getElementById('pull-refresh-indicator');if(ind){ind.classList.add('visible');if(dy>THRESHOLD&&!refreshTriggered){ind.classList.add('spinning');refreshTriggered=true;}}} },{passive:true});
  document.addEventListener('touchend',()=>{
    const ind=document.getElementById('pull-refresh-indicator'); if(!pulling)return; pulling=false;
    if(refreshTriggered&&ind){ loadUserDataFromCloud().then(()=>{ runGlobalApplicationMetricsEngine(); renderHistoricalRecordsSheet(); renderVacationRecordsSheet(); renderWeeklyChart(); showEnhancedToast('✓ Daten aktualisiert','success'); }).catch(()=>showEnhancedToast('Fehler','error')); }
    setTimeout(()=>{if(ind)ind.classList.remove('visible','spinning');},refreshTriggered?800:200); refreshTriggered=false;
  },{passive:true});
})();


// ══════════════════════════════════════════════════════════════════
// FEATURE 26: Auto-Logout on Inactivity
// ══════════════════════════════════════════════════════════════════
const INACTIVITY_TIMEOUT=30*60*1000, INACTIVITY_WARN=60*1000;
let inactivityTimer=null, warningTimer=null, inactivityCountdown=null, countdownSecs=60;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer); clearTimeout(warningTimer); clearInterval(inactivityCountdown);
  hideInactivityWarning();
  if (!authenticatedUserGlobal||authenticatedUserRoleGlobal==='admin') return;
  warningTimer    = setTimeout(showInactivityWarning, INACTIVITY_TIMEOUT-INACTIVITY_WARN);
  inactivityTimer = setTimeout(()=>{ hideInactivityWarning(); showEnhancedToast(activeLanguageGlobal==='de'?'Automatisch abgemeldet':'Auto-logged out','info'); handleSecureAutoLogout(); }, INACTIVITY_TIMEOUT);
}
function showInactivityWarning() {
  const el=document.getElementById('inactivity-warning'); if(!el)return;
  countdownSecs=60; el.classList.add('visible'); clearInterval(inactivityCountdown);
  inactivityCountdown=setInterval(()=>{ countdownSecs--; const t=el.querySelector('.inact-timer'); if(t)t.textContent=countdownSecs; if(countdownSecs<=0)clearInterval(inactivityCountdown); },1000);
}
function hideInactivityWarning() { document.getElementById('inactivity-warning')?.classList.remove('visible'); clearInterval(inactivityCountdown); }
function handleSecureAutoLogout() {
  auth.signOut().catch(()=>{});
  ['schuermann_auth_user','schuermann_auth_role'].forEach(k=>localStorage.removeItem(k));
  authenticatedUserGlobal=''; authenticatedUserRoleGlobal='user';
  globalLoggedSessionsDatabaseMock=[]; vacationLoggedDaysArrayCache=[]; recentlyDeletedItemsBinCache=[]; adminAllEntriesCache=[];
  document.getElementById('app-view').style.display='none';
  document.getElementById('admin-full-view').style.display='none';
  document.getElementById('login-view').style.display='flex';
  document.body.classList.remove('admin-mode');
}
['mousemove','keydown','touchstart','click','scroll'].forEach(ev=>document.addEventListener(ev,resetInactivityTimer,{passive:true}));


// ══════════════════════════════════════════════════════════════════
// SHARE SHEET
// ══════════════════════════════════════════════════════════════════
async function shareCurrentTimesheet() {
  const user=localStorage.getItem('schuermann_current_user')||'Mitarbeiter';
  if (navigator.share) {
    try { await navigator.share({title:'Meine Stunden Online',text:`Stundenzettel von ${user}`,url:window.location.href}); showEnhancedToast('✓ Geteilt','success'); }
    catch(err) { if(err.name!=='AbortError') showEnhancedToast('Teilen fehlgeschlagen','error'); }
  } else {
    try { await navigator.clipboard.writeText(window.location.href); showEnhancedToast('✓ Link kopiert','success'); }
    catch(e) { showEnhancedToast('Link: '+window.location.href,'info'); }
  }
}
function injectShareButton() {
  if (document.getElementById('btn-share-timesheet')) return;
  const titleEl=document.querySelector('#view-history .view-title > div'); if(!titleEl) return;
  const btn=document.createElement('button');
  btn.id='btn-share-timesheet'; btn.className='share-pdf-btn';
  btn.innerHTML='<i class="fa-solid fa-share-nodes"></i> Teilen';
  btn.onclick=shareCurrentTimesheet; titleEl.prepend(btn);
}


// ══════════════════════════════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  document.body.insertAdjacentHTML('beforeend', `
    <div id="cmd-palette-backdrop" onclick="if(event.target===this)closeCommandPalette()">
      <div id="cmd-palette-box">
        <div id="cmd-search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input id="cmd-input" type="text" placeholder="Was möchtest du tun?" oninput="renderCmdResults(this.value)" autocomplete="off" spellcheck="false">
          <span class="cmd-kbd">ESC</span>
        </div>
        <div id="cmd-results"></div>
        <div id="cmd-footer">
          <span class="cmd-footer-hint"><span class="cmd-kbd">↑↓</span> Navigieren</span>
          <span class="cmd-footer-hint"><span class="cmd-kbd">↵</span> Ausführen</span>
          <span class="cmd-footer-hint"><span class="cmd-kbd">ESC</span> Schließen</span>
          <span class="cmd-footer-hint" style="margin-left:auto;color:#cbd5e1;font-size:10px;">⌘K</span>
        </div>
      </div>
    </div>`);

  document.body.insertAdjacentHTML('beforeend', '<div id="pull-refresh-indicator"><i class="fa-solid fa-rotate-right"></i></div>');

  document.body.insertAdjacentHTML('beforeend', `
    <div id="inactivity-warning">
      <div class="inact-icon"><i class="fa-solid fa-clock" style="color:#E30613;font-size:16px;"></i></div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:700;margin-bottom:2px;">Automatische Abmeldung</div><div style="font-size:11px;color:#64748b;">Inaktivität erkannt – abgemeldet in</div></div>
      <div class="inact-timer">60</div>
      <button id="inactivity-stay-btn" onclick="resetInactivityTimer()">Aktiv bleiben</button>
    </div>`);

  // Patch showToast globally
  if (typeof window.showToast === 'function') {
    window.showToast = function(msg, type) { showEnhancedToast(msg, type || 'success'); };
  }

  // Patch sendItemToTrashBin
  const origTrash = window.sendItemToTrashBin;
  if (typeof origTrash === 'function') {
    window.sendItemToTrashBin = function(id, type) {
      const item = type === 'work' || type === 'schule'
        ? (globalLoggedSessionsDatabaseMock || []).find(s => s.id === id)
        : (vacationLoggedDaysArrayCache || []).find(v => v.id === id);
      origTrash.apply(this, arguments);
      showUndoSnackbar('Eintrag gelöscht', () => {
        if (item) window.restoreItemFromTrashBin(item.id);
      });
      addNotification('Eintrag gelöscht', item?.project || item?.notes || 'Unbekannt', 'fa-trash-can', 'rgba(239,68,68,0.1)');
    };
  }

  // Patch persistUserData
  const origPersist = window.persistUserData;
  if (typeof origPersist === 'function') {
    window.persistUserData = function() { origPersist.apply(this, arguments); showLastSavedIndicator(); };
  }

  // Patch launchSessionUI
  const origLaunch = window.launchSessionUI;
  if (typeof origLaunch === 'function') {
    window.launchSessionUI = async function() {
      await origLaunch.apply(this, arguments);
      if (authenticatedUserRoleGlobal !== 'admin') {
        const name = localStorage.getItem('schuermann_current_user') || '';
        if (typeof showWelcomeSplash === 'function') showWelcomeSplash(name);
        setTimeout(() => {
          injectWeeklyChart();
          injectStreakCard();
          injectShareButton();
          injectNotifBell();
          injectConnectionQuality();
          renderWeeklyChart();
          updateStreakCard();
          resetInactivityTimer();
          startLiveClock();
          addNotification('Willkommen zurück!', name, 'fa-circle-check', 'rgba(16,185,129,0.1)');
        }, 350);
      }
    };
  }

  // Patch metrics engine
  const origMetrics = window.runGlobalApplicationMetricsEngine;
  if (typeof origMetrics === 'function') {
    window.runGlobalApplicationMetricsEngine = function() {
      origMetrics.apply(this, arguments);
      renderWeeklyChart();
      updateStreakCard();
    };
  }

  // Patch switchActiveView
  const origSwitch = window.switchActiveView;
  if (typeof origSwitch === 'function') {
    window.switchActiveView = function(targetId, navEl) {
      origSwitch.apply(this, arguments);
      if (targetId === 'history') {
        const container = document.getElementById('history-items-container');
        if (container && !globalLoggedSessionsDatabaseMock.length) {
          showSkeletonLoader('history-items-container', 4);
          setTimeout(() => { hideSkeletonLoader('history-items-container'); renderHistoricalRecordsSheet(); }, 500);
        }
        injectShareButton();
        injectHistorySortBar();
      }
    };
  }

  // Patch renderHistoricalRecordsSheet to use sorted data
  const origRender = window.renderHistoricalRecordsSheet;
  if (typeof origRender === 'function') {
    window.renderHistoricalRecordsSheet = function() {
      if (document.getElementById('history-sort-bar')) {
        const sorted = getSortedSessions();
        const backup = globalLoggedSessionsDatabaseMock;
        globalLoggedSessionsDatabaseMock = sorted;
        origRender.apply(this, arguments);
        globalLoggedSessionsDatabaseMock = backup;
      } else {
        origRender.apply(this, arguments);
      }
    };
  }
});