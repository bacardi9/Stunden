let _trashPurgeInterval = null;

function _showLoadingScreen() {
  var existing = document.getElementById('_auth_loader');
  if (existing) return;
  var el = document.createElement('div');
  el.id = '_auth_loader';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#03060f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;';
  el.innerHTML = '<div style="width:52px;height:52px;border:3px solid rgba(227,6,19,0.2);border-top-color:#E30613;border-radius:50%;animation:_authSpin 0.75s linear infinite;"></div>'
    + '<div style="font-size:13px;font-weight:700;color:#475569;">Wird geladen…</div>'
    + '<style>@keyframes _authSpin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(el);
}
function _hideLoadingScreen() {
  var el = document.getElementById('_auth_loader');
  if (el) el.remove();
}

// Show a view by removing the inline display:none set by the head script
// Using removeProperty allows the element's own CSS (or no CSS) to take over
function _showEl(id, displayVal) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.removeProperty('display');
  el.style.display = displayVal || 'block';
}
function _hideEl(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', function() {
  populateLogTimeFormDropdowns();
  setApplicationLanguage('de');
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);

  var today = new Date().toISOString().split('T')[0];
  document.getElementById('log-date-picker').value          = today;
  document.getElementById('vacation-from-date-input').value = today;
  document.getElementById('vacation-to-date-input').value   = today;
  document.getElementById('schule-date-picker').value       = today;

  var def = getDefault20to20Period();
  var startInput = document.getElementById('export-start-date');
  var endInput   = document.getElementById('export-end-date');
  if (startInput && endInput) {
    startInput.value = new Date(def.start.getTime() - def.start.getTimezoneOffset()*60000).toISOString().split('T')[0];
    endInput.value   = new Date(def.end.getTime()   - def.end.getTimezoneOffset()*60000).toISOString().split('T')[0];
  }

  if (window.flatpickr) {
    var commonOpts = {
      dateFormat:'Y-m-d', allowInput:false, disableMobile:true,
      locale:{
        firstDayOfWeek:1,
        weekdays:{shorthand:['So','Mo','Di','Mi','Do','Fr','Sa'],longhand:['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']},
        months:{shorthand:['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],longhand:['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']}
      }
    };
    flatpickr('#log-date-picker', Object.assign({}, commonOpts, {defaultDate:today, onChange:function(){
      document.getElementById('log-start-time').value='07:00';
      document.getElementById('log-end-time').value='16:15';
      document.querySelectorAll('.break-pill').forEach(function(p){p.classList.remove('active');});
      document.querySelector('.break-pill').classList.add('active');
      activeSelectedFormBreakDuration=0; saveDraftWorkEntry();
    }}));
    flatpickr('#schule-date-picker',       Object.assign({}, commonOpts, {defaultDate:today}));
    flatpickr('#vacation-from-date-input', Object.assign({}, commonOpts, {defaultDate:today}));
    flatpickr('#vacation-to-date-input',   Object.assign({}, commonOpts, {defaultDate:today}));
    flatpickr('#export-start-date',        Object.assign({}, commonOpts));
    flatpickr('#export-end-date',          Object.assign({}, commonOpts));
    flatpickr('#absence-start',            Object.assign({}, commonOpts, {dateFormat:'Y-m-d'}));
    flatpickr('#absence-end',              Object.assign({}, commonOpts, {dateFormat:'Y-m-d'}));
  }

  document.getElementById('log-date-picker').addEventListener('change', saveDraftWorkEntry);
  _trashPurgeInterval = setInterval(enforceTrashLifespanPurgeEngine, 60000);
  window.addEventListener('online',  updateCloudBackupStatusIndicator);
  window.addEventListener('offline', updateCloudBackupStatusIndicator);
  updateCloudBackupStatusIndicator();
  ['log-project-name','log-start-time','log-end-time','log-notes'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) { el.addEventListener('input', saveDraftWorkEntry); el.addEventListener('change', saveDraftWorkEntry); }
  });
  window.addEventListener('online',  flushOfflineQueue);
  window.addEventListener('online',  updateOfflineBadge);
  window.addEventListener('offline', updateOfflineBadge);
  updateOfflineBadge();

  var cached = localStorage.getItem('schuermann_auth_user');
  if (!cached) {
    // No session — landing already visible from head script
    return;
  }

  // Hide landing, show loader, wait for Firebase
  _hideEl('landing-page');
  _showLoadingScreen();
  authenticatedUserGlobal = cached;
  _waitForFirebaseAuth(cached);
});

function _waitForFirebaseAuth(cachedUid) {
  if (auth.currentUser) {
    _restoreSessionFromFirebase(auth.currentUser, cachedUid);
    return;
  }
  var settled = false;
  var unsubscribe = auth.onAuthStateChanged(function(user) {
    if (settled) return;
    settled = true;
    unsubscribe();
    if (user) {
      _restoreSessionFromFirebase(user, cachedUid);
    } else {
      _clearSessionAndShowLanding();
    }
  });
  setTimeout(function() {
    if (settled) return;
    settled = true;
    unsubscribe();
    if (!navigator.onLine) {
      authenticatedUserRoleGlobal = localStorage.getItem('schuermann_auth_role') || 'user';
      _hideLoadingScreen();
      launchSessionUI();
    } else {
      _clearSessionAndShowLanding();
    }
  }, 8000);
}

