// ── AI Scan Engine — Gemini Vision ────────────────────────────────────────
const AI_KEY_STORAGE = 'sch_gemini_key';
let aiPendingImageBase64 = null;
let aiPendingImageMime   = null;
let aiReviewEntries      = [];

// ── API Key Management ────────────────────────────────────────────────────
function saveAiApiKey() {
  const inp = document.getElementById('ai-api-key-input');
  const status = document.getElementById('ai-key-status');
  const val = inp.value.trim();
  if (!val || !val.startsWith('AIza')) {
    status.style.color = '#ef4444';
    status.textContent = 'Ungültiger Key – muss mit "AIza" beginnen.';
    return;
  }
  localStorage.setItem(AI_KEY_STORAGE, val);
  inp.value = '••••••••••••••••••••••';
  status.style.color = '#10b981';
  status.textContent = '✓ API Key gespeichert';
  document.getElementById('ai-api-key-card').style.borderLeftColor = '#10b981';
  showToast('✓ Gemini API Key gespeichert');
}

function getAiApiKey() {
  return localStorage.getItem(AI_KEY_STORAGE) || '';
}

// On page load: if key exists, show masked and hide card
(function initAiKeyUI() {
  const key = getAiApiKey();
  const card = document.getElementById('ai-api-key-card');
  const inp  = document.getElementById('ai-api-key-input');
  const status = document.getElementById('ai-key-status');
  if (key && card && inp) {
    inp.value = '••••••••••••••••••••••';
    if (status) { status.style.color = '#10b981'; status.textContent = '✓ API Key vorhanden'; }
    card.style.borderLeftColor = '#10b981';
  }
})();

// ── File Handling ─────────────────────────────────────────────────────────
function handleAiFileSelect(event) {
  const file = event.target.files[0];
  // Reset capture after selection so next gallery open works correctly
  const input = document.getElementById('ai-file-input');
  input.removeAttribute('capture');
  if (file) loadAiImageFile(file);
}

function handleAiDrop(event) {
  event.preventDefault();
  document.getElementById('ai-dropzone').classList.remove('dragover');
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadAiImageFile(file);
}

// Gallery: remove capture so the file picker / photo library opens
function triggerAiGallery() {
  const input = document.getElementById('ai-file-input');
  input.removeAttribute('capture');
  input.click();
}

// Camera: add capture=environment so the camera opens directly
function triggerAiCamera() {
  const input = document.getElementById('ai-file-input');
  input.setAttribute('capture', 'environment');
  input.click();
}

function loadAiImageFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('Datei zu groß – max 10 MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) { showToast('Ungültiges Bildformat', 'error'); return; }
    aiPendingImageMime   = match[1];
    aiPendingImageBase64 = match[2];
    const img  = document.getElementById('ai-preview-img');
    const ph   = document.getElementById('ai-dropzone-placeholder');
    img.src    = dataUrl;
    img.style.display = 'block';
    ph.style.display  = 'none';
    document.getElementById('btn-ai-analyze').style.display = 'block';
    showToast('✓ Bild geladen – bereit zur Analyse', 'info');
  };
  reader.readAsDataURL(file);
}

