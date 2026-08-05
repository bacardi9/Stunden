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

// ── TRIAL REGISTRATION ────────────────────────────────────────────

let _trialEmail = '';

async function startTrialRegistration() {
  const name = document.getElementById('reg-name')?.value.trim() || '';
  const company = document.getElementById('reg-company')?.value.trim() || '';
  const email = document.getElementById('reg-email')?.value.trim() || '';
  const password = document.getElementById('reg-password')?.value || '';
  const confirmation = document.getElementById('reg-password2')?.value || '';

  if (!name || !company || !email || !password || !confirmation) {
    setModalMessage('reg-step1-msg', 'Bitte alle Felder ausfüllen.', 'error');
    return;
  }

  if (!email.includes('@') || !email.includes('.')) {
    setModalMessage('reg-step1-msg', 'Bitte eine gültige E-Mail-Adresse eingeben.', 'error');
    return;
  }

  if (password.length < 6) {
    setModalMessage('reg-step1-msg', 'Das Kennwort muss mindestens 6 Zeichen haben.', 'error');
    return;
  }

  if (password !== confirmation) {
    setModalMessage('reg-step1-msg', 'Die Kennwörter stimmen nicht überein.', 'error');
    return;
  }

  setModalMessage('reg-step1-msg', '', '');
  _trialEmail = email;

  const functions = typeof firebase?.app === 'function' ? firebase.app().functions('europe-west3') : null;

  if (!functions) {
    setModalMessage('reg-step1-msg', 'Firebase Functions ist nicht verfügbar.', 'error');
    return;
  }

  const sendOtp = functions.httpsCallable('sendRegistrationOtp');

  setModalMessage('reg-step1-msg', 'Code wird gesendet ...', '');

  try {
    await sendOtp({ email });
  } catch (error) {
    console.error('sendRegistrationOtp failed:', error);
    setModalMessage('reg-step1-msg', error?.details?.message || 'Code konnte nicht gesendet werden.', 'error');
    return;
  }

  setModalMessage('reg-step1-msg', '', '');

  // Show step 2 (OTP panel)
  document.getElementById('reg-tab-1')?.classList.remove('active');
  document.getElementById('reg-tab-2')?.classList.add('active');
  document.getElementById('reg-panel-1')?.classList.remove('active');
  document.getElementById('reg-panel-2')?.classList.remove('active');
  const panel3 = document.getElementById('reg-panel-3');
  if (panel3) { panel3.classList.add('active'); panel3.style.display = 'block'; }

  const emailDisplay = document.getElementById('reg-otp-email-display');
  if (emailDisplay) emailDisplay.textContent = email;

  const otpInput = document.getElementById('reg-otp-input');
  if (otpInput) { otpInput.value = ''; setTimeout(() => otpInput.focus(), 200); }

  document.getElementById('reg-otp-msg') && (document.getElementById('reg-otp-msg').textContent = '');
  document.getElementById('reg-otp-msg') && (document.getElementById('reg-otp-msg').className = 'modal-msg');
}