async function _restoreSessionFromFirebase(user, cachedUid) {
  if (user.uid !== cachedUid) { _clearSessionAndShowLanding(); return; }
  try {
    var snap = await db.collection('userProfiles').doc(cachedUid).get();
    var data = snap.exists ? snap.data() : {};
    authenticatedUserRoleGlobal = data.isAdmin === true ? 'admin' : 'user';
    localStorage.setItem('schuermann_auth_role', authenticatedUserRoleGlobal);
    if (data.name)        localStorage.setItem('schuermann_current_user', data.name);
    if (data.companyName) localStorage.setItem('schuermann_company_name', data.companyName);
  } catch(e) {
    console.warn('Profile load failed, using cached role:', e);
    authenticatedUserRoleGlobal = localStorage.getItem('schuermann_auth_role') || 'user';
  }
  _hideLoadingScreen();
  launchSessionUI();
}

function _clearSessionAndShowLanding() {
  localStorage.removeItem('schuermann_auth_user');
  localStorage.removeItem('schuermann_auth_role');
  authenticatedUserGlobal     = '';
  authenticatedUserRoleGlobal = 'user';
  _hideLoadingScreen();
  _showEl('landing-page', 'block');
}

function reinitDatePickers() {
  if (!window.flatpickr) return;
  var commonOpts = {
    dateFormat:'Y-m-d', allowInput:false, disableMobile:true,
    locale:{
      firstDayOfWeek:1,
      weekdays:{shorthand:['So','Mo','Di','Mi','Do','Fr','Sa'],longhand:['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']},
      months:{shorthand:['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],longhand:['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']}
    }
  };
  var ids = ['log-date-picker','schule-date-picker','vacation-from-date-input','vacation-to-date-input','export-start-date','export-end-date'];
  ids.forEach(function(id){
    var el = document.getElementById(id);
    if (el && !el._flatpickr) flatpickr(el, commonOpts);
  });
  setTimeout(function(){
    document.querySelectorAll('.form-group').forEach(function(group){
      var inp = group.querySelector('input[type="date"], input[readonly]');
      if (inp && inp._flatpickr && !group.dataset.fpClick) {
        group.dataset.fpClick = '1'; group.style.cursor = 'pointer';
        group.addEventListener('click', function(e){
          if (e.target.tagName==='LABEL') { inp._flatpickr.open(); return; }
          if (e.target===inp) return;
          inp._flatpickr.open();
        });
      }
    });
  }, 300);
}

function showToast(msg, type) {
  type = type || 'success';
  var toast  = document.getElementById('toast-notification');
  var icons  = {success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info'};
  var colors = {success:'#10b981', error:'#ef4444', info:'#3b82f6'};
  toast.innerHTML = '<i class="fa-solid '+(icons[type]||icons.success)+'" style="color:'+(colors[type]||colors.success)+';font-size:16px;"></i> '+msg;
  toast.classList.add('show');
  setTimeout(function(){ toast.classList.remove('show'); }, 3200);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  var rawName   = document.getElementById('username').value.trim().replace(/\s+/g,' ');
  var codeInput = document.getElementById('passcode').value.trim();
  var msgBox    = document.getElementById('message-box');
  msgBox.textContent = activeLanguageGlobal==='de'?'Verbindung wird hergestellt...':'Connecting...';
  msgBox.className = 'message success';
  try {
    var loginKey = rawName.toLowerCase()
      .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
      .replace(/[^a-z0-9]/gi,'');
    if (!loginKey) throw new Error('empty-name');
    var cred = await auth.signInWithEmailAndPassword(loginKey+'@sch.local', codeInput);
    authenticatedUserGlobal = cred.user.uid;
    var displayName = rawName.split(' ').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();}).join(' ');
    var isAdminFlag = false;
    try {
      var profileSnap = await db.collection('userProfiles').doc(cred.user.uid).get();
      if (profileSnap.exists) isAdminFlag = profileSnap.data().isAdmin===true;
    } catch(e){}
    authenticatedUserRoleGlobal = isAdminFlag ? 'admin' : 'user';
    localStorage.setItem('schuermann_auth_user',    authenticatedUserGlobal);
    localStorage.setItem('schuermann_auth_role',    authenticatedUserRoleGlobal);
    localStorage.setItem('schuermann_current_user', displayName);
    await db.collection('userProfiles').doc(cred.user.uid).set(
      {name:displayName, uid:cred.user.uid, lastLogin:firebase.firestore.FieldValue.serverTimestamp()},
      {merge:true}
    );
    msgBox.textContent = (activeLanguageGlobal==='de'?'Willkommen zurück, ':'Welcome back, ')+displayName+'!';
    msgBox.className = 'message success';
    setTimeout(function(){ launchSessionUI(); }, 500);
  } catch(err) {
    console.error(err);
    msgBox.innerHTML = activeLanguageGlobal==='de'
      ? 'Mitarbeiter nicht gefunden oder falsches Kennwort.<br><span style="font-size:11px;color:#aaa;">Groß-/Kleinschreibung beachten!</span>'
      : 'Invalid name or password.<br><span style="font-size:11px;color:#aaa;">Check case sensitivity!</span>';
    msgBox.className = 'message error';
  }
}

async function launchSessionUI() {
  _hideLoadingScreen();
  // Hide landing using _hideEl so we don't fight CSS specificity
  _hideEl('landing-page');
  _hideEl('login-view');

  if (authenticatedUserRoleGlobal === 'admin') {
    _hideEl('app-view');
    _showEl('admin-full-view', 'block');
    document.getElementById('admin-user-display').textContent = localStorage.getItem('schuermann_current_user') || 'Admin';
    document.body.classList.add('admin-mode');
    launchAdminDashboard();
    return;
  }

  _hideEl('admin-full-view');
  document.body.classList.remove('admin-mode');
  // Use _showEl so the inline style is set cleanly
  _showEl('app-view', 'block');

  var displayName = localStorage.getItem('schuermann_current_user') || authenticatedUserGlobal;
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
  document.querySelectorAll('.nav-item').forEach(function(i){i.classList.remove('active');});
  if (navEl) navEl.classList.add('active');
  document.querySelectorAll('.content-panel').forEach(function(p){p.classList.remove('active');});
  var panel = document.getElementById('view-'+targetId);
  if (panel) panel.classList.add('active');
  var main = document.getElementById('main-content-layout');
  if (targetId==='admin-panel') { main.classList.add('admin-layout-widescreen'); refreshAdminData(); }
  else main.classList.remove('admin-layout-widescreen');
  if (targetId==='log-work') setTimeout(function(){ restoreDraftWorkEntry(); reinitDatePickers(); }, 100);
  toggleSidebarDrawer(false);
}

function openHiddenTrashView() { renderRecentlyDeletedBinSheet(); switchActiveView('deleted', null); }

function handleSecureSignOutRequest() {
  toggleSidebarDrawer(false);
  showConfirmModal(activeLanguageGlobal==='de'?'Wirklich abmelden?':'Sign out?', function(){
    auth.signOut().catch(function(){});
    localStorage.removeItem('schuermann_auth_user');
    localStorage.removeItem('schuermann_auth_role');
    if (_trashPurgeInterval) { clearInterval(_trashPurgeInterval); _trashPurgeInterval=null; }
    authenticatedUserGlobal=''; authenticatedUserRoleGlobal='user';
    globalLoggedSessionsDatabaseMock=[]; vacationLoggedDaysArrayCache=[];
    recentlyDeletedItemsBinCache=[]; adminAllEntriesCache=[];
    _hideEl('app-view');
    _hideEl('admin-full-view');
    _hideEl('login-view');
    document.body.classList.remove('admin-mode');
    _showEl('landing-page', 'block');
  });
}

function updateCloudBackupStatusIndicator() {
  var dot = document.getElementById('dash-backup-indicator'); if (!dot) return;
  if (navigator.onLine) { dot.className='backup-status-dot online'; dot.title='Cloud Sync Aktiv'; }
  else                  { dot.className='backup-status-dot offline'; dot.title='Offline'; }
}

function populateLogTimeFormDropdowns() {
  var startSel = document.getElementById('log-start-time');
  var endSel   = document.getElementById('log-end-time');
  startSel.innerHTML=''; endSel.innerHTML='';
  for (var h=0; h<24; h++) {
    ['00','15','30','45'].forEach(function(m){
      var t = (h<10?'0':'')+h+':'+m;
      var os = document.createElement('option'); os.value=t; os.textContent=t; if(t==='07:00') os.selected=true; startSel.appendChild(os);
      var oe = document.createElement('option'); oe.value=t; oe.textContent=t; if(t==='16:15') oe.selected=true; endSel.appendChild(oe);
    });
  }
}

function selectBreakOption(minutes, btn) {
  document.querySelectorAll('.break-pill').forEach(function(p){p.classList.remove('active');});
  btn.classList.add('active');
  activeSelectedFormBreakDuration = minutes;
}

function setLeaveManagementType(leaveType) {
  activeLeaveSubManagementType = leaveType;
  var t=uiTranslations[activeLanguageGlobal];
  var vacBtn=document.getElementById('toggle-leave-vacation');
  var sickBtn=document.getElementById('toggle-leave-sick');
  var lbl=document.getElementById('leave-context-label');
  var inp=document.getElementById('vacation-notes-input');
  var subBtn=document.getElementById('leave-submit-btn');
  if (!vacBtn) return;
  if (leaveType==='vacation') {
    vacBtn.classList.add('active'); sickBtn.classList.remove('active');
    if(lbl) lbl.textContent=t.vacContextV; if(inp) inp.placeholder=t.vacPlhV;
    if(subBtn){subBtn.textContent=t.vacSubmitV; subBtn.style.background='#3b82f6';}
  } else {
    sickBtn.classList.add('active'); vacBtn.classList.remove('active');
    if(lbl) lbl.textContent=t.vacContextS; if(inp) inp.placeholder=t.vacPlhS;
    if(subBtn){subBtn.textContent=t.vacSubmitS; subBtn.style.background='#10b981';}
  }
}

function computeRawHoursDiff(start, end) {
  var p1=start.split(':').map(Number), p2=end.split(':').map(Number);
  var diff=(p2[0]*60+p2[1])-(p1[0]*60+p1[1]);
  return diff>0?diff/60:0;
}

function handleNewRecordSubmission(event) {
  event.preventDefault();
  var startVal=document.getElementById('log-start-time').value;
  var endVal=document.getElementById('log-end-time').value;
  var grossHrs=computeRawHoursDiff(startVal,endVal);
  if (grossHrs<=0){showToast(activeLanguageGlobal==='de'?'⚠ Endzeit muss nach Startzeit liegen':'⚠ End time must be after start');return;}
  var dateRaw=document.getElementById('log-date-picker').value;
  var parts=dateRaw.split('-');
  var dateFormatted=parts[2]+'/'+parts[1]+'/'+parts[0];
  var startMins=parseInt(startVal.split(':')[0])*60+parseInt(startVal.split(':')[1]);
  var endMins=parseInt(endVal.split(':')[0])*60+parseInt(endVal.split(':')[1]);
  var existing=globalLoggedSessionsDatabaseMock.filter(function(r){return r.type==='work'&&r.date===dateFormatted;});
  for (var i=0;i<existing.length;i++) {
    var rec=existing[i];
    var rStart=parseInt(rec.startTime.split(':')[0])*60+parseInt(rec.startTime.split(':')[1]);
    var rEnd=parseInt(rec.endTime.split(':')[0])*60+parseInt(rec.endTime.split(':')[1]);
    if (startMins<rEnd&&endMins>rStart){showToast(activeLanguageGlobal==='de'?'⚠ Überschneidung mit '+rec.startTime+'–'+rec.endTime:'⚠ Overlap with '+rec.startTime+'–'+rec.endTime);return;}
  }
  var record={id:'work-'+Date.now(),type:'work',date:dateFormatted,startTime:startVal,endTime:endVal,project:document.getElementById('log-project-name').value.trim(),duration:grossHrs,breakTime:activeSelectedFormBreakDuration,notes:document.getElementById('log-notes').value.trim()};
  if (!navigator.onLine){
    var q=getOfflineQueue(); q.push(record); saveOfflineQueue(q);
    document.getElementById('log-project-name').value=''; document.getElementById('log-notes').value='';
    clearDraftWorkEntry(); selectBreakOption(0,document.querySelectorAll('.break-pill')[0]);
    showToast(activeLanguageGlobal==='de'?'📶 Offline gespeichert':'📶 Saved offline'); return;
  }
  globalLoggedSessionsDatabaseMock.unshift(record);
  persistUserData(); clearDraftWorkEntry();
  document.getElementById('log-project-name').value=''; document.getElementById('log-notes').value='';
  selectBreakOption(0,document.querySelectorAll('.break-pill')[0]);
  renderHistoricalRecordsSheet(); runGlobalApplicationMetricsEngine();
  document.getElementById('log-start-time').value=endVal;
  document.getElementById('log-project-name').focus();
  showToast(activeLanguageGlobal==='de'?'✓ Gespeichert':'✓ Saved');
}

function handleSchuleSubmission() {
  var dateRaw=document.getElementById('schule-date-picker').value;
  if(!dateRaw){showToast(activeLanguageGlobal==='de'?'⚠ Bitte Datum wählen':'⚠ Please select date','error');return;}
  var p=dateRaw.split('-'); var dateFormatted=p[2]+'/'+p[1]+'/'+p[0];
  var exists=globalLoggedSessionsDatabaseMock.find(function(r){return r.date===dateFormatted&&(r.type==='schule'||r.type==='work');});
  if(exists){showToast(activeLanguageGlobal==='de'?'⚠ Für diesen Tag existiert bereits ein Eintrag':'⚠ Entry already exists for this date','error');return;}
  var record={id:'schule-'+Date.now(),type:'schule',date:dateFormatted,startTime:null,endTime:null,project:'BERUFSSCHULE',duration:0,breakTime:0,notes:'Schultag'};
  globalLoggedSessionsDatabaseMock.unshift(record);
  persistUserData(); runGlobalApplicationMetricsEngine(); renderHistoricalRecordsSheet();
  showToast(activeLanguageGlobal==='de'?'✓ Schultag gebucht':'✓ School day logged');
}

function handleVacationDayLogSubmission(event) {
  event.preventDefault();
  var fromRaw=document.getElementById('vacation-from-date-input').value;
  var toRaw=document.getElementById('vacation-to-date-input').value;
  if(!fromRaw||!toRaw) return;
  var fromObj=new Date(fromRaw), toObj=new Date(toRaw);
  if(toObj<fromObj){alert(activeLanguageGlobal==='de'?'Fehler: Enddatum vor Startdatum!':'Error: To-date before From-date!');return;}
  var totalDays=Math.round((toObj-fromObj)/86400000)+1;
  var isSick=(activeLeaveSubManagementType==='sick');
  for(var i=0;i<totalDays;i++){
    var cur=new Date(fromObj); cur.setDate(fromObj.getDate()+i);
    var dd=String(cur.getDate()).padStart(2,'0'), mm=String(cur.getMonth()+1).padStart(2,'0');
    vacationLoggedDaysArrayCache.unshift({id:'vacation-'+Date.now()+'-'+i,type:isSick?'sick':'vacation',date:dd+'/'+mm+'/'+cur.getFullYear(),project:isSick?'Krankheit':'Urlaub',notes:document.getElementById('vacation-notes-input').value.trim(),duration:0,breakTime:0});
  }
  persistUserData();
  document.getElementById('vacation-from-date-input').value='';
  document.getElementById('vacation-to-date-input').value='';
  document.getElementById('vacation-notes-input').value='';
  renderVacationRecordsSheet(); runGlobalApplicationMetricsEngine();
  showToast(activeLanguageGlobal==='de'?'✓ '+totalDays+' Tag(e) eingebucht':'✓ '+totalDays+' day(s) logged');
}

function renderHistoricalRecordsSheet() {
  var mount=document.getElementById('history-items-container');
  var t=uiTranslations[activeLanguageGlobal];
  if(!mount) return;
  mount.innerHTML='';
  if(!globalLoggedSessionsDatabaseMock.length){mount.innerHTML='<p style="color:#64748b;font-size:13px;text-align:center;padding:24px;">'+t.emptyHist+'</p>';return;}
  globalLoggedSessionsDatabaseMock.forEach(function(s){
    var isSchule=s.type==='schule';
    var net=isSchule?0:(s.duration-(s.breakTime/60));
    var card=document.createElement('div');
    card.className='history-item'; card.style.borderLeftColor='var(--primary-blue)'; card.id='item-card-'+s.id;
    card.innerHTML='<div class="item-main-row"><div class="hist-left"><h5>'+(isSchule?'🎓 BERUFSSCHULE':s.project)+'</h5><p><i class="fa-solid fa-calendar-day" style="font-size:11px;margin-right:4px;"></i>'+s.date+(s.notes?' | '+s.notes:'')+'</p></div>'
      +'<div style="display:flex;align-items:center;">'
      +'<div class="hist-right"><div>'+(isSchule?'Schultag':net.toFixed(2)+' hrs')+'</div><div style="font-size:10px;color:#64748b;font-weight:500;">'+(isSchule?'Kein Abzug':t.lblBreak+': '+s.breakTime+'m')+'</div></div>'
      +'<button class="action-icon-btn" onclick="initializeInlineEditRow(\''+s.id+'\')" style="'+(isSchule?'display:none':'')+'"><i class="fa-solid fa-pen-to-square"></i></button>'
      +'<button class="action-icon-btn delete-hover" onclick="sendItemToTrashBin(\''+s.id+'\',\''+s.type+'\')"><i class="fa-solid fa-trash-can"></i></button>'
      +'</div></div>'
      +'<div id="inline-edit-container-'+s.id+'" style="display:none;"></div>';
    mount.appendChild(card);
  });
}

function renderVacationRecordsSheet() {
  var mount=document.getElementById('vacation-days-list-container');
  var t=uiTranslations[activeLanguageGlobal];
  if(!mount) return; mount.innerHTML='';
  if(!vacationLoggedDaysArrayCache.length){mount.innerHTML='<p style="color:#64748b;font-size:13px;text-align:center;padding:12px;">'+t.emptyLeave+'</p>';return;}
  vacationLoggedDaysArrayCache.forEach(function(v){
    var isSick=v.type==='sick';
    var card=document.createElement('div'); card.className='history-item'; card.style.borderLeftColor=isSick?'#ef4444':'#10b981';
    card.innerHTML='<div class="item-main-row"><div class="hist-left"><h5>'+(v.notes||(isSick?t.lblSickToken:t.lblVacToken))+'</h5><p><i class="'+(isSick?'fa-solid fa-briefcase-medical':'fa-solid fa-umbrella-beach')+'" style="font-size:11px;margin-right:4px;"></i>'+v.date+'<span style="font-size:10px;background:#f1f5f9;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:700;color:#475569;">'+(isSick?t.lblSickToken:t.lblVacToken)+'</span></p></div>'
      +'<div style="display:flex;align-items:center;"><div class="hist-right" style="color:'+(isSick?'#ef4444':'#10b981')+';">1 '+t.lblDay+'</div>'
      +'<button class="action-icon-btn delete-hover" onclick="sendItemToTrashBin(\''+v.id+'\',\'leave\')"><i class="fa-solid fa-trash-can"></i></button></div></div>';
    mount.appendChild(card);
  });
}

function renderRecentlyDeletedBinSheet() {
  var mount=document.getElementById('deleted-items-bin-container');
  var t=uiTranslations[activeLanguageGlobal];
  if(!mount) return; mount.innerHTML='';
  if(!recentlyDeletedItemsBinCache.length){mount.innerHTML='<p style="color:#64748b;font-size:13px;text-align:center;padding:24px;">'+t.emptyTrash+'</p>';return;}
  recentlyDeletedItemsBinCache.forEach(function(item){
    var typeLabel=item.type==='work'?(activeLanguageGlobal==='de'?'Arbeitszeit':'Work Record'):item.type==='sick'?(activeLanguageGlobal==='de'?'Krankmeldung':'Sick Leave'):(activeLanguageGlobal==='de'?'Urlaubstag':'Vacation Day');
    var row=document.createElement('div'); row.className='history-item'; row.style.borderLeftColor='#94a3b8';
    row.innerHTML='<div class="item-main-row"><div class="hist-left"><h5 style="color:#94a3b8;">['+(activeLanguageGlobal==='de'?'Gelöscht':'Deleted')+'] '+(item.project||item.notes||'–')+'</h5><p>'+(item.date||'')+' ('+typeLabel+')</p></div>'
      +'<button class="restore-btn" onclick="restoreItemFromTrashBin(\''+item.id+'\')">'+(activeLanguageGlobal==='de'?'Reaktivieren':'Restore')+'</button></div>';
    mount.appendChild(row);
  });
}

window.initializeInlineEditRow = function(id) {
  var s=globalLoggedSessionsDatabaseMock.find(function(i){return i.id===id;}); if(!s) return;
  var box=document.getElementById('inline-edit-container-'+id);
  box.innerHTML='<div class="inline-edit-box"><div class="form-group"><label style="font-size:10px;">Baustelle/Kunde</label><input type="text" id="edit-proj-'+id+'" value="'+s.project+'"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +'<div class="form-group"><label style="font-size:10px;">Kommen (HH:MM)</label><input type="text" id="edit-start-'+id+'" value="'+(s.startTime||'07:00')+'" placeholder="HH:MM"></div>'
    +'<div class="form-group"><label style="font-size:10px;">Gehen (HH:MM)</label><input type="text" id="edit-end-'+id+'" value="'+(s.endTime||'')+'" placeholder="HH:MM"></div></div>'
    +'<div class="form-group"><label style="font-size:10px;">Pause</label>'
    +'<select id="edit-brk-'+id+'"><option value="0" '+(s.breakTime===0?'selected':'')+'>Keine</option><option value="15" '+(s.breakTime===15?'selected':'')+'>15m</option><option value="30" '+(s.breakTime===30?'selected':'')+'>30m</option><option value="45" '+(s.breakTime===45?'selected':'')+'>45m</option><option value="60" '+(s.breakTime===60?'selected':'')+'>1h</option></select></div>'
    +'<div class="inline-edit-actions"><button class="inline-btn" style="background:#cbd5e1;color:#333;" onclick="closeInlineEditorFrame(\''+id+'\')">Abbrechen</button>'
    +'<button class="inline-btn" style="background:#10b981;color:white;" onclick="commitInlineChanges(\''+id+'\')">Übernehmen</button></div></div>';
  box.style.display='block';
};
window.closeInlineEditorFrame = function(id){document.getElementById('inline-edit-container-'+id).style.display='none';};
window.commitInlineChanges = function(id){
  var s=globalLoggedSessionsDatabaseMock.find(function(i){return i.id===id;}); if(!s) return;
  var proj=document.getElementById('edit-proj-'+id).value.trim();
  var start=document.getElementById('edit-start-'+id).value.trim();
  var end=document.getElementById('edit-end-'+id).value.trim();
  var brk=parseInt(document.getElementById('edit-brk-'+id).value);
  if(!proj||!start||!end){alert('Bitte alle Felder ausfüllen.');return;}
  if(!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end)){alert('Bitte Zeiten im Format HH:MM eingeben.');return;}
  var hrs=computeRawHoursDiff(start,end);
  if(hrs<=0){alert('Ungültige Zeitspanne.');return;}
  s.project=proj; s.startTime=start; s.endTime=end; s.duration=hrs; s.breakTime=brk;
  persistUserData(); renderHistoricalRecordsSheet(); runGlobalApplicationMetricsEngine();
  showToast(activeLanguageGlobal==='de'?'✓ Gespeichert':'✓ Saved');
};

