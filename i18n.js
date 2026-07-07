const uiTranslations = {
  en: {
    loginSub:'Staff Portal | Time Tracking', loginUser:'Username', loginUserPlh:'Enter Full Name',
    loginPass:'Passcode', loginPassPlh:'••••••', loginSubmit:'Log In',
    navDash:'Dashboard', navLog:'Log Daily Shifts', navVac:'Vacation & Leave Management',
    navHist:'History Log Sheets', navSet:'Settings', navLogout:'Sign Out',
    dashWelcome:'Welcome back,', dashTitle:'Dashboard Overview',
    cardGross:'Total Net Work', cardOvertime:'Calculated Overtime',
    logTitle:'Log Daily Shifts', formDate:'Select Booking Date',
    formProject:'Construction Site / Client', formProjectPlh:'Enter site name or customer assignment',
    formStart:'Start (Punch In)', formEnd:'End (Punch Out)',
    formBreak:'Break Deductions', formNotes:'Activity Report (Optional)',
    formNotesPlh:'Private specific details...', formSave:'Save Record',
    vacTitle:'Vacation & Absence Management',
    vacToggleV:'Vacation', vacToggleS:'Sick Leave Registry',
    vacDateFrom:'From', vacDateTo:'To',
    vacContextV:'Reason / Context', vacContextS:'Medical Certificate / Clinical Symptoms',
    vacPlhV:'Vacation / Paid Time Off', vacPlhS:'Sick Leave Day',
    vacSubmitV:'Log Vacation', vacSubmitS:'Register Sick Leave',
    leaveStatementBtn:'View Leave Balance Statement',
    histTitle:'Timesheet History', histExport:'Export PDF',
    pdfMeta:'Timesheet Record Sheet - Issued for:',
    pdfSub:'Generated via Automated Core Metrics Engine',
    setTitle:'System Settings', setAllowed:'Allowed Vacation Days (Annual)',
    setConstraint:'Daily Shift Target (Hours)', setThreshold:'Auto Break Threshold (Hours)',
    setDisclaimer:'Altering operational constants is restricted to administrative roles.',
    setAdmin:'Administrative Controls',
    setTrashBtn:'Open Trash Bin (Recent Deletions)',
    trashTitle:'Recently Deleted Items',
    trashDisclaimer:'Items are cached temporarily and purged after a strict 12-hour limit.',
    feedbackTitle:'Provide System Feedback',
    feedbackDesc:'Message directly to IT Development Team',
    feedbackPlh:'Share recommendations, bugs, or feature requests...',
    feedbackNote:"<i class='fa-solid fa-circle-info' style='margin-right:4px;color:#94a3b8;'></i> Your feedback will be sent securely to the developer.",
    feedbackBtn:'Send Feedback',
    feedbackSending:'Sending feedback...', feedbackDone:"<i class='fa-solid fa-circle-check'></i> Feedback sent!",
    modalAck:'Acknowledge', modalOtTitle:'Overtime Statement', modalWorkTitle:'Net Work Time Statement',
    modalLeaveTitle:'Leave & Absence Statement',
    noOtMsg:'No overtime hours in this period.', noWorkMsg:'No work hours logged.',
    emptyHist:'No work records logged.', emptyLeave:'No leave entries registered.',
    emptyTrash:'Trash bin is empty.',
    lblVacToken:'VACATION', lblSickToken:'SICK LEAVE',
    lblDay:'Day', lblBreak:'Break', lblDays:'days',
    lblYearlyAllow:'Yearly Entitlement:', lblVacConsumed:'Vacation Taken:',
    lblNetVac:'Remaining Balance:', lblTotalSick:'Total Sick Days:',
    noAbsLogs:'No absence logs found.', comingSoon:'(Coming soon)'
  },
  de: {
    loginSub:'Mitarbeiter-Portal | Zeiterfassung', loginUser:'Mitarbeitername', loginUserPlh:'Name eingeben',
    loginPass:'Kennwort / PIN', loginPassPlh:'••••••', loginSubmit:'Anmelden',
    navDash:'Übersicht', navLog:'Arbeitszeit buchen', navVac:'Urlaubs- & Fehlzeitenmanagement',
    navHist:'Stundenzettel-Archiv', navSet:'Konfigurationen', navLogout:'Abmelden',
    dashWelcome:'Willkommen zurück,', dashTitle:'Betriebliche Kennzahlen',
    cardGross:'Netto-Arbeitszeit', cardOvertime:'Überstunden',
    logTitle:'Arbeitszeit erfassen', formDate:'Buchungstag auswählen',
    formProject:'Baustelle/Kunde', formProjectPlh:'Baustelle oder Kundenname eintragen',
    formStart:'Arbeitsbeginn (Uhrzeit)', formEnd:'Arbeitsende (Uhrzeit)',
    formBreak:'Pausenregelung (Abzug)', formNotes:'Tätigkeitsbericht / Bemerkungen (Optional)',
    formNotesPlh:'Erbrachte Leistungen beschreiben...', formSave:'Buchung abschließen',
    vacTitle:'Urlaubs- & Fehlzeitenmanagement',
    vacToggleV:'Erholungsurlaub', vacToggleS:'Arbeitsunfähigkeit (AU)',
    vacDateFrom:'Von', vacDateTo:'Bis',
    vacContextV:'Art der Freistellung / Urlaubsgrund', vacContextS:'Ärztliches Attest / Diagnose',
    vacPlhV:'Erholungsurlaub gesetzlich/vertraglich', vacPlhS:'Krankmeldung mit/ohne Entgeltfortzahlung',
    vacSubmitV:'Urlaubszeit einbuchen', vacSubmitS:'Arbeitsunfähigkeit registrieren',
    leaveStatementBtn:'Kontoauszug Resturlaub & AU einsehen',
    histTitle:'Stundenzettel-Archiv', histExport:'PDF exportieren',
    pdfMeta:'Stundenzettel-Nachweis – Ausgestellt für:',
    pdfSub:'Erstellt am',
    setTitle:'Einstellungen', setAllowed:'Urlaubsanspruch Tage (Jahr)',
    setConstraint:'Soll-Arbeitszeit (Std)', setThreshold:'Pausenregel Schwellenwert (Std)',
    setDisclaimer:'Systemparameter können nur von autorisierten Nutzern geändert werden.',
    setAdmin:'Administration',
    setTrashBtn:'Papierkorb öffnen',
    trashTitle:'Papierkorb',
    trashDisclaimer:'Gelöschte Einträge werden nach 12 Stunden endgültig entfernt.',
    feedbackTitle:'Feedback senden',
    feedbackDesc:'Nachricht an den Entwickler',
    feedbackPlh:'Vorschläge, Fehler oder Änderungswünsche...',
    feedbackNote:"<i class='fa-solid fa-circle-info' style='margin-right:4px;color:#94a3b8;'></i> Ihre Nachricht wird direkt an den Entwickler weitergeleitet.",
    feedbackBtn:'Feedback senden',
    feedbackSending:'Wird gesendet...', feedbackDone:"<i class='fa-solid fa-circle-check'></i> Feedback gesendet.",
    modalAck:'Bestätigen', modalOtTitle:'Überstunden', modalWorkTitle:'Netto-Arbeitszeit',
    modalLeaveTitle:'Urlaub & Fehlzeiten',
    noOtMsg:'Keine Überstunden im aktuellen Zeitraum.', noWorkMsg:'Keine Arbeitsstunden erfasst.',
    emptyHist:'Keine Einträge vorhanden.', emptyLeave:'Keine Urlaubs- oder Krankheitsdaten.',
    emptyTrash:'Papierkorb ist leer.',
    lblVacToken:'URLAUB', lblSickToken:'KRANKMELDUNG',
    lblDay:'Tag', lblBreak:'Pause', lblDays:'Tage',
    lblYearlyAllow:'Jahresanspruch:', lblVacConsumed:'Genommene Tage:',
    lblNetVac:'Resturlaub:', lblTotalSick:'Kranktage gesamt:',
    noAbsLogs:'Keine Fehlzeiten eingetragen.', comingSoon:'(Bald verfügbar)'
  }
};