async function verifyOtpAndCreateTrialAccount() {
  const otp = document.getElementById('reg-otp-input')?.value.trim() || '';
  const name = document.getElementById('reg-name')?.value.trim() || '';
  const company = document.getElementById('reg-company')?.value.trim() || '';
  const password = document.getElementById('reg-password')?.value || '';
  const button = document.getElementById('reg-otp-verify-btn');

  if (!otp || otp.length !== 6) {
    const msgEl = document.getElementById('reg-otp-msg');
    if (msgEl) { msgEl.textContent = 'Bitte den 6-stelligen Code eingeben.'; msgEl.className = 'modal-msg error'; }
    return;
  }

  if (button) button.disabled = true;

  const msgEl = document.getElementById('reg-otp-msg');
  if (msgEl) { msgEl.textContent = 'Konto wird erstellt ...'; msgEl.className = 'modal-msg'; }

  const functions = typeof firebase?.app === 'function' ? firebase.app().functions('europe-west3') : null;

  if (!functions) {
    if (msgEl) { msgEl.textContent = 'Firebase Functions ist nicht verfügbar.'; msgEl.className = 'modal-msg error'; }
    if (button) button.disabled = false;
    return;
  }

  const verifyOtp = functions.httpsCallable('verifyOtpAndCreateAccount');

  try {
    const result = await verifyOtp({ email: _trialEmail, otp, name, company, password });

    if (msgEl) { msgEl.textContent = 'Konto erstellt! Anmeldung ...'; msgEl.className = 'modal-msg success'; }

    // Sign in with the new account
    const credential = await auth.signInWithEmailAndPassword(_trialEmail, password);

    localStorage.setItem('schuermann_auth_user', credential.user.uid);
    localStorage.setItem('schuermann_current_user', name);
    localStorage.setItem('schuermann_company_name', company);

    authenticatedUserGlobal = credential.user.uid;
    authenticatedUserRoleGlobal = 'user';

    closeRegisterModal();
    showUserApplication(credential.user);

    // Show trial welcome toast
    const trialEnd = result?.data?.trialEndsAt ? new Date(result.data.trialEndsAt) : null;
    if (trialEnd && typeof showToast === 'function') {
      const daysLeft = Math.ceil((trialEnd - Date.now()) / (24 * 60 * 60 * 1000));
      showToast(`🎁 Willkommen! Deine ${daysLeft}-tägige Testphase läuft bis ${trialEnd.toLocaleDateString('de-DE')}.`, 'success');
    }

    if (typeof loadUserDataFromCloud === 'function') {
      await loadUserDataFromCloud();
    }
  } catch (error) {
    console.error('verifyOtpAndCreateAccount failed:', error);
    if (msgEl) {
      msgEl.textContent = error?.details?.message || 'Konto konnte nicht erstellt werden.';
      msgEl.className = 'modal-msg error';
    }
  } finally {
    if (button) button.disabled = false;
  }
}

function regGoToStep1FromTrial() {
  document.getElementById('reg-tab-1')?.classList.add('active');
  document.getElementById('reg-tab-2')?.classList.remove('active');
  document.getElementById('reg-panel-1')?.classList.add('active');
  document.getElementById('reg-panel-2')?.classList.remove('active');
  const panel3 = document.getElementById('reg-panel-3');
  if (panel3) { panel3.classList.remove('active'); panel3.style.display = 'none'; }
}

// ── TRIAL BANNER & MANAGEMENT ─────────────────────────────────────

async function updateTrialBanner() {
  if (!auth.currentUser) return;

  try {
    const profileSnap = await db.collection('userProfiles').doc(auth.currentUser.uid).get();
    if (!profileSnap.exists) return;

    const profile = profileSnap.data() || {};
    const trialBanner = document.getElementById('trial-banner');
    const trialExpired = document.getElementById('trial-expired-banner');
    const trialText = document.getElementById('trial-banner-text');
    const expiredText = document.getElementById('trial-expired-text');

    if (!trialBanner || !trialExpired) return;

    // Hide both by default
    trialBanner.style.display = 'none';
    trialExpired.style.display = 'none';

    // If subscription is active, no trial banner
    if (profile.subscriptionActive) return;

    // No trial data
    if (!profile.trialActive || !profile.trialEndsAt) return;

    const trialEnd = profile.trialEndsAt.toDate ? profile.trialEndsAt.toDate() : new Date(profile.trialEndsAt);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));

    if (daysLeft <= 0) {
      // Trial expired
      trialExpired.style.display = 'block';
      if (expiredText) expiredText.textContent = `Deine Testphase ist am ${trialEnd.toLocaleDateString('de-DE')} abgelaufen.`;
    } else {
      // Trial active
      trialBanner.style.display = 'block';
      if (trialText) {
        if (daysLeft === 1) {
          trialText.textContent = '🎁 Testphase: Letzter Tag — morgen endet dein kostenloser Zugang';
        } else {
          trialText.textContent = `🎁 Testphase: Noch ${daysLeft} Tage kostenlos`;
        }
      }
    }
  } catch (error) {
    console.warn('Trial banner update failed:', error);
  }
}

async function startSubscriptionFromTrial() {
  if (!auth.currentUser) {
    openLoginModal();
    return;
  }

  try {
    const checkoutUrl = await startSubscriptionCheckout();
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      if (typeof showToast === 'function') {
        showToast('Zahlung konnte nicht gestartet werden. Bitte später erneut versuchen.', 'error');
      }
    }
  } catch (error) {
    console.error('startSubscriptionFromTrial failed:', error);
    if (typeof showToast === 'function') {
      showToast('Zahlung konnte nicht gestartet werden.', 'error');
    }
  }
}