window.sendItemToTrashBin = function(id,type){
  if(type==='work'||type==='schule'){
    var idx=globalLoggedSessionsDatabaseMock.findIndex(function(s){return s.id===id;});
    if(idx>-1){var obj=globalLoggedSessionsDatabaseMock.splice(idx,1)[0]; obj.deletedAtTimestamp=Date.now(); recentlyDeletedItemsBinCache.push(obj);}
  } else {
    var idx2=vacationLoggedDaysArrayCache.findIndex(function(v){return v.id===id;});
    if(idx2>-1){var obj2=vacationLoggedDaysArrayCache.splice(idx2,1)[0]; obj2.deletedAtTimestamp=Date.now(); recentlyDeletedItemsBinCache.push(obj2);}
  }
  persistUserData(); renderHistoricalRecordsSheet(); renderVacationRecordsSheet(); runGlobalApplicationMetricsEngine();
  showToast(activeLanguageGlobal==='de'?'In Papierkorb verschoben.':'Moved to trash.','info');
};

window.restoreItemFromTrashBin = function(id){
  var idx=recentlyDeletedItemsBinCache.findIndex(function(i){return i.id===id;});
  if(idx>-1){
    var item=recentlyDeletedItemsBinCache.splice(idx,1)[0];
    delete item.deletedAtTimestamp;
    if(item.type==='work'||item.type==='schule') globalLoggedSessionsDatabaseMock.unshift(item);
    else vacationLoggedDaysArrayCache.unshift(item);
  }
  persistUserData(); renderRecentlyDeletedBinSheet(); renderHistoricalRecordsSheet(); renderVacationRecordsSheet(); runGlobalApplicationMetricsEngine();
  showToast(activeLanguageGlobal==='de'?'✓ Wiederhergestellt':'✓ Restored');
};

