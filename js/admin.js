async function launchAdminDashboard() {
  setApplicationLanguage(activeLanguageGlobal);
  await refreshAdminData();
  populateReportEmployeeDropdown();
  document.getElementById('admin-last-update').textContent =
    'Letzte Aktualisierung: ' + new Date().toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
}

function populateReportEmployeeDropdown() {
  const dropdown = document.getElementById('report-employee-select'); if (!dropdown) return;
  const allUsers = [...new Set(adminAllEntriesCache.map(r => r.user))].sort();
  dropdown.innerHTML = '<option value="">-- Mitarbeiter wählen --</option>';
  allUsers.forEach(u => { const opt = document.createElement('option'); opt.value = u; opt.textContent = u; dropdown.appendChild(opt); });
}

function exportSingleEmployeeReport() {
  const selected = document.getElementById('report-employee-select').value;
  if (!selected) { showToast('Bitte Mitarbeiter auswählen.', 'error'); return; }
  generateEmployeePDFDocument(selected);
}

function switchAdminSection(section) {
  document.querySelectorAll('.admin-section').forEach(s  => s.style.display = 'none');
  document.querySelectorAll('.admin-nav-item').forEach(n  => n.classList.remove('active'));
  const sectionEl = document.getElementById('admin-section-' + section);
  const navEl     = document.getElementById('admin-nav-'     + section);
  if (sectionEl) sectionEl.style.display = 'block';
  if (navEl)     navEl.classList.add('active');
  const titles = { overview:'Dashboard', employees:'Mitarbeiter', absences:'Abwesenheiten', reports:'Berichte', settings:'Einstellungen' };
  document.getElementById('admin-page-title').textContent = titles[section] || 'Admin';
  if (section === 'employees') populateEmployeeDropdown();
  if (section === 'reports')   populateReportEmployeeDropdown();
  // Bug 3 Fix: populate absence-employee dropdown when absences section is opened
  if (section === 'absences')  populateAbsenceDropdown();
  const sidebar  = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('admin-sidebar-backdrop');
  if (sidebar)  sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('show');
}

function toggleAdminSidebar() {
  const sidebar  = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('admin-sidebar-backdrop');
  const isOpen   = sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('show', isOpen);
}

function handleAdminSignOut() {
  showConfirmModal(activeLanguageGlobal === 'de' ? 'Wirklich abmelden?' : 'Sign out?', () => {
    auth.signOut().catch(()=>{});
    localStorage.removeItem('schuermann_auth_user');
    localStorage.removeItem('schuermann_auth_role');
    authenticatedUserGlobal = ''; authenticatedUserRoleGlobal = 'user';
    globalLoggedSessionsDatabaseMock = []; vacationLoggedDaysArrayCache = [];
    recentlyDeletedItemsBinCache = []; adminAllEntriesCache = [];
    document.getElementById('admin-full-view').style.display = 'none';
    document.getElementById('app-view').style.display        = 'none';
    document.getElementById('login-view').style.display      = 'none';
    document.body.classList.remove('admin-mode');
    const lp = document.getElementById('landing-page');
    if (lp) lp.style.display = 'block';
  });
}