// ── AI Analysis ───────────────────────────────────────────────────────────
async function runAiAnalysis() {
  const apiKey = getAiApiKey();
  if (!apiKey) {
    showToast('Bitte zuerst einen Gemini API Key eingeben', 'error');
    document.getElementById('ai-api-key-input').focus();
    return;
  }
  if (!aiPendingImageBase64) {
    showToast('Bitte zuerst ein Bild auswählen', 'error');
    return;
  }

  showAiScanningOverlay(true);

  const prompt = `Du bist ein intelligenter Stundenzettel-Parser für ein deutsches Bauunternehmen.\n\nAnalysiere dieses handgeschriebene Bild eines Stundenzettels und extrahiere alle Arbeitseinträge.\n\nFür jeden Eintrag gib zurück:\n- date: Datum im Format DD/MM/YYYY (z.B. 15/01/2025)\n- project: Baustelle oder Kundenname (string)\n- startTime: Startzeit im Format HH:MM (z.B. 07:00)\n- endTime: Endzeit im Format HH:MM (z.B. 16:15)\n- breakTime: Pause in Minuten (number, z.B. 30, oder 0 wenn keine)\n- notes: Notizen oder Tätigkeiten (string oder leer)\n- confidence: "high", "medium" oder "low" je nach Lesbarkeit\n\nAntworte NUR mit einem gültigen JSON-Array. Kein erklärender Text. Beispiel:\n[\n  {"date":"15/01/2025","project":"Baustelle Müller","startTime":"07:00","endTime":"16:15","breakTime":30,"notes":"Maurerarbeiten","confidence":"high"},\n  {"date":"16/01/2025","project":"Kunde Schmidt","startTime":"08:00","endTime":"17:00","breakTime":45,"notes":"","confidence":"medium"}\n]\n\nWenn du nichts lesen kannst, gib zurück: []\nWenn das Datum fehlt oder unklar ist, versuche es aus dem Kontext zu schließen (z.B. Wochentag + naheliegendes Datum).\nHeute ist: ${new Date().toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'})}.`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: aiPendingImageMime, data: aiPendingImageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
        })
      }
    );

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const errMsg  = errData?.error?.message || `HTTP ${resp.status}`;
      throw new Error(errMsg);
    }

    const data = await resp.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Keine gültigen Daten erkannt');

    const parsed = JSON.parse(jsonMatch[0]);
    showAiScanningOverlay(false);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      showToast('KI konnte keine Einträge erkennen. Bitte klareres Foto aufnehmen.', 'error');
      return;
    }

    aiReviewEntries = parsed.map((entry, i) => ({ ...entry, _id: 'ai-' + Date.now() + '-' + i, _included: true }));
    renderAiReviewStep();

  } catch (err) {
    showAiScanningOverlay(false);
    console.error('AI Scan error:', err);
    if (err.message.includes('API_KEY_INVALID') || err.message.includes('400')) {
      showToast('Ungültiger API Key. Bitte neu eingeben.', 'error');
      localStorage.removeItem(AI_KEY_STORAGE);
    } else {
      showToast('KI-Fehler: ' + err.message, 'error');
    }
  }
}