function enforceTrashLifespanPurgeEngine(){
  if(!authenticatedUserGlobal) return;
  var limit=12*60*60*1000, now=Date.now();
  var before=recentlyDeletedItemsBinCache.length;
  recentlyDeletedItemsBinCache=recentlyDeletedItemsBinCache.filter(function(i){return (now-i.deletedAtTimestamp)<limit;});
  if(recentlyDeletedItemsBinCache.length!==before) persistUserData();
  if(document.getElementById('view-deleted').classList.contains('active')) renderRecentlyDeletedBinSheet();
}

function runGlobalApplicationMetricsEngine(){
  var netHrs=0, otHrs=0;
  dailyWorkTimeBreakdownLogs={}; dailyOvertimeBreakdownLogs={};
  var target=parseFloat(document.getElementById('shift-target-constraint').value)||8.5;
  globalLoggedSessionsDatabaseMock.forEach(function(s){
    var net=s.duration-(s.breakTime/60); netHrs+=net;
    dailyWorkTimeBreakdownLogs[s.date]=(dailyWorkTimeBreakdownLogs[s.date]||0)+net;
    var p=s.date.split('/'); var dow=new Date(p[2],p[1]-1,p[0]).getDay();
    var dayTarget=(dow===5)?6.0:(dow===0||dow===6)?0:target;
    if(net>dayTarget){var ot=net-dayTarget; otHrs+=ot; dailyOvertimeBreakdownLogs[s.date]=(dailyOvertimeBreakdownLogs[s.date]||0)+ot;}
  });
  var grossEl=document.getElementById('dash-gross-hours');
  var otEl=document.getElementById('dash-overtime-hours');
  if(grossEl){grossEl.textContent=netHrs.toFixed(2)+' hrs'; grossEl.parentElement.style.borderTop=netHrs>0?'4px solid var(--primary-blue)':'4px solid #cbd5e1';}
  if(otEl){otEl.textContent='+'+otHrs.toFixed(2)+' hrs'; otEl.parentElement.style.borderTop=otHrs>0?'4px solid #10b981':'4px solid #cbd5e1';}
}

