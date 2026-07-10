document.write(`
<div id="app-view" style="display:none;">
  <header class="app-header">
    <button class="menu-trigger-btn" onclick="toggleSidebarDrawer(true)"><i class="fa-solid fa-bars"></i></button>
    <div style="display:flex;align-items:center;gap:4px;">
      <span class="offline-badge" id="offline-queue-badge">● Offline</span>
      <button class="dark-toggle-btn" id="dark-mode-btn" onclick="toggleDarkMode()" title="Dark/Light Mode">🌙</button>
      <div class="lang-selector-wrapper">
        <button type="button" id="lang-btn-en" class="lang-btn" onclick="setApplicationLanguage('en')">EN</button>
        <button type="button" id="lang-btn-de" class="lang-btn active" onclick="setApplicationLanguage('de')">DE</button>
      </div>
      <div id="live-clock-display" style="font-size:12px;font-weight:700;color:var(--text-muted);padding:0 8px;font-variant-numeric:tabular-nums;min-width:68px;text-align:center;"></div>
      <div style="text-align:right;cursor:pointer;">
        <img id="header-logo-img" class="header-logo-img" src="" alt="Logo">
        <div class="header-logo-text">
          <div style="font-weight:900;font-size:14px;letter-spacing:-0.4px;color:#0f172a;">MEINE STUNDEN</div>
          <div style="font-size:8px;font-weight:800;color:var(--primary-red);letter-spacing:0.8px;margin-top:-1px;">ONLINE</div>
        </div>
      </div>
    </div>
  </header>
  <div id="menu-backdrop" class="drawer-backdrop" onclick="toggleSidebarDrawer(false)"></div>
  <nav id="sidebar-drawer" class="sidebar-drawer">
    <div class="drawer-user-section">
      <h3 id="user-profile-title">User</h3>
      <p id="lbl-sidebar-subtext">Meine Stunden Online</p>
      <div id="last-login-info" style="margin-top:8px;"></div>
    </div>
    <ul class="drawer-nav-list">
      <li id="nav-dash-link" class="nav-item active" onclick="switchActiveView('dashboard', this)"><i class="fa-solid fa-chart-simple"></i><span id="nav-lbl-dash">Übersicht</span></li>
      <li class="nav-item" onclick="switchActiveView('log-work', this)"><i class="fa-solid fa-pen-to-square"></i><span id="nav-lbl-log">Arbeitszeit buchen</span></li>
      <li class="nav-item" onclick="switchActiveView('vacation', this)"><i class="fa-solid fa-umbrella-beach"></i><span id="nav-lbl-vac">Urlaubs- &amp; Fehlzeitenmanagement</span></li>
      <li class="nav-item" onclick="switchActiveView('history', this)"><i class="fa-solid fa-clock-rotate-left"></i><span id="nav-lbl-hist">Stundenzettel-Archiv</span></li>
      <li class="nav-item" onclick="switchActiveView('ai-scan', this)" style="background:linear-gradient(135deg,rgba(227,6,19,0.06),transparent);border-left:3px solid #E30613;border-radius:12px;">
        <i class="fa-solid fa-camera-retro" style="color:#E30613;"></i>
        <span style="font-weight:700;">KI-Scan</span>
        <span style="font-size:9px;background:#E30613;color:#fff;padding:2px 7px;border-radius:99px;margin-left:auto;font-weight:800;">NEU</span>
      </li>
      <li class="nav-item disabled"><i class="fa-solid fa-brain"></i><span>KI-Berichtsheft <span id="nav-lbl-soon" style="font-size:10px;color:var(--primary-red);">(Bald)</span></span></li>
      <li id="nav-admin-link" class="nav-item" onclick="switchActiveView('admin-panel', this)" style="display:none;border-left:4px solid #f59e0b;background:rgba(245,158,11,0.05);border-radius:12px;"><i class="fa-solid fa-shield-halved" style="color:#d97706;"></i><span style="font-weight:700;color:#d97706;">Admin</span></li>
      <li class="nav-item" onclick="switchActiveView('settings', this)"><i class="fa-solid fa-sliders"></i><span id="nav-lbl-set">Konfigurationen</span></li>
      <li class="nav-item" onclick="handleSecureSignOutRequest()" style="margin-top:20px;border-top:1px solid rgba(0,0,0,0.06);padding-top:14px;"><i class="fa-solid fa-right-from-bracket" style="color:var(--primary-red);"></i><span id="nav-lbl-logout" style="color:var(--primary-red);">Abmelden</span></li>
    </ul>
    <div style="border-top:1px solid rgba(0,0,0,0.06);padding:12px 0;text-align:center;"><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Version 2.1.0</div></div>
  </nav>
  <main id="main-content-layout">
    <div id="view-dashboard" class="content-panel active">
      <div class="panel-scroll-content">
        <div class="dash-centered-logo-wrapper">
          <div style="text-align:center;">
            <div style="font-weight:900;font-size:24px;letter-spacing:-0.5px;color:#1e293b;line-height:1;">MEINE STUNDEN</div>
            <div style="font-size:10px;font-weight:800;color:var(--primary-red);letter-spacing:1.2px;margin-top:2px;">ONLINE</div>
          </div>
          <span id="dash-backup-indicator" class="backup-status-dot online" title="Cloud Sync Aktiv"></span>
        </div>
        <div style="font-size:15px;font-weight:600;color:#64748b;text-align:center;margin-bottom:24px;">
          <span id="lbl-dash-welcome">Willkommen zurück,</span>
          <span id="dash-profile-username" style="color:var(--primary-blue);font-weight:800;">User</span>
        </div>
        <div id="period-progress-container"></div>
        <div class="view-title" id="lbl-dash-title">Betriebliche Kennzahlen</div>
        <div class="metrics-grid">
          <div class="metric-card" onclick="displayWorkTimeBreakdownSummary()"><label id="lbl-card-gross">Netto-Arbeitszeit</label><div id="dash-gross-hours" class="value">0.00 hrs</div></div>
          <div class="metric-card" onclick="displayOvertimeBreakdownSummary()"><label id="lbl-card-overtime">Überstunden</label><div id="dash-overtime-hours" class="value" style="color:#10b981;">+0.00 hrs</div></div>
        </div>
      </div>
    </div>
    <div id="view-log-work" class="content-panel">
      <div class="panel-scroll-content">
        <div class="view-title" id="lbl-log-title">Arbeitszeit erfassen</div>
        <div class="app-card">
          <form id="shift-submission-form" onsubmit="handleNewRecordSubmission(event)">
            <div class="form-group"><label id="lbl-form-date">Buchungstag auswählen</label><input type="date" id="log-date-picker" required></div>
            <div class="form-group"><label id="lbl-form-project">Baustelle/Kunde</label><div class="autocomplete-wrapper"><input type="text" id="log-project-name" placeholder="Baustelle oder Kundenname eintragen" autocomplete="off" required oninput="showProjectSuggestions(this.value)" onblur="setTimeout(()=>hideProjectSuggestions(),180)"><div class="autocomplete-list" id="project-autocomplete-list"></div></div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group"><label id="lbl-form-start">Arbeitsbeginn (Kommen)</label><select id="log-start-time"></select></div>
              <div class="form-group"><label id="lbl-form-end">Arbeitsende (Gehen)</label><select id="log-end-time"></select></div>
            </div>
            <div class="form-group"><label id="lbl-form-break">Pausenregelung (Abzug)</label><div class="break-options-row"><button type="button" class="break-pill active" onclick="selectBreakOption(0, this)">Keine</button><button type="button" class="break-pill" onclick="selectBreakOption(15, this)">15m</button><button type="button" class="break-pill" onclick="selectBreakOption(30, this)">30m</button><button type="button" class="break-pill" onclick="selectBreakOption(45, this)">45m</button><button type="button" class="break-pill" onclick="selectBreakOption(60, this)">1h</button></div></div>
            <div class="form-group"><label id="lbl-form-notes">Tätigkeitsbericht / Notizen (Optional)</label><textarea id="log-notes" rows="2" placeholder="Erbrachte Leistungen beschreiben..."></textarea></div>
            <button type="submit" id="btn-form-save" class="primary-btn">Buchung abschließen</button>
          </form>
        </div>
        <div class="app-card" style="margin-top:16px;border-left:4px solid var(--primary-blue);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div><h4 style="font-size:15px;font-weight:700;color:var(--text-main);margin:0;">Berufsschule</h4><p style="font-size:12px;color:var(--text-muted);margin:2px 0 0;">Für Auszubildende – Schultag ohne Arbeitszeit</p></div>
            <i class="fa-solid fa-graduation-cap" style="font-size:22px;color:var(--primary-blue);opacity:0.7;"></i>
          </div>
          <div class="form-group"><label>Schultag auswählen</label><input type="date" id="schule-date-picker" style="width:100%;"></div>
          <button type="button" class="primary-btn" style="background:var(--primary-blue);" onclick="handleSchuleSubmission()"><i class="fa-solid fa-plus" style="margin-right:6px;"></i>Schultag buchen</button>
        </div>
      </div>
    </div>
    <div id="view-vacation" class="content-panel">
      <div class="panel-scroll-content">
        <div class="view-title" id="lbl-vac-title">Urlaubs- &amp; Fehlzeitenmanagement</div>
        <div class="toggle-switch-row">
          <button type="button" id="toggle-leave-vacation" class="toggle-switch-btn active" onclick="setLeaveManagementType('vacation')">Erholungsurlaub</button>
          <button type="button" id="toggle-leave-sick" class="toggle-switch-btn" onclick="setLeaveManagementType('sick')">Arbeitsunfähigkeit (AU)</button>
        </div>
        <div class="app-card">
          <form id="vacation-entry-form" onsubmit="handleVacationDayLogSubmission(event)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group"><label id="lbl-vac-from-date">Von</label><input type="date" id="vacation-from-date-input" required></div>
              <div class="form-group"><label id="lbl-vac-to-date">Bis</label><input type="date" id="vacation-to-date-input" required></div>
            </div>
            <div class="form-group"><label id="leave-context-label">Art der Freistellung / Urlaubsgrund</label><input type="text" id="vacation-notes-input" placeholder="Erholungsurlaub gesetzlich/vertraglich" required></div>
            <button type="submit" id="leave-submit-btn" class="primary-btn" style="background:#3b82f6;margin-bottom:14px;">Urlaubszeit einbuchen</button>
          </form>
          <hr>
          <button type="button" id="btn-leave-statement" class="primary-btn" style="background:#475569;" onclick="displayLeaveStatementBalancesSummary()"><i class="fa-solid fa-file-invoice" style="margin-right:8px;"></i>Kontoauszug Resturlaub &amp; AU einsehen</button>
        </div>
        <div id="vacation-days-list-container" style="margin-top:12px;"></div>
      </div>
    </div>
    <div id="view-history" class="content-panel">
      <div class="panel-scroll-content">
        <div class="view-title">
          <span id="lbl-hist-title">Stundenzettel-Archiv</span>
          <div style="display:flex;gap:8px;">
            <button class="primary-btn" id="btn-hist-export-default" style="width:auto;padding:8px 14px;font-size:12px;background:#475569;" onclick="triggerPDFExportEngine(false)"><i class="fa-solid fa-calendar" style="margin-right:5px;"></i>20.–19.</button>
            <button class="primary-btn red-btn" id="btn-hist-export" style="width:auto;padding:8px 16px;font-size:13px;" onclick="triggerPDFExportEngine(true)"><i class="fa-solid fa-file-pdf" style="margin-right:6px;"></i>PDF</button>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin:8px 0 16px;padding:12px 14px;background:rgba(255,255,255,0.7);border-radius:12px;flex-wrap:wrap;border:1px solid rgba(0,0,0,0.05);backdrop-filter:blur(8px);">
          <label style="font-size:12px;font-weight:700;color:#475569;">Von:</label>
          <input type="date" id="export-start-date" style="padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;">
          <label style="font-size:12px;font-weight:700;color:#475569;">Bis:</label>
          <input type="date" id="export-end-date" style="padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;">
          <span style="font-size:11px;color:#94a3b8;margin-left:auto;font-weight:500;">Standard: 20. bis 20.</span>
        </div>
        <div id="quick-stats-strip"></div>
        <div id="period-progress-container-hist"></div>
        <div id="pdf-render-target">
          <div id="pdf-custom-header"><h2 style="font-weight:800;text-transform:uppercase;">MEINE STUNDEN ONLINE</h2><div id="pdf-user-metadata" class="pdf-meta-line">Stundenzettel-Nachweis</div><div class="pdf-meta-line" id="pdf-lbl-sub" style="font-size:10px;color:#666;">Erstellt am</div></div>
          <div id="history-items-container"></div>
        </div>
      </div>
    </div>
    <div id="view-ai-scan" class="content-panel">
      <div class="panel-scroll-content">
        <div class="view-title"><span><i class="fa-solid fa-camera-retro" style="color:#E30613;margin-right:8px;"></i>KI-Stundenzettel Scan</span></div>
        <div id="ai-step-upload">
          <div class="app-card" style="border-top:4px solid #E30613;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#E30613,#b8000f);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-wand-magic-sparkles" style="color:#fff;font-size:16px;"></i></div>
              <div><div style="font-size:14px;font-weight:700;color:var(--text-main);">Fotos aufnehmen oder hochladen</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Bis zu 10 Fotos – KI analysiert jeden Stundenzettel einzeln</div></div>
            </div>
            <div class="ai-scan-dropzone" id="ai-dropzone" onclick="triggerAiGallery()" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="handleAiDrop(event)">
              <div id="ai-thumbs-row" class="ai-thumbs-row" style="display:none;"></div>
              <div id="ai-thumb-counter" class="ai-thumb-counter" style="display:none;"></div>
              <img id="ai-preview-img" class="ai-scan-preview" src="" alt="Vorschau">
              <div id="ai-dropzone-placeholder">
                <i class="fa-solid fa-cloud-arrow-up" style="font-size:36px;color:#cbd5e1;display:block;margin-bottom:12px;"></i>
                <div style="font-size:14px;font-weight:700;color:var(--text-main);margin-bottom:6px;">Fotos hierher ziehen oder tippen</div>
                <div style="font-size:12px;color:var(--text-muted);">JPG, PNG, HEIC · max 10 MB pro Foto · bis zu 10 Fotos</div>
              </div>
            </div>
            <input type="file" id="ai-file-input" accept="image/*" multiple style="display:none;" onchange="handleAiFileSelect(event)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
              <button type="button" class="primary-btn" style="background:#1e293b;" onclick="triggerAiGallery()"><i class="fa-solid fa-images" style="margin-right:6px;"></i>Galerie</button>
              <button type="button" class="primary-btn" onclick="triggerAiCamera()"><i class="fa-solid fa-camera" style="margin-right:6px;"></i>Kamera</button>
            </div>
            <button type="button" id="btn-ai-analyze" class="primary-btn" style="margin-top:12px;display:none;" onclick="runAiAnalysis()"><i class="fa-solid fa-wand-magic-sparkles" style="margin-right:8px;"></i>KI-Analyse starten</button>
          </div>
          <div class="app-card" style="border-left:4px solid #f59e0b;" id="ai-api-key-card">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;"><i class="fa-solid fa-key" style="color:#f59e0b;font-size:16px;"></i><div style="font-size:13px;font-weight:700;color:var(--text-main);">Gemini API Key</div></div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Einmalig eingeben – wird nur lokal gespeichert. Kostenlos unter <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--primary-blue);font-weight:600;">aistudio.google.com</a></p>
            <div style="display:flex;gap:8px;"><input type="password" id="ai-api-key-input" placeholder="AIza..." style="flex:1;font-size:13px;" autocomplete="off"><button type="button" onclick="saveAiApiKey()" style="background:var(--primary-blue);border:none;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">Speichern</button></div>
            <div id="ai-key-status" style="font-size:11px;margin-top:8px;font-weight:600;"></div>
          </div>
        </div>
        <div id="ai-step-review" style="display:none;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:16px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:14px;">
            <i class="fa-solid fa-circle-check" style="color:#10b981;font-size:20px;"></i>
            <div><div style="font-size:13px;font-weight:700;color:var(--text-main);">KI-Analyse abgeschlossen</div><div style="font-size:12px;color:var(--text-muted);" id="ai-review-summary">0 Einträge erkannt</div></div>
            <button type="button" onclick="resetAiScan()" style="margin-left:auto;background:none;border:1px solid rgba(0,0,0,0.1);padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;"><i class="fa-solid fa-rotate-left" style="margin-right:4px;"></i>Neu</button>
          </div>
          <div id="ai-review-entries"></div>
          <div style="display:flex;gap:10px;margin-top:16px;">
            <button type="button" onclick="resetAiScan()" style="flex:1;background:rgba(0,0,0,0.06);border:none;color:#475569;padding:13px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-xmark" style="margin-right:6px;"></i>Abbrechen</button>
            <button type="button" onclick="confirmAiEntries()" class="primary-btn" style="flex:2;"><i class="fa-solid fa-check" style="margin-right:8px;"></i>Alle bestätigten Einträge hinzufügen</button>
          </div>
        </div>
      </div>
    </div>
    <div id="view-admin-panel" class="content-panel">
      <div class="panel-scroll-content">
        <div class="premium-admin-wrapper">
          <div class="admin-gold-badge"><i class="fa-solid fa-crown"></i> Admin</div>
          <h2 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:4px;letter-spacing:-0.5px;">Verwaltung</h2>
          <p style="font-size:13px;color:var(--admin-text-muted);margin-bottom:24px;">Übersicht aller Mitarbeiterstunden.</p>
          <div class="admin-metrics-row">
            <div class="admin-metric-tile"><label>Gesamteinträge</label><div class="number-callout" id="admin-stat-total">0</div></div>
            <div class="admin-metric-tile"><label>Aktive Mitarbeiter</label><div class="number-callout" id="admin-stat-users">0</div></div>
            <div class="admin-metric-tile"><label>Gesamtstunden (Netto)</label><div class="number-callout" id="admin-stat-hours">0.00</div></div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button type="button" id="admin-tab-overview" onclick="switchAdminView('overview')" style="flex:1;background:var(--admin-gold);border:none;color:#0f172a;padding:12px 16px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-table-list" style="margin-right:6px;"></i>Übersicht</button>
            <button type="button" id="admin-tab-employees" onclick="switchAdminView('employees')" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:var(--admin-text-main);padding:12px 16px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-users" style="margin-right:6px;"></i>Mitarbeiter</button>
          </div>
          <div id="admin-view-overview">
            <div class="admin-controls-bar">
              <div style="color:#fff;font-size:12px;font-weight:700;white-space:nowrap;"><i class="fa-solid fa-filter" style="color:var(--admin-gold);margin-right:6px;"></i>FILTER:</div>
              <select id="admin-user-filter-dropdown" onchange="runAdminTableRender()"><option value="ALL">Alle Mitarbeiter</option></select>
              <select id="admin-type-filter" onchange="runAdminTableRender()"><option value="ALL">Alle Typen</option><option value="WORK">Arbeitsstunden</option><option value="VACATION">Urlaub</option><option value="SICK">Krankmeldungen</option></select>
              <button type="button" onclick="refreshAdminData()" style="background:rgba(227,6,19,0.12);border:1px solid rgba(227,6,19,0.2);color:var(--admin-gold);padding:10px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fa-solid fa-rotate-right" style="margin-right:6px;"></i>Aktualisieren</button>
            </div>
            <div class="admin-table-scroll-shield">
              <table class="admin-enterprise-table">
                <thead><tr><th>Mitarbeiter</th><th>Datum</th><th>Typ</th><th>Baustelle/Kunde</th><th style="text-align:right;">Dauer</th></tr></thead>
                <tbody id="admin-global-table-body"><tr><td colspan="5" style="text-align:center;padding:40px;color:var(--admin-text-muted);"><i class="fa-solid fa-circle-notch fa-spin" style="margin-right:8px;"></i>Laden...</td></tr></tbody>
              </table>
            </div>
          </div>
          <div id="admin-view-employees" style="display:none;">
            <div class="admin-controls-bar">
              <select id="admin-employee-select" onchange="renderEmployeeDetail()"><option value="">-- Mitarbeiter auswählen --</option></select>
              <button type="button" onclick="exportEmployeePDF()" id="btn-export-employee-pdf" style="background:var(--admin-gold);border:none;color:#0f172a;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;opacity:0.5;" disabled><i class="fa-solid fa-file-pdf" style="margin-right:6px;"></i>PDF</button>
              <button type="button" onclick="exportAllEmployeesPDF()" style="background:rgba(192,57,43,0.9);border:none;color:#fff;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fa-solid fa-file-zipper" style="margin-right:6px;"></i>Alle PDFs</button>
            </div>
            <div id="employee-stats-cards" style="display:none;gap:12px;margin-bottom:20px;">
              <div style="flex:1;background:linear-gradient(135deg,rgba(227,6,19,0.12),rgba(227,6,19,0.04));border:1px solid rgba(227,6,19,0.2);border-radius:12px;padding:16px;"><div style="font-size:10px;color:var(--admin-gold);font-weight:700;letter-spacing:1px;margin-bottom:4px;">MITARBEITER</div><div id="emp-stat-name" style="font-size:18px;color:#fff;font-weight:800;">-</div></div>
              <div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;"><div style="font-size:10px;color:var(--admin-text-muted);font-weight:700;letter-spacing:1px;margin-bottom:4px;">ARBEITSSTUNDEN</div><div id="emp-stat-hours" style="font-size:18px;color:var(--admin-gold);font-weight:800;">0.00 h</div></div>
              <div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;"><div style="font-size:10px;color:var(--admin-text-muted);font-weight:700;letter-spacing:1px;margin-bottom:4px;">URLAUBSTAGE</div><div id="emp-stat-vacation" style="font-size:18px;color:#3b82f6;font-weight:800;">0</div></div>
              <div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;"><div style="font-size:10px;color:var(--admin-text-muted);font-weight:700;letter-spacing:1px;margin-bottom:4px;">KRANKTAGE</div><div id="emp-stat-sick" style="font-size:18px;color:#ef4444;font-weight:800;">0</div></div>
            </div>
            <div class="admin-table-scroll-shield">
              <table class="admin-enterprise-table">
                <thead><tr><th>Datum</th><th>Typ</th><th>Projekt/Beschreibung</th><th>Startzeit</th><th>Endzeit</th><th style="text-align:right;">Dauer</th></tr></thead>
                <tbody id="admin-employee-table-body"><tr><td colspan="6" style="text-align:center;padding:40px;color:var(--admin-text-muted);"><i class="fa-solid fa-user-clock" style="margin-right:8px;font-size:16px;"></i>Bitte Mitarbeiter auswählen.</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="view-settings" class="content-panel">
      <div class="panel-scroll-content">
        <div class="view-title" id="lbl-set-title" style="margin-top:0;padding-top:0;">Einstellungen</div>
        <div class="app-card">
          <div class="form-group"><label id="lbl-set-allowed">Urlaubsanspruch (Tage/Jahr)</label><input type="number" id="vacation-allowed-bank" value="30" oninput="runGlobalApplicationMetricsEngine()"><input type="hidden" id="shift-target-constraint" value="8.5"><input type="hidden" id="break-rule-threshold" value="6.0"></div>
          <hr>
          <div>
            <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-key" style="color:var(--primary-red);"></i><span>Kennwort ändern</span></h3>
            <div class="form-group"><label>Aktuelles Kennwort</label><input type="password" id="pin-current" placeholder="••••••"></div>
            <div class="form-group"><label>Neues Kennwort</label><input type="password" id="pin-new" placeholder="••••••"></div>
            <div class="form-group"><label>Neues Kennwort bestätigen</label><input type="password" id="pin-confirm" placeholder="••••••"></div>
            <button type="button" class="primary-btn" style="width:auto;padding:10px 18px;font-size:13px;" onclick="handlePasswordChange()"><i class="fa-solid fa-lock" style="margin-right:6px;"></i>Kennwort aktualisieren</button>
            <div id="pin-change-msg" style="font-size:12px;margin-top:8px;font-weight:600;"></div>
          </div>
          <hr>
          <div>
            <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-shield-halved" style="color:var(--primary-blue);"></i><span id="lbl-security-title">Aktive Geräte</span></h3>
            <div id="active-devices-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>
            <button class="primary-btn" style="width:auto;padding:8px 14px;font-size:12px;background:#dc2626;" onclick="logoutOtherDevicesEngine()"><i class="fa-solid fa-right-from-bracket" style="margin-right:6px;"></i><span id="lbl-logout-others">Alle anderen Geräte abmelden</span></button>
          </div>
          <hr>
          <label id="lbl-set-admin" style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;letter-spacing:0.6px;">Administration</label>
          <button type="button" id="btn-set-trash" class="primary-btn" style="background:#475569;" onclick="openHiddenTrashView()"><i class="fa-solid fa-trash-can" style="margin-right:8px;"></i>Papierkorb öffnen</button>
        </div>
        <div class="view-title" id="lbl-feedback-title" style="margin-top:28px;">Feedback</div>
        <div class="app-card" style="border-top:4px solid var(--primary-blue);">
          <form id="developer-feedback-form" onsubmit="handleFeedbackSubmissionEngine(event)">
            <div class="form-group"><label id="lbl-feedback-input-desc" for="feedback-message">Nachricht an den Entwickler</label><textarea id="feedback-message" rows="3" placeholder="Vorschläge, Fehler oder Änderungswünsche..." required></textarea><span id="lbl-feedback-routing-note" style="font-size:11px;color:var(--text-muted);display:block;margin-top:6px;"><i class="fa-solid fa-circle-info" style="margin-right:4px;color:#94a3b8;"></i> Ihre Nachricht wird direkt an den Entwickler weitergeleitet.</span></div>
            <button type="submit" id="btn-feedback-submit" class="primary-btn">Feedback senden</button>
          </form>
          <div id="feedback-status-box" class="message"></div>
        </div>
      </div>
    </div>
    <div id="view-deleted" class="content-panel">
      <div class="panel-scroll-content">
        <div class="view-title" id="lbl-trash-title">Papierkorb</div>
        <p id="lbl-trash-disclaimer" style="color:#64748b;font-size:13px;margin-bottom:18px;line-height:1.6;">Gelöschte Einträge werden nach 12 Stunden endgültig entfernt.</p>
        <div id="deleted-items-bin-container"></div>
      </div>
    </div>
  </main>
</div>
`);