// ── AUTH STATE CHANGE ─────────────────────────────────────────────

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

let regMode = 'subscribe'; // 'subscribe' | 'trial'

function openRegisterModal(mode = 'subscribe') {
  document.getElementById('modal-register-backdrop')?.classList.add('open');
  resetRegModal(mode);
}

function resetRegModal(mode = 'subscribe') {
  setRegMode(mode);
  regGoToStep1();
  document.getElementById('reg-otp-msg') && (document.getElementById('reg-otp-msg').textContent = '');
  document.getElementById('reg-otp-msg') && (document.getElementById('reg-otp-msg').className = 'modal-msg');
}

function setRegMode(mode) {
  regMode = mode;
  const subBtn = document.getElementById('reg-mode-sub');
  const trialBtn = document.getElementById('reg-mode-trial');
  const emailGroup = document.getElementById('reg-email-group');
  const nextSub = document.getElementById('reg-next-btn-sub');
  const nextTrial = document.getElementById('reg-next-btn-trial');
  const tab1Label = document.getElementById('reg-tab-1-label');
  const tab2Label = document.getElementById('reg-tab-2-label');

  if (mode === 'trial') {
    if (subBtn) { subBtn.classList.remove('active'); subBtn.style.background = 'transparent'; subBtn.style.color = '#64748b'; subBtn.style.boxShadow = 'none'; }
    if (trialBtn) { trialBtn.classList.add('active'); trialBtn.style.background = '#fff'; trialBtn.style.color = '#0f172a'; trialBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }
    if (emailGroup) emailGroup.style.display = 'block';
    if (nextSub) nextSub.style.display = 'none';
    if (nextTrial) nextTrial.style.display = 'block';
    if (tab1Label) tab1Label.textContent = '1. Konto';
    if (tab2Label) tab2Label.textContent = '2. Code bestätigen';
  } else {
    if (subBtn) { subBtn.classList.add('active'); subBtn.style.background = '#fff'; subBtn.style.color = '#0f172a'; subBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }
    if (trialBtn) { trialBtn.classList.remove('active'); trialBtn.style.background = 'transparent'; trialBtn.style.color = '#64748b'; trialBtn.style.boxShadow = 'none'; }
    if (emailGroup) emailGroup.style.display = 'none';
    if (nextSub) nextSub.style.display = 'block';
    if (nextTrial) nextTrial.style.display = 'none';
    if (tab1Label) tab1Label.textContent = '1. Konto';
    if (tab2Label) tab2Label.textContent = '2. Bezahlen & Aktivieren';
  }
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

async function startSubscriptionCheckout() {
  const functions =
    typeof firebase?.app === 'function'
      ? firebase.app().functions('europe-west3')
      : null;

  if (!functions) {
    throw new Error('Firebase Functions ist nicht verfügbar.');
  }

  const createSubscriptionCheckout =
    functions.httpsCallable('createSubscriptionCheckout');

  const result = await createSubscriptionCheckout({});

  return result?.data?.checkoutUrl || null;
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
      'Konto erstellt — Weiterleitung zur Zahlung ...',
      ''
    );

    let checkoutUrl = null;

    try {
      checkoutUrl = await startSubscriptionCheckout();
    } catch (checkoutError) {
      console.error('Checkout failed:', checkoutError);

      setModalMessage(
        'reg-step2-msg',
        'Konto erstellt, aber die Zahlung konnte nicht gestartet werden. Bitte später erneut versuchen.',
        'error'
      );

      closeRegisterModal();
      showUserApplication(credential.user);
      return;
    }

    if (checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }

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

function handleCheckoutReturnParams() {
  const params = new URLSearchParams(window.location.search);
  const checkoutState = params.get('checkout');

  if (!checkoutState) return;

  if (checkoutState === 'success') {
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast(
          'Zahlung erfolgreich — dein Abonnement ist aktiv.',
          'success'
        );
      }
    }, 600);
    return;
  }

  if (checkoutState === 'cancelled') {
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast(
          'Zahlung abgebrochen — du kannst jederzeit über dein Konto bezahlen.',
          'error'
        );
      }
    }, 600);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  showLandingPage();
  handleCheckoutReturnParams();

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
    updateTrialBanner();
  });
});