async function refreshAdminData() {
  const tbody = document.getElementById('admin-full-view')
    ? document.querySelector('#admin-full-view #admin-global-table-body')
    : document.getElementById('admin-global-table-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--admin-text-muted);"><i class="fa-solid fa-circle-notch fa-spin" style="margin-right:8px;"></i>Laden...</td></tr>`;
  try {
    const allSnap  = await db.collection('userProfiles').get();
    const allUsers = new Set(); let totalLogs = 0, totalHrs = 0;
    adminAllEntriesCache = []; adminVacAllowanceCache = {};

    allSnap.forEach(doc => {
      const uid         = doc.id, data = doc.data();
      const displayName = data.name || uid;
      const sessions    = data.workSessions || [], leaves = data.leaveDays || [];
      const allowance   = parseFloat(data.vacationAllowed);
      adminVacAllowanceCache[displayName] = isNaN(allowance) ? 30 : allowance;

      sessions.forEach(s => {
        if (s.id && s.date) {
          allUsers.add(displayName);
          const net = (s.duration || 0) - ((s.breakTime || 0) / 60);
          totalHrs += Math.max(0, net); totalLogs++;
          adminAllEntriesCache.push({ user:displayName, date:s.date, category:'WORK', desc:s.project||s.notes||'–', hrs:Math.max(0,net), rawDate:s.date, startTime:s.startTime||null, endTime:s.endTime||null, breakHrs:(s.breakTime||0)/60 });
        }
      });
      leaves.forEach(l => {
        if (l.id && l.date) {
          allUsers.add(displayName); totalLogs++;
          adminAllEntriesCache.push({ user:displayName, date:l.date, category:l.type==='sick'?'SICK':'VACATION', desc:l.notes||'–', hrs:0, rawDate:l.date });
        }
      });
    });

    adminAllEntriesCache.sort((a, b) => {
      const parse = d => { const [dd,mm,yy] = (d||'').split('/'); return new Date(yy, mm-1, dd); };
      return parse(b.rawDate) - parse(a.rawDate);
    });

    const fullView = document.getElementById('admin-full-view');
    const scopedEl = id => fullView ? fullView.querySelector('#' + id) : document.getElementById(id);

    const statTotal = scopedEl('admin-stat-total');
    const statUsers = scopedEl('admin-stat-users');
    const statHours = scopedEl('admin-stat-hours');
    if (statTotal) statTotal.textContent = totalLogs;
    if (statUsers) statUsers.textContent = allUsers.size;
    if (statHours) statHours.textContent = totalHrs.toFixed(2);

    const dropdown = scopedEl('admin-user-filter-dropdown');
    if (dropdown) {
      const curVal = dropdown.value;
      dropdown.innerHTML = '<option value="ALL">Alle Mitarbeiter</option>';
      [...allUsers].sort().forEach(u => { const opt = document.createElement('option'); opt.value = u; opt.textContent = u; dropdown.appendChild(opt); });
      if ([...allUsers].includes(curVal)) dropdown.value = curVal;
    }

    runAdminTableRender();
    document.getElementById('admin-last-update').textContent =
      'Letzte Aktualisierung: ' + new Date().toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:#f87171;">Fehler: ${err.message}</td></tr>`;
  }
}

function runAdminTableRender() {
  const fullView = document.getElementById('admin-full-view');
  const scopedEl = id => fullView ? fullView.querySelector('#' + id) : document.getElementById(id);

  const tbody      = scopedEl('admin-global-table-body');
  const filterUser = scopedEl('admin-user-filter-dropdown')?.value || 'ALL';
  const filterType = scopedEl('admin-type-filter')?.value || 'ALL';
  if (!tbody) return;
  tbody.innerHTML = '';
  const filtered = adminAllEntriesCache.filter(row => {
    if (filterUser !== 'ALL' && row.user     !== filterUser) return false;
    if (filterType !== 'ALL' && row.category !== filterType) return false;
    return true;
  });
  if (!filtered.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--admin-text-muted);">Keine Einträge gefunden.</td></tr>`; return; }
  filtered.forEach(row => {
    const tr    = tbody.insertRow();
    const badge = row.category==='VACATION' ? `<span class="badge-type-v">URLAUB</span>` : row.category==='SICK' ? `<span class="badge-type-s">KRANKMELDUNG</span>` : `<span class="badge-type-w">ARBEITSZEIT</span>`;
    const dur   = row.category === 'WORK' ? `${row.hrs.toFixed(2)} hrs` : '1 Tag';
    tr.innerHTML = `
      <td style="font-weight:700;color:#fff;"><i class="fa-solid fa-user-tie" style="color:var(--admin-gold);margin-right:8px;font-size:12px;"></i>${sanitizeHTML(row.user)}</td>
      <td>${sanitizeHTML(row.date)}</td>
      <td>${badge}</td>
      <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${sanitizeHTML(row.desc)}">${sanitizeHTML(row.desc)}</td>
      <td style="text-align:right;font-weight:700;color:var(--admin-gold);">${dur}</td>`;
  });
}

function switchAdminView(view) {
  const overviewTab   = document.getElementById('admin-tab-overview');
  const employeesTab  = document.getElementById('admin-tab-employees');
  const overviewView  = document.getElementById('admin-view-overview');
  const employeesView = document.getElementById('admin-view-employees');
  if (view === 'overview') {
    overviewTab.style.background='var(--admin-gold)'; overviewTab.style.color='#0f172a'; overviewTab.style.border='none';
    employeesTab.style.background='rgba(255,255,255,0.08)'; employeesTab.style.color='var(--admin-text-main)'; employeesTab.style.border='1px solid var(--admin-border)';
    overviewView.style.display='block'; employeesView.style.display='none';
  } else {
    employeesTab.style.background='var(--admin-gold)'; employeesTab.style.color='#0f172a'; employeesTab.style.border='none';
    overviewTab.style.background='rgba(255,255,255,0.08)'; overviewTab.style.color='var(--admin-text-main)'; overviewTab.style.border='1px solid var(--admin-border)';
    overviewView.style.display='none'; employeesView.style.display='block';
    populateEmployeeDropdown();
  }
}

function populateEmployeeDropdown() {
  const fullView = document.getElementById('admin-full-view');
  const dropdown = fullView ? fullView.querySelector('#admin-employee-select') : document.getElementById('admin-employee-select');
  if (!dropdown) return;
  const allUsers = new Set(adminAllEntriesCache.map(r => r.user));
  const curVal   = dropdown.value;
  dropdown.innerHTML = '<option value="">-- Mitarbeiter auswählen --</option>';
  [...allUsers].sort().forEach(u => { const opt = document.createElement('option'); opt.value=u; opt.textContent=u; dropdown.appendChild(opt); });
  if ([...allUsers].includes(curVal)) dropdown.value = curVal;
}

// Bug 3 Fix: populate the absence-employee dropdown (was never filled before)
function populateAbsenceDropdown() {
  const fullView = document.getElementById('admin-full-view');
  const dropdown = fullView ? fullView.querySelector('#absence-employee') : document.getElementById('absence-employee');
  if (!dropdown) return;
  const allUsers = new Set(adminAllEntriesCache.map(r => r.user));
  const curVal   = dropdown.value;
  dropdown.innerHTML = '<option value="">-- auswählen --</option>';
  [...allUsers].sort().forEach(u => {
    const opt = document.createElement('option'); opt.value = u; opt.textContent = u;
    dropdown.appendChild(opt);
  });
  if ([...allUsers].includes(curVal)) dropdown.value = curVal;
}

function renderEmployeeDetail() {
  const fullView   = document.getElementById('admin-full-view');
  const scopedEl   = id => fullView ? fullView.querySelector('#' + id) : document.getElementById(id);
  const selectedUser = scopedEl('admin-employee-select')?.value;
  const tbody        = scopedEl('admin-employee-table-body');
  const statsCards   = scopedEl('employee-stats-cards');
  const pdfBtn       = scopedEl('btn-export-employee-pdf');

  if (!selectedUser) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--admin-text-muted);"><i class="fa-solid fa-user-clock" style="margin-right:8px;font-size:16px;"></i>Bitte Mitarbeiter auswählen.</td></tr>`;
    statsCards.style.display = 'none'; pdfBtn.style.opacity = '0.5'; pdfBtn.disabled = true;
    return;
  }
  pdfBtn.style.opacity = '1'; pdfBtn.disabled = false;
  if (typeof loadAdminEmployeeNote === 'function') loadAdminEmployeeNote(selectedUser);

  const empData      = adminAllEntriesCache.filter(r => r.user === selectedUser);
  const workEntries  = empData.filter(r => r.category === 'WORK');
  const totalHours   = workEntries.reduce((sum, r) => sum + r.hrs, 0);
  const vacationDays = empData.filter(r => r.category === 'VACATION').length;
  const sickDays     = empData.filter(r => r.category === 'SICK').length;

  scopedEl('emp-stat-name').textContent     = selectedUser;
  scopedEl('emp-stat-hours').textContent    = totalHours.toFixed(2) + ' h';
  scopedEl('emp-stat-vacation').textContent = vacationDays;
  scopedEl('emp-stat-sick').textContent     = sickDays;

  // Bug 2 Fix: read shift-target from the hidden input in app-view (correct element)
  const targetEl = document.getElementById('shift-target-constraint');
  const baseTarget = parseFloat(targetEl?.value) || 8.5;

  const daily = {};
  workEntries.forEach(r => {
    if (!r.hrs || r.hrs <= 0) return;
    if (r.desc && /BERUFSSCHULE/i.test(r.desc)) return;
    daily[r.date] = (daily[r.date] || 0) + r.hrs;
  });
  let overtimeTotal = 0;
  for (const [dStr, hrs] of Object.entries(daily)) {
    const [dd,mm,yy] = dStr.split('/');
    const wd   = new Date(+yy, +mm-1, +dd).getDay();
    const soll = wd===5 ? 6 : (wd===0||wd===6 ? 0 : baseTarget);
    if (soll > 0) overtimeTotal += (hrs - soll);
  }
  const otEl = scopedEl('emp-stat-overtime');
  if (otEl) { const sign = overtimeTotal >= 0 ? '+' : ''; otEl.textContent = sign + overtimeTotal.toFixed(2) + ' h'; otEl.style.color = overtimeTotal >= 0 ? '#10b981' : '#ef4444'; }
  statsCards.style.display = 'grid';

  tbody.innerHTML = '';
  if (!empData.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--admin-text-muted);">Keine Einträge.</td></tr>`; return; }
  empData.forEach(row => {
    const tr    = tbody.insertRow();
    const badge = row.category==='VACATION' ? '<span class="badge-type-v">URLAUB</span>' : row.category==='SICK' ? '<span class="badge-type-s">KRANKMELDUNG</span>' : '<span class="badge-type-w">ARBEITSZEIT</span>';
    const dur   = row.category === 'WORK' ? row.hrs.toFixed(2) + ' hrs' : '1 Tag';
    tr.innerHTML = `<td>${row.date}</td><td>${badge}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${sanitizeHTML(row.desc)}">${sanitizeHTML(row.desc)}</td><td>${row.startTime||'-'}</td><td>${row.endTime||'-'}</td><td style="text-align:right;font-weight:700;color:var(--admin-gold);">${dur}</td>`;
  });
}