// ── Scanning Overlay ──────────────────────────────────────────────────────
function showAiScanningOverlay(show) {
  let overlay = document.getElementById('ai-scanning-overlay');
  if (show) {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'ai-scanning-overlay';
    overlay.className = 'ai-scanning-overlay';
    overlay.innerHTML = `
      <div class="ai-scanning-spinner"></div>
      <div style="text-align:center;">
        <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:6px;">KI analysiert Stundenzettel…</div>
        <div style="font-size:13px;color:#64748b;">Gemini Vision liest deinen Zettel</div>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        ${['Datum','Baustelle','Zeiten','Pausen'].map(l=>`<span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);padding:4px 10px;border-radius:99px;font-size:11px;color:#94a3b8;font-weight:600;">${l}</span>`).join('')}
      </div>`;
    document.body.appendChild(overlay);
  } else {
    if (overlay) overlay.remove();
  }
}

// ── Review Step ───────────────────────────────────────────────────────────
function renderAiReviewStep() {
  document.getElementById('ai-step-upload').style.display = 'none';
  document.getElementById('ai-step-review').style.display = 'block';

  const count = aiReviewEntries.length;
  document.getElementById('ai-review-summary').textContent =
    `${count} Eintrag${count !== 1 ? 'e' : ''} erkannt – prüfe und korrigiere falls nötig`;

  const container = document.getElementById('ai-review-entries');
  container.innerHTML = '';

  aiReviewEntries.forEach((entry, idx) => {
    const confidenceClass = entry.confidence === 'high' ? 'ai-confidence-high' : entry.confidence === 'medium' ? 'ai-confidence-medium' : 'ai-confidence-low';
    const confidenceLabel = entry.confidence === 'high' ? 'Sicher' : entry.confidence === 'medium' ? 'Unsicher' : 'Prüfen!';

    const card = document.createElement('div');
    card.className = 'ai-review-card';
    card.id = `ai-card-${idx}`;
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;background:linear-gradient(135deg,#E30613,#b8000f);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;">${idx+1}</div>
          <span style="font-size:13px;font-weight:700;color:var(--dark-slate);">Eintrag ${idx+1}</span>
          <span class="ai-confidence-badge ${confidenceClass}"><i class="fa-solid fa-${entry.confidence==='high'?'check':'triangle-exclamation'}" style="font-size:9px;"></i> ${confidenceLabel}</span>
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-muted);">
          <input type="checkbox" id="ai-include-${idx}" ${entry._included?'checked':''} onchange="toggleAiEntry(${idx})" style="width:16px;height:16px;accent-color:#E30613;cursor:pointer;">
          Hinzufügen
        </label>
      </div>

      <div class="ai-field-row">
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Datum</label>
          <input type="text" id="ai-date-${idx}" value="${entry.date||''}" placeholder="DD/MM/YYYY"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;"
            oninput="updateAiEntry(${idx},'date',this.value)">
        </div>
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Pause (min)</label>
          <input type="number" id="ai-break-${idx}" value="${entry.breakTime||0}" min="0" max="120" step="5"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;"
            oninput="updateAiEntry(${idx},'breakTime',parseInt(this.value)||0)">
        </div>
      </div>
      <div class="ai-field-row single">
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Baustelle / Kunde</label>
          <input type="text" id="ai-project-${idx}" value="${sanitizeHTML(entry.project||'')}" placeholder="Baustelle oder Kundenname"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;"
            oninput="updateAiEntry(${idx},'project',this.value)">
        </div>
      </div>
      <div class="ai-field-row">
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Kommen</label>
          <input type="text" id="ai-start-${idx}" value="${entry.startTime||''}" placeholder="07:00"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;"
            oninput="updateAiEntry(${idx},'startTime',this.value)">
        </div>
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Gehen</label>
          <input type="text" id="ai-end-${idx}" value="${entry.endTime||''}" placeholder="16:15"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;"
            oninput="updateAiEntry(${idx},'endTime',this.value)">
        </div>
      </div>
      <div class="ai-field-row single">
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Notizen (optional)</label>
          <input type="text" id="ai-notes-${idx}" value="${sanitizeHTML(entry.notes||'')}" placeholder="Tätigkeiten..."
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;"
            oninput="updateAiEntry(${idx},'notes',this.value)">
        </div>
      </div>

      <!-- Live duration preview -->
      <div id="ai-duration-preview-${idx}" style="margin-top:10px;padding:8px 12px;background:#f1f5f9;border-radius:8px;font-size:12px;font-weight:700;color:#475569;text-align:center;"></div>`;

    container.appendChild(card);
    updateAiDurationPreview(idx);
  });
}

function toggleAiEntry(idx) {
  aiReviewEntries[idx]._included = document.getElementById(`ai-include-${idx}`).checked;
  const card = document.getElementById(`ai-card-${idx}`);
  if (card) card.style.opacity = aiReviewEntries[idx]._included ? '1' : '0.45';
}

function updateAiEntry(idx, field, value) {
  aiReviewEntries[idx][field] = value;
  updateAiDurationPreview(idx);
}

function updateAiDurationPreview(idx) {
  const el = document.getElementById(`ai-duration-preview-${idx}`);
  if (!el) return;
  const entry = aiReviewEntries[idx];
  if (!entry.startTime || !entry.endTime) { el.textContent = ''; return; }
  try {
    const [sh, sm] = entry.startTime.split(':').map(Number);
    const [eh, em] = entry.endTime.split(':').map(Number);
    const gross = (eh * 60 + em) - (sh * 60 + sm);
    if (gross <= 0) { el.style.color = '#ef4444'; el.textContent = '⚠ Endzeit vor Startzeit'; return; }
    const net = gross - (entry.breakTime || 0);
    const netHrs = net / 60;
    el.style.color = netHrs > 0 ? '#10b981' : '#ef4444';
    el.textContent = `⏱ Brutto: ${(gross/60).toFixed(2)} h  |  Netto: ${netHrs.toFixed(2)} h  (${entry.breakTime||0} min Pause)`;
  } catch(e) { el.textContent = ''; }
}

