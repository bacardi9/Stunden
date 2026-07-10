// ══════════════════════════════════════════════════════════════════
//  LANDING PAGE — Modal controls, Login flow, Register flow
//  Loaded LAST so all app globals are available
// ══════════════════════════════════════════════════════════════════

// ── Modal helpers ──────────────────────────────────────────────────
function openLoginModal() {
  document.getElementById('modal-login-backdrop').classList.add('open');
  setTimeout(function() { var el = document.getElementById('modal-username'); if (el) el.focus(); }, 100);
}
function closeLoginModal() {
  document.getElementById('modal-login-backdrop').classList.remove('open');
  var m = document.getElementById('modal-login-msg');
  if (m) { m.textContent = ''; m.className = 'modal-msg'; }
}
function openRegisterModal() {
  document.getElementById('modal-register-backdrop').classList.add('open');
  regGoToStep1();
  setTimeout(function() { var el = document.getElementById('reg-name'); if (el) el.focus(); }, 100);
}
function closeRegisterModal() {
  document.getElementById('modal-register-backdrop').classList.remove('open');
  var m1 = document.getElementById('reg-step1-msg'); if (m1) m1.textContent = '';
  var m2 = document.getElementById('reg-step2-msg'); if (m2) m2.textContent = '';
}

// ── Register step navigation ────────────────────────────────────────
function regGoToStep1() {
  document.getElementById('reg-panel-1').classList.add('active');
  document.getElementById('reg-panel-2').classList.remove('active');
  document.getElementById('reg-tab-1').classList.add('active');
  document.getElementById('reg-tab-1').classList.remove('done');
  document.getElementById('reg-tab-2').classList.remove('active');
}
function regGoToStep2() {
  var name    = document.getElementById('reg-name').value.trim();
  var company = document.getElementById('reg-company').value.trim();
  var pw      = document.getElementById('reg-password').value;
  var pw2     = document.getElementById('reg-password2').value;
  var msg     = document.getElementById('reg-step1-msg');
  if (!name)         { showRegMsg(msg, 'Bitte vollständigen Namen eingeben.'); return; }
  if (!company)      { showRegMsg(msg, 'Bitte Firmen- / Betriebsnamen eingeben.'); return; }
  if (pw.length < 6) { showRegMsg(msg, 'Kennwort muss mind. 6 Zeichen haben.'); return; }
  if (pw !== pw2)    { showRegMsg(msg, 'Kennwörter stimmen nicht überein.'); return; }
  msg.textContent = ''; msg.className = 'modal-msg';
  document.getElementById('reg-panel-1').classList.remove('active');
  document.getElementById('reg-panel-2').classList.add('active');
  document.getElementById('reg-tab-1').classList.remove('active');
  document.getElementById('reg-tab-1').classList.add('done');
  document.getElementById('reg-tab-2').classList.add('active');
}
function showRegMsg(el, text) { el.textContent = text; el.className = 'modal-msg error'; }