function closeCustomReportModal(){document.getElementById('custom-report-modal-backdrop').classList.remove('show');}

function displayWorkTimeBreakdownSummary(){
  var t=uiTranslations[activeLanguageGlobal];
  document.getElementById('custom-modal-title-header').textContent=t.modalWorkTitle;
  document.getElementById('custom-modal-icon-header').className='fa-solid fa-briefcase';
  var body=document.getElementById('modal-report-content-body'); body.innerHTML='';
  var keys=Object.keys(dailyWorkTimeBreakdownLogs);
  if(!keys.length){body.innerHTML='<div style="text-align:center;padding:20px;color:#64748b;"><p style="font-size:14px;font-weight:600;">'+t.noWorkMsg+'</p></div>';}
  else{keys.forEach(function(k){var row=document.createElement('div');row.className='modal-report-row';row.innerHTML='<span>'+t.lblDay+': '+k+'</span><span style="font-weight:700;color:var(--primary-blue);">'+dailyWorkTimeBreakdownLogs[k].toFixed(2)+' hrs</span>';body.appendChild(row);});}
  document.getElementById('custom-report-modal-backdrop').classList.add('show');
}

function displayOvertimeBreakdownSummary(){
  var t=uiTranslations[activeLanguageGlobal];
  document.getElementById('custom-modal-title-header').textContent=t.modalOtTitle;
  document.getElementById('custom-modal-icon-header').className='fa-solid fa-clock';
  var body=document.getElementById('modal-report-content-body'); body.innerHTML='';
  var keys=Object.keys(dailyOvertimeBreakdownLogs);
  if(!keys.length){body.innerHTML='<div style="text-align:center;padding:20px;color:#64748b;"><p style="font-size:14px;font-weight:600;">'+t.noOtMsg+'</p></div>';}
  else{keys.forEach(function(k){var row=document.createElement('div');row.className='modal-report-row';row.innerHTML='<span>'+t.lblDay+': '+k+'</span><span style="font-weight:700;color:#10b981;">+'+dailyOvertimeBreakdownLogs[k].toFixed(2)+' hrs</span>';body.appendChild(row);});}
  document.getElementById('custom-report-modal-backdrop').classList.add('show');
}