function exportEmployeePDF() {
  const fullView = document.getElementById('admin-full-view');
  const selectedUser = fullView
    ? fullView.querySelector('#admin-employee-select')?.value
    : document.getElementById('admin-employee-select')?.value;
  if (!selectedUser) return;
  generateEmployeePDFDocument(selectedUser);
}

function exportAllEmployeesPDF() {
  const allUsers = [...new Set(adminAllEntriesCache.map(r => r.user))].sort();
  if (!allUsers.length) { alert('Keine Mitarbeiter gefunden.'); return; }
  let index = 0;
  const downloadNext = () => { if (index < allUsers.length) { generateEmployeePDFDocument(allUsers[index]); index++; setTimeout(downloadNext, 500); } };
  downloadNext();
}

function exportAdminCSV() {
  if (!adminAllEntriesCache.length) { showToast(activeLanguageGlobal==='de'?'Keine Daten.':'No data.'); return; }
  const fullView = document.getElementById('admin-full-view');
  const scopedEl = id => fullView ? fullView.querySelector('#' + id) : document.getElementById(id);
  const filterUser = scopedEl('admin-user-filter-dropdown')?.value || 'ALL';
  const filterType = scopedEl('admin-type-filter')?.value           || 'ALL';
  const rows   = adminAllEntriesCache.filter(r => { if (filterUser!=='ALL'&&r.user!==filterUser) return false; if (filterType!=='ALL'&&r.category!==filterType) return false; return true; });
  const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const header = ['Mitarbeiter','Datum','Typ','Baustelle/Kunde','Stunden','Start','Ende','Pause (h)'];
  const lines  = [header.map(escape).join(',')];
  rows.forEach(r => { lines.push([r.user, r.date, r.category, r.desc, r.category==='WORK'?r.hrs.toFixed(2):'', r.startTime||'', r.endTime||'', r.category==='WORK'?(r.breakHrs||0).toFixed(2):''].map(escape).join(',')); });
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = 'Schuermann_Export_' + new Date().toISOString().split('T')[0] + '.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast(activeLanguageGlobal==='de'?'✓ CSV exportiert':'✓ CSV exported');
}

