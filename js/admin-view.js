document.write(`
<div id="admin-full-view">
  <div class="admin-layout">
    <div class="admin-sidebar-backdrop" id="admin-sidebar-backdrop" onclick="toggleAdminSidebar()"></div>
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="admin-sidebar-header">
        <div class="admin-sidebar-brand">MEINE STUNDEN</div>
        <div class="admin-sidebar-subtitle">ONLINE</div>
        <div class="admin-sidebar-user">
          <div class="admin-sidebar-user-label">Angemeldet als</div>
          <div class="admin-sidebar-user-name" id="admin-user-display">Administrator</div>
        </div>
      </div>
      <nav class="admin-sidebar-nav">
        <div class="admin-nav-section">
          <div class="admin-nav-section-title">Hauptmenü</div>
          <div class="admin-nav-item active" onclick="switchAdminSection('overview')" id="admin-nav-overview"><i class="fa-solid fa-chart-line"></i><span>Übersicht</span></div>
          <div class="admin-nav-item" onclick="switchAdminSection('employees')" id="admin-nav-employees"><i class="fa-solid fa-users"></i><span>Mitarbeiter</span></div>
          <div class="admin-nav-item" onclick="switchAdminSection('absences')" id="admin-nav-absences"><i class="fa-solid fa-calendar-xmark"></i><span>Urlaub & Krank</span></div>
        </div>
        <div class="admin-nav-section">
          <div class="admin-nav-section-title">Berichte</div>
          <div class="admin-nav-item" onclick="switchAdminSection('reports')" id="admin-nav-reports"><i class="fa-solid fa-file-pdf"></i><span>PDF Exporte</span></div>
        </div>
        <div class="admin-nav-section">
          <div class="admin-nav-section-title">System</div>
          <div class="admin-nav-item" onclick="switchAdminSection('settings')" id="admin-nav-settings"><i class="fa-solid fa-gear"></i><span>Einstellungen</span></div>
          <div class="admin-nav-item danger" onclick="handleAdminSignOut()"><i class="fa-solid fa-right-from-bracket"></i><span>Abmelden</span></div>
        </div>
      </nav>
      <div class="admin-sidebar-footer"><div class="admin-sidebar-footer-text">Version 2.1.0 | Meine Stunden Online</div></div>
    </aside>
    <main class="admin-main">
      <header class="admin-header">
        <div class="admin-header-title">
          <button class="admin-mobile-toggle" onclick="toggleAdminSidebar()"><i class="fa-solid fa-bars"></i></button>
          <h1 id="admin-page-title">Dashboard</h1>
        </div>
        <div class="admin-header-actions">
          <button class="admin-header-btn" onclick="exportAdminCSV()"><i class="fa-solid fa-file-csv"></i><span>CSV</span></button>
          <button class="admin-header-btn" onclick="printAdminOverview()"><i class="fa-solid fa-print"></i><span>Drucken</span></button>
          <button class="admin-header-btn" onclick="refreshAdminData()"><i class="fa-solid fa-rotate-right"></i><span>Aktualisieren</span></button>
          <div style="color:#475569;font-size:11px;" id="admin-last-update">--</div>
        </div>
      </header>
      <div class="admin-content">
        <div class="admin-content-inner">
          <section id="admin-section-overview" class="admin-section">
            <div class="admin-metrics-row" style="margin-bottom:28px;">
              <div class="admin-metric-tile"><label>Gesamteinträge</label><div class="number-callout" id="admin-stat-total">0</div></div>
              <div class="admin-metric-tile"><label>Aktive Mitarbeiter</label><div class="number-callout" id="admin-stat-users">0</div></div>
              <div class="admin-metric-tile"><label>Gesamtstunden (Netto)</label><div class="number-callout" id="admin-stat-hours">0.00</div></div>
            </div>
            <div style="background:var(--admin-card);border:1px solid var(--admin-border);border-radius:16px;padding:28px;margin-bottom:24px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0;"><i class="fa-solid fa-clock-rotate-left" style="color:var(--admin-gold);margin-right:10px;"></i>Neueste Einträge</h3>
                <div style="display:flex;gap:10px;align-items:center;">
                  <select id="admin-user-filter-dropdown" onchange="runAdminTableRender()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;"><option value="ALL">Alle Mitarbeiter</option></select>
                  <select id="admin-type-filter" onchange="runAdminTableRender()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;"><option value="ALL">Alle Typen</option><option value="WORK">Arbeitsstunden</option><option value="VACATION">Urlaub</option><option value="SICK">Krankmeldungen</option></select>
                </div>
              </div>
              <div id="print-admin-area">
                <div id="print-admin-title">MEINE STUNDEN ONLINE — Mitarbeiterübersicht</div>
                <div class="admin-table-scroll-shield">
                  <table class="admin-enterprise-table">
                    <thead><tr><th>Mitarbeiter</th><th>Datum</th><th>Typ</th><th>Baustelle/Kunde</th><th style="text-align:right;">Dauer</th></tr></thead>
                    <tbody id="admin-global-table-body"><tr><td colspan="5" style="text-align:center;padding:40px;color:var(--admin-text-muted);"><i class="fa-solid fa-circle-notch fa-spin" style="margin-right:8px;"></i>Laden...</td></tr></tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
          <section id="admin-section-employees" class="admin-section" style="display:none;">
            <div style="background:var(--admin-card);border:1px solid var(--admin-border);border-radius:16px;padding:28px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
                <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0;"><i class="fa-solid fa-user-tie" style="color:var(--admin-gold);margin-right:10px;"></i>Mitarbeiter Einzelansicht</h3>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                  <select id="admin-employee-select" onchange="renderEmployeeDetail()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 14px;border-radius:8px;font-size:12px;min-width:180px;"><option value="">-- Mitarbeiter auswählen --</option></select>
                  <button type="button" onclick="exportEmployeePDF()" id="btn-export-employee-pdf" style="background:var(--admin-gold);border:none;color:#0f172a;padding:10px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;opacity:0.5;" disabled><i class="fa-solid fa-file-pdf" style="margin-right:6px;"></i>PDF Export</button>
                </div>
              </div>
              <div id="admin-employee-note-box" class="admin-note-box" style="display:none;">
                <div style="font-size:11px;color:var(--admin-gold);font-weight:700;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase;"><i class="fa-solid fa-lock" style="margin-right:6px;"></i>Interne Notiz</div>
                <textarea id="admin-employee-note-input" placeholder="Notiz zu diesem Mitarbeiter..."></textarea>
                <button type="button" onclick="saveAdminEmployeeNote()" style="margin-top:8px;background:var(--admin-gold);border:none;color:#0f172a;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i>Notiz speichern</button>
                <span id="admin-note-saved-msg" style="font-size:11px;color:#34d399;margin-left:10px;display:none;">✓ Gespeichert</span>
              </div>
              <div id="employee-stats-cards" style="display:none;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;width:100%;">
                <div style="background:linear-gradient(135deg,rgba(227,6,19,0.12),rgba(227,6,19,0.04));border:1px solid rgba(227,6,19,0.2);border-radius:12px;padding:18px;"><div style="font-size:10px;color:var(--admin-gold);font-weight:700;letter-spacing:1px;margin-bottom:6px;">MITARBEITER</div><div id="emp-stat-name" style="font-size:18px;color:#fff;font-weight:800;">-</div></div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px;"><div style="font-size:10px;color:var(--admin-text-muted);font-weight:700;letter-spacing:1px;margin-bottom:6px;">ARBEITSSTUNDEN</div><div id="emp-stat-hours" style="font-size:18px;color:var(--admin-gold);font-weight:800;">0.00 h</div></div>
                <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.18);border-radius:12px;padding:18px;"><div style="font-size:10px;color:#10b981;font-weight:700;letter-spacing:1px;margin-bottom:6px;">ÜBERSTUNDEN</div><div id="emp-stat-overtime" style="font-size:18px;color:#10b981;font-weight:800;">+0.00 h</div></div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px;"><div style="font-size:10px;color:var(--admin-text-muted);font-weight:700;letter-spacing:1px;margin-bottom:6px;">URLAUBSTAGE</div><div id="emp-stat-vacation" style="font-size:18px;color:#3b82f6;font-weight:800;">0</div></div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px;"><div style="font-size:10px;color:var(--admin-text-muted);font-weight:700;letter-spacing:1px;margin-bottom:6px;">KRANKTAGE</div><div id="emp-stat-sick" style="font-size:18px;color:#ef4444;font-weight:800;">0</div></div>
              </div>
              <div class="admin-table-scroll-shield">
                <table class="admin-enterprise-table">
                  <thead><tr><th>Datum</th><th>Typ</th><th>Projekt/Beschreibung</th><th>Startzeit</th><th>Endzeit</th><th style="text-align:right;">Dauer</th></tr></thead>
                  <tbody id="admin-employee-table-body"><tr><td colspan="6" style="text-align:center;padding:40px;color:var(--admin-text-muted);"><i class="fa-solid fa-user-clock" style="margin-right:8px;font-size:16px;"></i>Bitte Mitarbeiter auswählen.</td></tr></tbody>
                </table>
              </div>
            </div>
          </section>
          <section id="admin-section-absences" class="admin-section" style="display:none;">
            <div style="background:var(--admin-card);border:1px solid var(--admin-border);border-radius:16px;padding:28px;margin-bottom:24px;">
              <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 6px 0;"><i class="fa-solid fa-calendar-plus" style="color:var(--admin-gold);margin-right:10px;"></i>Abwesenheit erfassen</h3>
              <p style="color:var(--admin-text-muted);font-size:13px;margin:0 0 20px 0;">Urlaub oder Krankmeldung für Mitarbeiter eintragen</p>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px;">
                <div><label style="display:block;font-size:11px;color:var(--admin-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Mitarbeiter</label><select id="absence-employee" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;"><option value="">-- auswählen --</option></select></div>
                <div><label style="display:block;font-size:11px;color:var(--admin-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Art</label><select id="absence-type" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;"><option value="VACATION">Urlaub</option><option value="SICK">Krankmeldung</option></select></div>
                <div><label style="display:block;font-size:11px;color:var(--admin-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Von</label><input type="text" id="absence-start" readonly style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:9px 12px;border-radius:8px;font-size:13px;"></div>
                <div><label style="display:block;font-size:11px;color:var(--admin-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Bis</label><input type="text" id="absence-end" readonly style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:9px 12px;border-radius:8px;font-size:13px;"></div>
              </div>
              <div style="margin-bottom:20px;"><label style="display:block;font-size:11px;color:var(--admin-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Grund (optional)</label><input type="text" id="absence-note" placeholder="z.B. Arzttermin" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;"></div>
              <button onclick="registerAbsence()" style="background:var(--admin-gold);border:none;color:#0f172a;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-plus" style="margin-right:8px;"></i>Abwesenheit speichern</button>
              <div id="absence-status" style="margin-top:12px;font-size:12px;"></div>
            </div>
            <div style="background:var(--admin-card);border:1px solid var(--admin-border);border-radius:16px;padding:28px;">
              <h3 style="font-size:14px;font-weight:700;color:#fff;margin:0 0 16px 0;">Letzte Einträge</h3>
              <div id="absence-recent-list" style="font-size:12px;color:var(--admin-text-muted);">Noch keine Einträge</div>
            </div>
          </section>
          <section id="admin-section-reports" class="admin-section" style="display:none;">
            <div style="background:var(--admin-card);border:1px solid var(--admin-border);border-radius:16px;padding:28px;">
              <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 20px 0;"><i class="fa-solid fa-file-export" style="color:var(--admin-gold);margin-right:10px;"></i>PDF Berichte exportieren</h3>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:22px;">
                  <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px;"><i class="fa-solid fa-user" style="color:var(--admin-gold);margin-right:8px;"></i>Einzelner Mitarbeiter</div>
                  <p style="font-size:12px;color:var(--admin-text-muted);margin-bottom:16px;">Bericht für einen Mitarbeiter erstellen.</p>
                  <select id="report-employee-select" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 12px;border-radius:8px;font-size:12px;margin-bottom:12px;"><option value="">-- Mitarbeiter wählen --</option></select>
                  <button onclick="exportSingleEmployeeReport()" style="width:100%;background:var(--admin-gold);border:none;color:#0f172a;padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-download" style="margin-right:8px;"></i>PDF erstellen</button>
                </div>
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:22px;">
                  <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px;"><i class="fa-solid fa-users" style="color:#3b82f6;margin-right:8px;"></i>Alle Mitarbeiter</div>
                  <p style="font-size:12px;color:var(--admin-text-muted);margin-bottom:16px;">PDF für jeden Mitarbeiter exportieren.</p>
                  <button onclick="exportAllEmployeesPDF()" style="width:100%;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;color:#fff;padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-file-zipper" style="margin-right:8px;"></i>Alle PDFs exportieren</button>
                </div>
              </div>
            </div>
          </section>
          <section id="admin-section-settings" class="admin-section" style="display:none;">
            <div style="background:var(--admin-card);border:1px solid var(--admin-border);border-radius:16px;padding:28px;margin-bottom:16px;">
              <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 20px 0;"><i class="fa-solid fa-key" style="color:var(--admin-gold);margin-right:10px;"></i>Kennwort ändern</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
                <div><label style="display:block;font-size:11px;color:var(--admin-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;">Aktuelles Kennwort</label><input type="password" id="admin-pin-current" placeholder="••••••" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;box-sizing:border-box;"></div>
                <div><label style="display:block;font-size:11px;color:var(--admin-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;">Neues Kennwort</label><input type="password" id="admin-pin-new" placeholder="••••••" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;box-sizing:border-box;"></div>
                <div><label style="display:block;font-size:11px;color:var(--admin-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;">Bestätigen</label><input type="password" id="admin-pin-confirm" placeholder="••••••" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;box-sizing:border-box;"></div>
              </div>
              <button type="button" onclick="handleAdminPasswordChange()" style="background:var(--admin-gold);border:none;color:#0f172a;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-lock" style="margin-right:8px;"></i>Kennwort aktualisieren</button>
              <div id="admin-pin-msg" style="font-size:12px;margin-top:10px;font-weight:600;"></div>
            </div>
            <div style="background:var(--admin-card);border:1px solid var(--admin-border);border-radius:16px;padding:28px;">
              <h3 style="font-size:15px;font-weight:800;color:#fff;margin:0 0 20px 0;"><i class="fa-solid fa-gear" style="color:var(--admin-gold);margin-right:10px;"></i>Einstellungen</h3>
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;">
                <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:12px;">Sprache / Language</div>
                <div style="display:flex;gap:10px;">
                  <button type="button" onclick="setApplicationLanguage('de')" style="flex:1;background:rgba(227,6,19,0.12);border:1px solid rgba(227,6,19,0.25);color:var(--admin-gold);padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">Deutsch</button>
                  <button type="button" onclick="setApplicationLanguage('en')" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">English</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</div>
`);