function displayLeaveStatementBalancesSummary(){
  var t=uiTranslations[activeLanguageGlobal];
  document.getElementById('custom-modal-title-header').textContent=t.modalLeaveTitle;
  document.getElementById('custom-modal-icon-header').className='fa-solid fa-folder-open';
  var body=document.getElementById('modal-report-content-body'); body.innerHTML='';
  var allowed=parseFloat(document.getElementById('vacation-allowed-bank').value)||30;
  var vacTaken=vacationLoggedDaysArrayCache.filter(function(i){return i.type==='vacation';}).length;
  var sickTaken=vacationLoggedDaysArrayCache.filter(function(i){return i.type==='sick';}).length;
  var remaining=allowed-vacTaken;
  var box=document.createElement('div'); box.className='statement-summary-box';
  box.innerHTML='<div><span>'+t.lblYearlyAllow+'</span><span style="color:#0259b6;font-weight:700;">'+allowed+' '+t.lblDays+'</span></div>'
    +'<div><span>'+t.lblVacConsumed+'</span><span style="color:#ef4444;font-weight:700;">'+vacTaken+' '+t.lblDays+'</span></div>'
    +'<div style="border-top:1px solid #cbd5e1;margin-top:6px;padding-top:6px;"><span style="font-weight:700;">'+t.lblNetVac+'</span><span style="font-weight:700;color:'+(remaining>=0?'#10b981':'#dc2626')+';">'+remaining+' '+t.lblDays+'</span></div>'
    +'<div style="margin-top:4px;"><span>'+t.lblTotalSick+'</span><span style="color:#10b981;font-weight:700;">'+sickTaken+' '+t.lblDays+'</span></div>';
  body.appendChild(box);
  if(!vacationLoggedDaysArrayCache.length){var p=document.createElement('p');p.style.cssText='text-align:center;padding:12px;color:#94a3b8;font-size:12px;font-weight:600;';p.textContent=t.noAbsLogs;body.appendChild(p);}
  document.getElementById('custom-report-modal-backdrop').classList.add('show');
}