function setApplicationLanguage(langKey) {
  activeLanguageGlobal = langKey;
  document.getElementById('lang-btn-en').classList.toggle('active', langKey === 'en');
  document.getElementById('lang-btn-de').classList.toggle('active', langKey === 'de');
  const t = uiTranslations[langKey];

  safeSet('lbl-login-sub', t.loginSub); safeSet('lbl-login-user', t.loginUser);
  safeAttr('username', 'placeholder', t.loginUserPlh); safeSet('lbl-login-pass', t.loginPass);
  safeAttr('passcode', 'placeholder', t.loginPassPlh); safeSet('btn-login-submit', t.loginSubmit);

  safeSet('nav-lbl-dash', t.navDash); safeSet('nav-lbl-log', t.navLog);
  safeSet('nav-lbl-vac', t.navVac); safeSet('nav-lbl-hist', t.navHist);
  safeSet('nav-lbl-set', t.navSet); safeSet('nav-lbl-logout', t.navLogout);
  safeSet('nav-lbl-soon', t.comingSoon);

  safeSet('lbl-dash-welcome', t.dashWelcome); safeSet('lbl-dash-title', t.dashTitle);
  safeSet('lbl-card-gross', t.cardGross); safeSet('lbl-card-overtime', t.cardOvertime);

  safeSet('lbl-log-title', t.logTitle); safeSet('lbl-form-date', t.formDate);
  safeSet('lbl-form-project', t.formProject); safeAttr('log-project-name', 'placeholder', t.formProjectPlh);
  safeSet('lbl-form-start', t.formStart); safeSet('lbl-form-end', t.formEnd);
  safeSet('lbl-form-break', t.formBreak); safeSet('lbl-form-notes', t.formNotes);
  safeAttr('log-notes', 'placeholder', t.formNotesPlh); safeSet('btn-form-save', t.formSave);
  const pills = document.querySelectorAll('.break-pill');
  if (pills[0]) pills[0].textContent = (langKey === 'de') ? 'Keine' : 'None';

  safeSet('lbl-vac-title', t.vacTitle); safeSet('toggle-leave-vacation', t.vacToggleV);
  safeSet('toggle-leave-sick', t.vacToggleS); safeSet('lbl-vac-from-date', t.vacDateFrom);
  safeSet('lbl-vac-to-date', t.vacDateTo);
  const stmtBtn = document.getElementById('btn-leave-statement');
  if (stmtBtn) stmtBtn.innerHTML = `<i class="fa-solid fa-file-invoice" style="margin-right:8px;"></i>${t.leaveStatementBtn}`;

  safeSet('lbl-hist-title', t.histTitle);
  const histExportBtn = document.getElementById('btn-hist-export');
  if (histExportBtn) histExportBtn.innerHTML = `<i class="fa-solid fa-file-pdf" style="margin-right:6px;"></i>${t.histExport}`;
  safeSet('pdf-lbl-sub', t.pdfSub);
  const pdfMeta = document.getElementById('pdf-user-metadata');
  if (pdfMeta) pdfMeta.textContent = `${t.pdfMeta} ${localStorage.getItem('schuermann_current_user') || authenticatedUserGlobal}`;

  safeSet('lbl-set-title', t.setTitle); safeSet('lbl-set-allowed', t.setAllowed);
  safeSet('lbl-set-disclaimer', t.setDisclaimer); safeSet('lbl-set-admin', t.setAdmin);
  safeSet('btn-set-trash', t.setTrashBtn); safeSet('lbl-trash-title', t.trashTitle);
  safeSet('lbl-trash-disclaimer', t.trashDisclaimer); safeSet('lbl-feedback-title', t.feedbackTitle);
  safeSet('lbl-feedback-input-desc', t.feedbackDesc);
  safeAttr('feedback-message', 'placeholder', t.feedbackPlh);
  const feedNote = document.getElementById('lbl-feedback-routing-note');
  if (feedNote) feedNote.innerHTML = t.feedbackNote;
  const feedBtn = document.getElementById('btn-feedback-submit');
  if (feedBtn && !feedBtn.disabled) feedBtn.textContent = t.feedbackBtn;
  safeSet('btn-modal-close', t.modalAck);

  setLeaveManagementType(activeLeaveSubManagementType);
  renderHistoricalRecordsSheet();
  renderVacationRecordsSheet();
  renderRecentlyDeletedBinSheet();
}

function safeSet(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function safeAttr(id, attr, val) { const el = document.getElementById(id); if (el) el[attr] = val; }