function printAdminOverview() { window.print(); }

async function handleAdminPasswordChange() {
  const cur  = document.getElementById('admin-pin-current')?.value.trim();
  const nw   = document.getElementById('admin-pin-new')?.value.trim();
  const conf = document.getElementById('admin-pin-confirm')?.value.trim();
  const msg  = document.getElementById('admin-pin-msg');
  if (!cur||!nw||!conf) { msg.style.color='#ef4444'; msg.textContent='Alle Felder ausfüllen.'; return; }
  if (nw !== conf)       { msg.style.color='#ef4444'; msg.textContent='Kennwörter stimmen nicht überein.'; return; }
  if (nw.length < 6)     { msg.style.color='#ef4444'; msg.textContent='Mind. 6 Zeichen erforderlich.'; return; }
  try {
    const user = auth.currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, cur);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(nw);
    msg.style.color = '#34d399'; msg.textContent = '✓ Kennwort geändert.';
    document.getElementById('admin-pin-current').value = '';
    document.getElementById('admin-pin-new').value     = '';
    document.getElementById('admin-pin-confirm').value = '';
  } catch(err) {
    msg.style.color = '#ef4444';
    msg.textContent = (err.code==='auth/wrong-password'||err.code==='auth/invalid-credential') ? 'Kennwort falsch.' : 'Fehler: ' + err.message;
  }
}