function handleFeedbackSubmissionEngine(event){
  event.preventDefault();
  var t=uiTranslations[activeLanguageGlobal];
  var inp=document.getElementById('feedback-message');
  var btn=document.getElementById('btn-feedback-submit');
  var box=document.getElementById('feedback-status-box');
  if(!inp.value.trim()) return;
  btn.disabled=true; btn.textContent=t.feedbackSending;
  setTimeout(function(){
    inp.value=''; btn.disabled=false; btn.textContent=t.feedbackBtn;
    box.innerHTML=t.feedbackDone; box.className='message success';
    setTimeout(function(){box.style.display='none';},4000);
  },1200);
}

async function handlePasswordChange(){
  var cur=document.getElementById('pin-current')?.value.trim();
  var nw=document.getElementById('pin-new')?.value.trim();
  var conf=document.getElementById('pin-confirm')?.value.trim();
  var msg=document.getElementById('pin-change-msg');
  if(!cur||!nw||!conf){msg.style.color='#dc2626';msg.textContent=activeLanguageGlobal==='de'?'Alle Felder ausfüllen.':'Fill in all fields.';return;}
  if(nw!==conf){msg.style.color='#dc2626';msg.textContent=activeLanguageGlobal==='de'?'Kennwörter stimmen nicht überein.':'Passwords do not match.';return;}
  if(nw.length<6){msg.style.color='#dc2626';msg.textContent=activeLanguageGlobal==='de'?'Mind. 6 Zeichen erforderlich.':'Minimum 6 characters required.';return;}
  try{
    var user=auth.currentUser;
    var cred=firebase.auth.EmailAuthProvider.credential(user.email,cur);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(nw);
    msg.style.color='#16a34a'; msg.textContent=activeLanguageGlobal==='de'?'✓ Kennwort geändert.':'✓ Password updated.';
    document.getElementById('pin-current').value=''; document.getElementById('pin-new').value=''; document.getElementById('pin-confirm').value='';
  }catch(err){
    msg.style.color='#dc2626';
    msg.textContent=(err.code==='auth/wrong-password'||err.code==='auth/invalid-credential')
      ?(activeLanguageGlobal==='de'?'Aktuelles Kennwort ist falsch.':'Current password is incorrect.')
      :(activeLanguageGlobal==='de'?'Fehler: '+err.message:'Error: '+err.message);
  }
}

