function setShellVisibility(activeShellId) {
  ['landing-page', 'app-view', 'admin-full-view', 'login-view'].forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;

    const active = id === activeShellId;
    element.classList.toggle('app-shell-hidden', !active);
    element.style.display = active ? 'block' : 'none';
  });

  document.body.classList.toggle(
    'admin-mode',
    activeShellId === 'admin-full-view'
  );
}

function showLandingPage() {
  setShellVisibility('landing-page');
}

function showUserApplication(user) {
  setShellVisibility('app-view');

  const storedName =
    localStorage.getItem('schuermann_current_user') ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'User';

  const profileName = document.getElementById('dash-profile-username');
  const sidebarName = document.getElementById('user-profile-title');

  if (profileName) profileName.textContent = storedName;
  if (sidebarName) sidebarName.textContent = storedName;

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

function openLoginModal() {
  document.getElementById('modal-login-backdrop')?.classList.add('open');

  setTimeout(() => {
    document.getElementById('modal-username')?.focus();
  }, 50);
}

function closeLoginModal() {
  document.getElementById('modal-login-backdrop')?.classList.remove('open');
  setModalMessage('modal-login-msg', '', '');
}

function openRegisterModal() {
  document.getElementById('modal-register-backdrop')?.classList.add('open');
}

function closeRegisterModal() {
  document.getElementById('modal-register-backdrop')?.classList.remove('open');
}

function normalizeUserName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

function getUserEmail(name) {
  const normalizedName = normalizeUserName(name);
  if (!normalizedName) return null;
  return `${normalizedName}@sch.local`;
}

function setModalMessage(id, message, type) {
  const element = document.getElementById(id);
  if (!element) return;

  element.textContent = message;
  element.className = `modal-msg${type ? ` ${type}` : ''}`;
}

async function handleModalLogin(event) {
  event.preventDefault();

  const username =
    document.getElementById('modal-username')?.value.trim() || '';

  const password =
    document.getElementById('modal-passcode')?.value || '';

  const button = document.getElementById('modal-login-btn');

  if (!username || !password) {
    setModalMessage(
      'modal-login-msg',
      'Bitte Name und Kennwort eingeben.',
      'error'
    );
    return;
  }

  const isEmailFormat = username.includes('@');

  if (button) button.disabled = true;

  setModalMessage(
    'modal-login-msg',
    'Anmeldung wird geprüft ...',
    ''
  );

  try {
    let credential;

    if (isEmailFormat) {
      credential = await auth.signInWithEmailAndPassword(
        username,
        password
      );
    } else {
      const email = getUserEmail(username);

      if (!email) {
        const invalidEmailError = new Error('Invalid username');
        invalidEmailError.code = 'auth/invalid-email';
        throw invalidEmailError;
      }

      credential = await auth.signInWithEmailAndPassword(
        email,
        password
      );
    }

    const displayName =
      credential.user.displayName ||
      (isEmailFormat ? username.split('@')[0] : username);

    localStorage.setItem(
      'schuermann_auth_user',
      credential.user.uid
    );

    localStorage.setItem(
      'schuermann_current_user',
      displayName
    );

    authenticatedUserGlobal = credential.user.uid;
    authenticatedUserRoleGlobal = 'user';

    closeLoginModal();
    showUserApplication(credential.user);

    if (typeof loadUserDataFromCloud === 'function') {
      await loadUserDataFromCloud();
    }

    if (typeof renderHistoricalRecordsSheet === 'function') {
      renderHistoricalRecordsSheet();
    }

    if (typeof runGlobalApplicationMetricsEngine === 'function') {
      runGlobalApplicationMetricsEngine();
    }
  } catch (error) {
    console.error('Login failed:', error);

    localStorage.removeItem('schuermann_auth_user');

    let errorMessage =
      'Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.';

    if (error?.code === 'auth/invalid-email') {
      errorMessage =
        'Bitte einen gültigen Namen oder eine gültige E-Mail-Adresse eingeben.';
    } else if (
      error?.code === 'auth/user-not-found' ||
      error?.code === 'auth/wrong-password' ||
      error?.code === 'auth/invalid-credential'
    ) {
      errorMessage = 'Name nicht gefunden oder Kennwort falsch.';
    } else if (error?.code === 'auth/too-many-requests') {
      errorMessage =
        'Zu viele Anmeldeversuche. Bitte später erneut versuchen.';
    } else if (error?.code === 'auth/network-request-failed') {
      errorMessage =
        'Keine Verbindung zu Firebase. Bitte Internetverbindung prüfen.';
    }

    setModalMessage(
      'modal-login-msg',
      errorMessage,
      'error'
    );
  } finally {
    if (button) button.disabled = false;
  }
}

function regGoToStep2() {
  const name =
    document.getElementById('reg-name')?.value.trim() || '';

  const company =
    document.getElementById('reg-company')?.value.trim() || '';

  const password =
    document.getElementById('reg-password')?.value || '';

  const confirmation =
    document.getElementById('reg-password2')?.value || '';

  if (!name || !company || !password || !confirmation) {
    setModalMessage(
      'reg-step1-msg',
      'Bitte alle Felder ausfüllen.',
      'error'
    );
    return;
  }

  const normalizedName = normalizeUserName(name);

  if (!normalizedName) {
    setModalMessage(
      'reg-step1-msg',
      'Bitte einen gültigen Namen eingeben.',
      'error'
    );
    return;
  }

  if (password.length < 6) {
    setModalMessage(
      'reg-step1-msg',
      'Das Kennwort muss mindestens 6 Zeichen haben.',
      'error'
    );
    return;
  }

  if (password !== confirmation) {
    setModalMessage(
      'reg-step1-msg',
      'Die Kennwörter stimmen nicht überein.',
      'error'
    );
    return;
  }

  setModalMessage('reg-step1-msg', '', '');

  document.getElementById('reg-tab-1')?.classList.remove('active');
  document.getElementById('reg-tab-2')?.classList.add('active');
  document.getElementById('reg-panel-1')?.classList.remove('active');
  document.getElementById('reg-panel-2')?.classList.add('active');
}

function regGoToStep1() {
  document.getElementById('reg-tab-1')?.classList.add('active');
  document.getElementById('reg-tab-2')?.classList.remove('active');
  document.getElementById('reg-panel-1')?.classList.add('active');
  document.getElementById('reg-panel-2')?.classList.remove('active');
}

async function handleRegisterAndPay() {
  const name =
    document.getElementById('reg-name')?.value.trim() || '';

  const company =
    document.getElementById('reg-company')?.value.trim() || '';

  const password =
    document.getElementById('reg-password')?.value || '';

  const confirmation =
    document.getElementById('reg-password2')?.value || '';

  const button = document.getElementById('reg-pay-btn');

  if (!name || !company || password.length < 6) {
    regGoToStep1();

    setModalMessage(
      'reg-step1-msg',
      'Bitte gültige Kontodaten eingeben.',
      'error'
    );
    return;
  }

  const normalizedName = normalizeUserName(name);

  if (!normalizedName) {
    regGoToStep1();

    setModalMessage(
      'reg-step1-msg',
      'Bitte einen gültigen Namen eingeben.',
      'error'
    );
    return;
  }

  if (password !== confirmation) {
    regGoToStep1();

    setModalMessage(
      'reg-step1-msg',
      'Die Kennwörter stimmen nicht überein.',
      'error'
    );
    return;
  }

  if (button) button.disabled = true;

  setModalMessage(
    'reg-step2-msg',
    'Konto wird erstellt ...',
    ''
  );

  try {
    const email = getUserEmail(name);

    if (!email) {
      throw new Error('invalid-name');
    }

    const credential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );

    await credential.user.updateProfile({
      displayName: name
    });

    await db
      .collection('userProfiles')
      .doc(credential.user.uid)
      .set({
        uid: credential.user.uid,
        name,
        email,
        companyName: company,
        vacationAllowed: 30,
        workSessions: [],
        leaveDays: [],
        trash: [],
        createdAt:
          firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:
          firebase.firestore.FieldValue.serverTimestamp()
      }, {
        merge: true
      });

    localStorage.setItem(
      'schuermann_auth_user',
      credential.user.uid
    );

    localStorage.setItem(
      'schuermann_current_user',
      name
    );

    localStorage.setItem(
      'schuermann_company_name',
      company
    );

    authenticatedUserGlobal = credential.user.uid;
    authenticatedUserRoleGlobal = 'user';

    setModalMessage(
      'reg-step2-msg',
      'Konto erfolgreich erstellt.',
      'success'
    );

    closeRegisterModal();
    showUserApplication(credential.user);
  } catch (error) {
    console.error('Registration failed:', error);

    let errorMessage = 'Das Konto konnte nicht erstellt werden.';

    if (error?.code === 'auth/email-already-in-use') {
      errorMessage =
        'Für diesen Namen besteht bereits ein Konto. Bitte anmelden.';
    } else if (error?.code === 'auth/weak-password') {
      errorMessage =
        'Das Kennwort ist zu schwach. Bitte mindestens 6 Zeichen verwenden.';
    } else if (error?.code === 'auth/network-request-failed') {
      errorMessage =
        'Keine Verbindung zu Firebase. Bitte Internetverbindung prüfen.';
    } else if (error?.code === 'auth/invalid-email') {
      errorMessage = 'Der eingegebene Name ist ungültig.';
    }

    setModalMessage(
      'reg-step2-msg',
      errorMessage,
      'error'
    );
  } finally {
    if (button) button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  showLandingPage();

  if (typeof auth === 'undefined') {
    console.error('Firebase Auth is not available.');
    localStorage.removeItem('schuermann_auth_user');
    return;
  }

  auth.onAuthStateChanged(user => {
    if (!user) {
      authenticatedUserGlobal = '';
      authenticatedUserRoleGlobal = 'user';
      localStorage.removeItem('schuermann_auth_user');
      showLandingPage();
      return;
    }

    authenticatedUserGlobal = user.uid;

    localStorage.setItem(
      'schuermann_auth_user',
      user.uid
    );

    showUserApplication(user);
  });
});