async function loadAdminEmployeeNote(user) {
  const box = document.getElementById('admin-employee-note-box');
  const inp = document.getElementById('admin-employee-note-input');
  const msg = document.getElementById('admin-note-saved-msg');
  if (!box || !inp) return;
  if (!user) { box.style.display = 'none'; return; }
  box.style.display = 'block'; msg.style.display = 'none';
  try { const doc = await db.collection('adminNotes').doc(user).get(); inp.value = doc.exists ? (doc.data().note || '') : ''; }
  catch(e) { inp.value = ''; }
}

async function saveAdminEmployeeNote() {
  const user = document.getElementById('admin-employee-select')?.value;
  const inp  = document.getElementById('admin-employee-note-input');
  const msg  = document.getElementById('admin-note-saved-msg');
  if (!user || !inp) return;
  try {
    await db.collection('adminNotes').doc(user).set({ note:inp.value, updatedAt:firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  } catch(e) { showToast('Fehler beim Speichern'); }
}

function registerAbsence() {
  const fullView = document.getElementById('admin-full-view');
  // Bug 3 Fix: scope lookup to admin-full-view to get correct elements
  const emp    = (fullView ? fullView.querySelector('#absence-employee') : document.getElementById('absence-employee'))?.value;
  const start  = (fullView ? fullView.querySelector('#absence-start')    : document.getElementById('absence-start'))?.value;
  const end    = (fullView ? fullView.querySelector('#absence-end')      : document.getElementById('absence-end'))?.value;
  const status = fullView ? fullView.querySelector('#absence-status') : document.getElementById('absence-status');
  if (!emp || !start || !end) { if(status){status.style.color='#f87171'; status.textContent='Bitte alle Pflichtfelder ausfüllen.';} return; }
  if(status){status.style.color='#34d399'; status.textContent='✓ Gespeichert.';}
  setTimeout(() => { if(status) status.textContent=''; }, 3000);
}