function showProjectSuggestions(query){
  var list=document.getElementById('project-autocomplete-list'); if(!list) return;
  var q=query.trim().toLowerCase();
  if(!q){list.style.display='none';return;}
  var names=[...new Set(globalLoggedSessionsDatabaseMock.filter(function(r){return r.type==='work'&&r.project&&r.project.toLowerCase().includes(q);}).map(function(r){return r.project;}))].slice(0,8);
  if(!names.length){list.style.display='none';return;}
  list.innerHTML=names.map(function(n){return '<div class="autocomplete-item" onmousedown="pickProjectSuggestion(\''+n.replace(/'/g,"&#39;")+'\')" ><i class="fa-solid fa-building"></i>'+n+'</div>';}).join('');
  list.style.display='block';
}
function pickProjectSuggestion(name){var inp=document.getElementById('log-project-name');if(inp)inp.value=name;hideProjectSuggestions();saveDraftWorkEntry();}
function hideProjectSuggestions(){var list=document.getElementById('project-autocomplete-list');if(list)list.style.display='none';}

function showConfirmModal(message,onConfirm){
  var existing=document.getElementById('custom-confirm-backdrop'); if(existing) existing.remove();
  var backdrop=document.createElement('div');
  backdrop.id='custom-confirm-backdrop';
  backdrop.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(3,6,15,0.75);backdrop-filter:blur(12px) saturate(140%);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';
  backdrop.innerHTML='<div style="width:100%;max-width:360px;border-radius:20px;overflow:hidden;animation:modalEntrance 0.3s cubic-bezier(0.16,1,0.3,1);">'
    +'<div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 26px 22px;position:relative;border:1px solid rgba(251,191,36,0.2);border-bottom:none;">'
    +'<div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#E30613,#f59e0b,#E30613);"></div>'
    +'<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">'
    +'<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(251,191,36,0.2),rgba(251,191,36,0.05));border:1px solid rgba(251,191,36,0.3);display:flex;align-items:center;justify-content:center;">'
    +'<i class="fa-solid fa-shield-halved" style="color:#E30613;font-size:18px;"></i></div>'
    +'<div><div style="font-size:11px;font-weight:800;color:#E30613;letter-spacing:1.2px;text-transform:uppercase;">MEINE STUNDEN</div>'
    +'<div style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-0.3px;margin-top:1px;">'+(activeLanguageGlobal==='de'?'Sitzung beenden':'End Session')+'</div></div></div>'
    +'<div style="font-size:14px;color:#cbd5e1;line-height:1.6;">'+message+'</div></div>'
    +'<div style="background:rgba(2,6,15,0.9);padding:16px 20px;border:1px solid rgba(251,191,36,0.2);border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:10px;justify-content:flex-end;">'
    +'<button id="confirm-cancel" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#e2e8f0;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">'+(activeLanguageGlobal==='de'?'Abbrechen':'Cancel')+'</button>'
    +'<button id="confirm-ok" style="background:linear-gradient(135deg,#E30613 0%,#f59e0b 100%);border:none;color:#0f172a;padding:10px 22px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(251,191,36,0.3);">'+(activeLanguageGlobal==='de'?'Abmelden':'Sign Out')+'</button>'
    +'</div></div>';
  document.body.appendChild(backdrop);
  document.getElementById('confirm-cancel').onclick=function(){backdrop.remove();};
  document.getElementById('confirm-ok').onclick=function(){backdrop.remove(); if(onConfirm) onConfirm();};
  backdrop.onclick=function(e){if(e.target===backdrop) backdrop.remove();};
}