// ── Register & Pay ───────────────────────────────────────────────────
async function handleRegisterAndPay() {
  var btn     = document.getElementById('reg-pay-btn');
  var msg     = document.getElementById('reg-step2-msg');
  var name    = document.getElementById('reg-name').value.trim();
  var company = document.getElementById('reg-company').value.trim();
  var pw      = document.getElementById('reg-password').value;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Konto wird erstellt…';
  msg.textContent = ''; msg.className = 'modal-msg';
  try {
    var loginKey = name.toLowerCase()
      .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
      .replace(/[^a-z0-9]/gi,'');
    if (!loginKey) throw new Error('Ungültiger Name');
    var email = loginKey + '@sch.local';
    var cred  = await auth.createUserWithEmailAndPassword(email, pw);
    var displayName = name.split(' ').map(function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
    await db.collection('userProfiles').doc(cred.user.uid).set({
      name: displayName, companyName: company, uid: cred.user.uid, isAdmin: false,
      vacationAllowed: 30,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin:  firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    authenticatedUserGlobal     = cred.user.uid;
    authenticatedUserRoleGlobal = 'user';
    localStorage.setItem('schuermann_auth_user',    cred.user.uid);
    localStorage.setItem('schuermann_auth_role',    'user');
    localStorage.setItem('schuermann_current_user', displayName);
    localStorage.setItem('schuermann_company_name', company);
    msg.textContent = '✓ Konto erstellt! Du wirst weitergeleitet…';
    msg.className = 'modal-msg success';
    setTimeout(function() {
      closeRegisterModal();
      _showApp();
    }, 1000);
  } catch(err) {
    console.error(err);
    var errMsg = 'Fehler beim Erstellen des Kontos.';
    if (err.code === 'auth/email-already-in-use') errMsg = 'Dieser Name ist bereits vergeben. Bitte melde dich an.';
    else if (err.code === 'auth/weak-password')   errMsg = 'Kennwort zu schwach – mind. 6 Zeichen.';
    msg.textContent = errMsg; msg.className = 'modal-msg error';
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-lock"></i> Jetzt kaufen & Konto aktivieren — 9,99 €';
  }
}

// ── Core: hide landing & launch app ─────────────────────────────────
// Single place that hides landing + calls launchSessionUI.
// All login paths call this instead of duplicating the logic.
function _showApp() {
  // 1. Hide landing
  var lp = document.getElementById('landing-page');
  if (lp) lp.style.display = 'none';

  // 2. Make sure all three shell views start hidden — launchSessionUI picks the right one
  var appView   = document.getElementById('app-view');
  var adminView = document.getElementById('admin-full-view');
  var loginView = document.getElementById('login-view');
  if (appView)   appView.style.display   = 'none';
  if (adminView) adminView.style.display = 'none';
  if (loginView) loginView.style.display = 'none';

  // 3. Launch — this sets the correct view to block
  launchSessionUI();
}

// ── Login via modal ──────────────────────────────────────────────────
async function handleModalLogin(e) {
  e.preventDefault();
  var rawName = document.getElementById('modal-username').value.trim().replace(/\s+/g, ' ');
  var code    = document.getElementById('modal-passcode').value.trim();
  var msg     = document.getElementById('modal-login-msg');
  var btn     = document.getElementById('modal-login-btn');

  msg.textContent = 'Verbindung wird hergestellt…';
  msg.className   = 'modal-msg success';
  btn.disabled    = true;
  btn.textContent = 'Anmelden…';

  try {
    var loginKey = rawName.toLowerCase()
      .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
      .replace(/[^a-z0-9]/gi,'');
    if (!loginKey) throw new Error('empty-name');

    var email = loginKey + '@sch.local';
    var cred  = await auth.signInWithEmailAndPassword(email, code);

    authenticatedUserGlobal = cred.user.uid;

    var displayName = rawName.split(' ').map(function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');

    var isAdminFlag = false, companyName = '';
    try {
      var snap = await db.collection('userProfiles').doc(cred.user.uid).get();
      if (snap.exists) {
        isAdminFlag = snap.data().isAdmin === true;
        companyName = snap.data().companyName || '';
      }
    } catch(e) {}

    authenticatedUserRoleGlobal = isAdminFlag ? 'admin' : 'user';
    localStorage.setItem('schuermann_auth_user',    cred.user.uid);
    localStorage.setItem('schuermann_auth_role',    authenticatedUserRoleGlobal);
    localStorage.setItem('schuermann_current_user', displayName);
    if (companyName) localStorage.setItem('schuermann_company_name', companyName);

    await db.collection('userProfiles').doc(cred.user.uid).set({
      name: displayName, uid: cred.user.uid,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    msg.textContent = 'Willkommen, ' + displayName + '!';
    msg.className   = 'modal-msg success';

    // Close modal first, THEN show the app after a short tick
    closeLoginModal();
    setTimeout(function() { _showApp(); }, 300);

  } catch(err) {
    console.error(err);
    msg.textContent = 'Mitarbeiter nicht gefunden oder falsches Kennwort.';
    msg.className   = 'modal-msg error';
    btn.disabled    = false;
    btn.innerHTML   = '<i class="fa-solid fa-right-to-bracket" style="margin-right:8px;"></i>Anmelden';
  }
}

// ── Hide landing, reveal app shell (kept for backwards-compat) ────────
function hideLandingShowApp() {
  var lp = document.getElementById('landing-page');
  if (lp) lp.style.display = 'none';
}

// ── Patch sign-out to return to landing ──────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

  var _origSignOut = window.handleSecureSignOutRequest;
  window.handleSecureSignOutRequest = function() {
    if (typeof toggleSidebarDrawer === 'function') toggleSidebarDrawer(false);
    if (typeof showConfirmModal === 'function') {
      showConfirmModal(
        (typeof activeLanguageGlobal !== 'undefined' && activeLanguageGlobal === 'de')
          ? 'Wirklich abmelden?' : 'Sign out?',
        function() {
          auth.signOut().catch(function(){});
          localStorage.removeItem('schuermann_auth_user');
          localStorage.removeItem('schuermann_auth_role');
          authenticatedUserGlobal      = '';
          authenticatedUserRoleGlobal  = 'user';
          globalLoggedSessionsDatabaseMock = [];
          vacationLoggedDaysArrayCache     = [];
          recentlyDeletedItemsBinCache     = [];
          adminAllEntriesCache             = [];
          var appView   = document.getElementById('app-view');
          var adminView = document.getElementById('admin-full-view');
          var loginView = document.getElementById('login-view');
          if (appView)   appView.style.display   = 'none';
          if (adminView) adminView.style.display  = 'none';
          if (loginView) loginView.style.display  = 'none';
          document.body.classList.remove('admin-mode');
          var lp = document.getElementById('landing-page');
          if (lp) lp.style.display = 'block';
        }
      );
    } else if (typeof _origSignOut === 'function') {
      _origSignOut.apply(this, arguments);
    }
  };

  var _origAdminSignOut = window.handleAdminSignOut;
  if (typeof _origAdminSignOut === 'function') {
    window.handleAdminSignOut = function() {
      if (typeof showConfirmModal === 'function') {
        showConfirmModal('Wirklich abmelden?', function() {
          auth.signOut().catch(function(){});
          localStorage.removeItem('schuermann_auth_user');
          localStorage.removeItem('schuermann_auth_role');
          authenticatedUserGlobal     = '';
          authenticatedUserRoleGlobal = 'user';
          var appView   = document.getElementById('app-view');
          var adminView = document.getElementById('admin-full-view');
          if (appView)   appView.style.display   = 'none';
          if (adminView) adminView.style.display  = 'none';
          document.body.classList.remove('admin-mode');
          var lp = document.getElementById('landing-page');
          if (lp) lp.style.display = 'block';
        });
      }
    };
  }
});

// ── ESC closes modals ─────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeLoginModal(); closeRegisterModal(); }
});