// ── Confirm & Add Entries ─────────────────────────────────────────────────
function confirmAiEntries() {
  const toAdd = aiReviewEntries.filter(e => e._included);
  if (!toAdd.length) { showToast('Keine Einträge zum Hinzufügen ausgewählt.', 'error'); return; }

  let added = 0, skipped = 0, errors = 0;

  toAdd.forEach(entry => {
    if (!entry.date || !entry.startTime || !entry.endTime || !entry.project) { errors++; return; }
    try {
      const [sh, sm] = entry.startTime.split(':').map(Number);
      const [eh, em] = entry.endTime.split(':').map(Number);
      const gross = (eh * 60 + em) - (sh * 60 + sm);
      if (gross <= 0) { errors++; return; }
      const duration = gross / 60;

      const existing = globalLoggedSessionsDatabaseMock.filter(r => r.type === 'work' && r.date === entry.date);
      const startMins = sh * 60 + sm, endMins = eh * 60 + em;
      let overlap = false;
      for (const rec of existing) {
        const rStart = parseInt(rec.startTime.split(':')[0])*60 + parseInt(rec.startTime.split(':')[1]);
        const rEnd   = parseInt(rec.endTime.split(':')[0])*60   + parseInt(rec.endTime.split(':')[1]);
        if (startMins < rEnd && endMins > rStart) { overlap = true; break; }
      }
      if (overlap) { skipped++; return; }

      const dateParts = entry.date.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
      let formattedDate = entry.date;
      if (dateParts) {
        formattedDate = `${String(dateParts[1]).padStart(2,'0')}/${String(dateParts[2]).padStart(2,'0')}/${dateParts[3]}`;
      }

      const record = {
        id:        'work-ai-' + Date.now() + '-' + Math.random().toString(36).substr(2,5),
        type:      'work',
        date:      formattedDate,
        startTime: entry.startTime,
        endTime:   entry.endTime,
        project:   entry.project.trim(),
        duration:  duration,
        breakTime: entry.breakTime || 0,
        notes:     entry.notes || ''
      };
      globalLoggedSessionsDatabaseMock.unshift(record);
      added++;
    } catch(e) { errors++; }
  });

  persistUserData();
  renderHistoricalRecordsSheet();
  runGlobalApplicationMetricsEngine();

  let msg = `✓ ${added} Eintrag${added!==1?'e':''} hinzugefügt`;
  if (skipped) msg += ` · ${skipped} Überschneidung(en) übersprungen`;
  if (errors)  msg += ` · ${errors} Fehler`;
  showToast(msg, added > 0 ? 'success' : 'error');

  if (added > 0) {
    triggerSaveHaptic();
    setTimeout(() => {
      switchActiveView('history', document.querySelector('[onclick*="switchActiveView(\'history\'"]'));
      resetAiScan();
    }, 800);
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────
function resetAiScan() {
  aiPendingImageBase64 = null;
  aiPendingImageMime   = null;
  aiReviewEntries      = [];

  const img = document.getElementById('ai-preview-img');
  const ph  = document.getElementById('ai-dropzone-placeholder');
  const btn = document.getElementById('btn-ai-analyze');
  if (img) { img.src = ''; img.style.display = 'none'; }
  if (ph)  ph.style.display = 'block';
  if (btn) btn.style.display = 'none';

  const fileInput = document.getElementById('ai-file-input');
  if (fileInput) { fileInput.value = ''; fileInput.removeAttribute('capture'); }

  document.getElementById('ai-step-upload').style.display  = 'block';
  document.getElementById('ai-step-review').style.display  = 'none';
  document.getElementById('ai-review-entries').innerHTML   = '';
}
