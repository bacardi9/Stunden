// ── AI Scan Engine — Gemini Images & PDFs ────────────────────────────────
const AI_KEY_STORAGE = 'sch_gemini_key';
const AI_MAX_FILES = 10;
const AI_MAX_FILE_SIZE = 10 * 1024 * 1024;
const AI_ACCEPTED_TYPES = 'image/*,application/pdf';

let aiPendingFiles = [];
let aiReviewEntries = [];

// ── API Key Management ────────────────────────────────────────────────────
function saveAiApiKey() {
  const input = document.getElementById('ai-api-key-input');
  const status = document.getElementById('ai-key-status');
  const value = input?.value.trim() || '';

  if (!value || !value.startsWith('AIza')) {
    if (status) {
      status.style.color = '#ef4444';
      status.textContent = 'Ungültiger Key – muss mit "AIza" beginnen.';
    }
    return;
  }

  localStorage.setItem(AI_KEY_STORAGE, value);
  input.value = '••••••••••••••••••••••';

  if (status) {
    status.style.color = '#10b981';
    status.textContent = '✓ API Key gespeichert';
  }

  const card = document.getElementById('ai-api-key-card');
  if (card) card.style.borderLeftColor = '#10b981';

  showToast('✓ Gemini API Key gespeichert', 'success');
}

function getAiApiKey() {
  return localStorage.getItem(AI_KEY_STORAGE) || '';
}

function configureAiFileInput() {
  const input = document.getElementById('ai-file-input');
  if (!input) return;

  input.setAttribute('accept', AI_ACCEPTED_TYPES);
  input.setAttribute('multiple', '');
}

function initAiKeyUI() {
  configureAiFileInput();

  const key = getAiApiKey();
  const card = document.getElementById('ai-api-key-card');
  const input = document.getElementById('ai-api-key-input');
  const status = document.getElementById('ai-key-status');

  if (key && card && input) {
    input.value = '••••••••••••••••••••••';
    card.style.borderLeftColor = '#10b981';

    if (status) {
      status.style.color = '#10b981';
      status.textContent = '✓ API Key vorhanden';
    }
  }

  const placeholder = document.getElementById('ai-dropzone-placeholder');
  if (placeholder) {
    const description = placeholder.querySelector(
      'div[style*="font-size:12px"]'
    );

    if (description) {
      description.textContent =
        'JPG, PNG, HEIC oder PDF · max. 10 MB pro Datei · bis zu 10 Dateien';
    }

    const title = placeholder.querySelector(
      'div[style*="font-size:14px"]'
    );

    if (title) {
      title.textContent = 'Fotos oder PDFs hierher ziehen oder tippen';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAiKeyUI);
} else {
  setTimeout(initAiKeyUI, 0);
}

// ── File Validation ────────────────────────────────────────────────────────
function isPdfFile(file) {
  return file?.type === 'application/pdf' ||
    /\.pdf$/i.test(file?.name || '');
}

function isImageFile(file) {
  return String(file?.type || '').startsWith('image/');
}

function getValidatedMimeType(file) {
  if (isPdfFile(file)) return 'application/pdf';
  if (isImageFile(file)) return file.type;
  return '';
}

function validateAiFile(file) {
  const mime = getValidatedMimeType(file);

  if (!mime) {
    return {
      valid: false,
      message: `"${file.name}" wird nicht unterstützt. Erlaubt sind Bilder und PDFs.`
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      message: `"${file.name}" ist leer.`
    };
  }

  if (file.size > AI_MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `"${file.name}" ist zu groß – maximal 10 MB.`
    };
  }

  return { valid: true, mime };
}

// ── File Handling ─────────────────────────────────────────────────────────
function handleAiFileSelect(event) {
  const input = document.getElementById('ai-file-input');
  const files = Array.from(event?.target?.files || []);

  if (input) {
    input.removeAttribute('capture');
    input.setAttribute('accept', AI_ACCEPTED_TYPES);
  }

  if (!files.length) return;

  const remaining = AI_MAX_FILES - aiPendingFiles.length;

  if (remaining <= 0) {
    showToast(`Maximal ${AI_MAX_FILES} Dateien erlaubt.`, 'error');
    if (input) input.value = '';
    return;
  }

  const selectedFiles = files.slice(0, remaining);

  if (files.length > remaining) {
    showToast(
      `Nur ${remaining} weitere Datei(en) hinzugefügt. Limit: ${AI_MAX_FILES}.`,
      'info'
    );
  }

  let completed = 0;

  selectedFiles.forEach(file => {
    const validation = validateAiFile(file);

    if (!validation.valid) {
      showToast(validation.message, 'error');
      completed++;

      if (completed === selectedFiles.length) renderAiThumbs();
      return;
    }

    const reader = new FileReader();

    reader.onload = eventResult => {
      const dataUrl = String(eventResult.target?.result || '');
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

      if (match) {
        aiPendingFiles.push({
          base64: match[2],
          mime: validation.mime,
          name: file.name,
          size: file.size,
          dataUrl,
          isPdf: validation.mime === 'application/pdf'
        });
      } else {
        showToast(`"${file.name}" konnte nicht gelesen werden.`, 'error');
      }

      completed++;
      if (completed === selectedFiles.length) renderAiThumbs();
    };

    reader.onerror = () => {
      completed++;
      showToast(`"${file.name}" konnte nicht gelesen werden.`, 'error');
      if (completed === selectedFiles.length) renderAiThumbs();
    };

    reader.readAsDataURL(file);
  });

  if (input) input.value = '';
}

function handleAiDrop(event) {
  event.preventDefault();

  const dropzone = document.getElementById('ai-dropzone');
  if (dropzone) dropzone.classList.remove('dragover');

  const files = Array.from(event.dataTransfer?.files || []);
  if (!files.length) return;

  handleAiFileSelect({ target: { files } });
}

function triggerAiGallery() {
  const input = document.getElementById('ai-file-input');
  if (!input) return;

  input.removeAttribute('capture');
  input.setAttribute('accept', AI_ACCEPTED_TYPES);
  input.click();
}

function triggerAiCamera() {
  const input = document.getElementById('ai-file-input');
  if (!input) return;

  input.setAttribute('accept', 'image/*');
  input.setAttribute('capture', 'environment');
  input.click();
}

// ── Preview UI ─────────────────────────────────────────────────────────────
function createAiFilePreview(file, index) {
  const item = document.createElement('div');
  item.className = 'ai-thumb-item';
  item.style.position = 'relative';

  if (file.isPdf) {
    item.style.cssText +=
      'display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;background:#fff1f2;border-color:#fecdd3;' +
      'padding:5px;text-align:center;';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-file-pdf';
    icon.style.cssText = 'font-size:25px;color:#dc2626;margin-bottom:4px;';

    const name = document.createElement('span');
    name.textContent = file.name;
    name.title = file.name;
    name.style.cssText =
      'display:block;width:100%;font-size:8px;font-weight:700;' +
      'color:#991b1b;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;';

    item.appendChild(icon);
    item.appendChild(name);
  } else {
    const image = document.createElement('img');
    image.src = file.dataUrl;
    image.alt = file.name || `Foto ${index + 1}`;
    item.appendChild(image);
  }

  const removeButton = document.createElement('button');
  removeButton.className = 'thumb-remove';
  removeButton.type = 'button';
  removeButton.title = 'Entfernen';
  removeButton.textContent = '×';
  removeButton.onclick = event => {
    event.stopPropagation();
    removeAiFile(index);
  };

  item.appendChild(removeButton);
  return item;
}

function renderAiThumbs() {
  const thumbsRow = document.getElementById('ai-thumbs-row');
  const counter = document.getElementById('ai-thumb-counter');
  const placeholder = document.getElementById('ai-dropzone-placeholder');
  const singlePreview = document.getElementById('ai-preview-img');
  const analyzeButton = document.getElementById('btn-ai-analyze');

  if (!thumbsRow || !counter || !placeholder || !singlePreview || !analyzeButton) {
    return;
  }

  if (!aiPendingFiles.length) {
    thumbsRow.innerHTML = '';
    thumbsRow.style.display = 'none';
    counter.style.display = 'none';
    singlePreview.style.display = 'none';
    singlePreview.src = '';
    placeholder.style.display = 'block';
    analyzeButton.style.display = 'none';
    return;
  }

  placeholder.style.display = 'none';
  analyzeButton.style.display = 'block';

  const onlyFile = aiPendingFiles[0];
  const showSingleImage = aiPendingFiles.length === 1 && !onlyFile.isPdf;

  if (showSingleImage) {
    singlePreview.src = onlyFile.dataUrl;
    singlePreview.alt = onlyFile.name || 'Bildvorschau';
    singlePreview.style.display = 'block';
    thumbsRow.style.display = 'none';
    thumbsRow.innerHTML = '';
  } else {
    singlePreview.src = '';
    singlePreview.style.display = 'none';
    thumbsRow.style.display = 'flex';
    thumbsRow.innerHTML = '';

    aiPendingFiles.forEach((file, index) => {
      thumbsRow.appendChild(createAiFilePreview(file, index));
    });

    if (aiPendingFiles.length < AI_MAX_FILES) {
      const addTile = document.createElement('div');
      addTile.className = 'ai-thumb-item';
      addTile.style.cssText =
        'display:flex;align-items:center;justify-content:center;' +
        'background:#f1f5f9;cursor:pointer;border:2px dashed #cbd5e1;';

      const addIcon = document.createElement('i');
      addIcon.className = 'fa-solid fa-plus';
      addIcon.style.cssText = 'color:#94a3b8;font-size:20px;';
      addTile.appendChild(addIcon);

      addTile.onclick = event => {
        event.stopPropagation();
        triggerAiGallery();
      };

      thumbsRow.appendChild(addTile);
    }
  }

  counter.style.display = 'block';
  counter.textContent =
    `${aiPendingFiles.length} / ${AI_MAX_FILES} Dateien ausgewählt`;
}

function removeAiFile(index) {
  aiPendingFiles.splice(index, 1);
  renderAiThumbs();

  if (!aiPendingFiles.length) {
    showToast('Alle Dateien entfernt.', 'info');
  }
}

// Backwards compatibility
function removeAiPhoto(index) {
  removeAiFile(index);
}

// ── AI Analysis ────────────────────────────────────────────────────────────
function getAiScanPrompt() {
  return `Du bist ein intelligenter Stundenzettel-Parser für ein deutsches Bauunternehmen.

Analysiere das bereitgestellte Bild oder PDF und extrahiere alle Arbeitseinträge.
Ein PDF kann mehrere Seiten und mehrere Einträge enthalten.

Für jeden Eintrag gib zurück:
- date: Datum im Format DD/MM/YYYY
- project: Baustelle oder Kundenname
- startTime: Startzeit im Format HH:MM
- endTime: Endzeit im Format HH:MM
- breakTime: Pause in Minuten als Zahl
- notes: Notizen oder Tätigkeiten, sonst leer
- confidence: "high", "medium" oder "low"

Antworte ausschließlich mit einem gültigen JSON-Array.
Kein Markdown und kein erklärender Text.
Wenn keine Einträge erkannt werden, antworte mit [].

Heute ist: ${new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })}.`;
}

async function runAiAnalysis() {
  const apiKey = getAiApiKey();

  if (!apiKey) {
    showToast('Bitte zuerst einen Gemini API Key eingeben.', 'error');
    document.getElementById('ai-api-key-input')?.focus();
    return;
  }

  if (!aiPendingFiles.length) {
    showToast('Bitte zuerst Fotos oder PDFs auswählen.', 'error');
    return;
  }

  showAiScanningOverlay(true, 0, aiPendingFiles.length);

  const prompt = getAiScanPrompt();
  const allEntries = [];
  let errors = 0;

  for (let index = 0; index < aiPendingFiles.length; index++) {
    const file = aiPendingFiles[index];
    showAiScanningOverlay(true, index + 1, aiPendingFiles.length);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: file.isPdf ? 'application/pdf' : file.mime,
                    data: file.base64
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData?.error?.message || `HTTP ${response.status}`;

        if (
          errorMessage.includes('API_KEY_INVALID') ||
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem(AI_KEY_STORAGE);
          showAiScanningOverlay(false);
          showToast('Ungültiger API Key. Bitte neu eingeben.', 'error');
          return;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const rawText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      if (Array.isArray(parsed)) {
        parsed.forEach(entry => {
          if (entry && typeof entry === 'object') {
            allEntries.push({
              ...entry,
              _sourceFile: file.name
            });
          }
        });
      }
    } catch (error) {
      console.error(`AI scan failed for ${file.name}:`, error);
      errors++;
    }
  }

  showAiScanningOverlay(false);

  if (!allEntries.length) {
    const message = errors
      ? `KI konnte keine Einträge erkennen. ${errors} Datei(en) verursachten einen Fehler.`
      : 'KI konnte keine Einträge erkennen. Bitte prüfe die Dateiqualität.';

    showToast(message, 'error');
    return;
  }

  if (errors) {
    showToast(
      `⚠ ${errors} Datei(en) konnten nicht analysiert werden.`,
      'info'
    );
  }

  aiReviewEntries = allEntries.map((entry, index) => ({
    date: normaliseAiDate(entry.date || ''),
    project: String(entry.project || ''),
    startTime: normaliseAiTime(entry.startTime || ''),
    endTime: normaliseAiTime(entry.endTime || ''),
    breakTime: Math.max(0, Number(entry.breakTime) || 0),
    notes: String(entry.notes || ''),
    confidence: ['high', 'medium', 'low'].includes(entry.confidence)
      ? entry.confidence
      : 'low',
    _sourceFile: entry._sourceFile || '',
    _id: `ai-${Date.now()}-${index}`,
    _included: true
  }));

  renderAiReviewStep();
}

// ── Scanning Overlay ───────────────────────────────────────────────────────
function showAiScanningOverlay(show, current = 0, total = 1) {
  let overlay = document.getElementById('ai-scanning-overlay');

  if (!show) {
    overlay?.remove();
    return;
  }

  const progressText = total > 1
    ? `Datei ${current} von ${total}`
    : 'Gemini liest deine Datei';

  const percentage = total > 0
    ? Math.round((current / total) * 100)
    : 0;

  if (overlay) {
    const subtitle = overlay.querySelector('.ai-overlay-sub');
    const bar = overlay.querySelector('.ai-overlay-bar');

    if (subtitle) subtitle.textContent = progressText;
    if (bar) bar.style.width = `${percentage}%`;
    return;
  }

  overlay = document.createElement('div');
  overlay.id = 'ai-scanning-overlay';
  overlay.className = 'ai-scanning-overlay';
  overlay.innerHTML = `
    <div class="ai-scanning-spinner"></div>
    <div style="text-align:center;">
      <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:6px;">
        KI analysiert Stundenzettel…
      </div>
      <div class="ai-overlay-sub" style="font-size:13px;color:#64748b;">
        ${progressText}
      </div>
    </div>
    <div style="width:200px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
      <div class="ai-overlay-bar" style="height:100%;width:${percentage}%;background:#E30613;border-radius:2px;transition:width 0.3s;"></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:8px;">
      ${['Datum', 'Baustelle', 'Zeiten', 'Pausen'].map(label =>
        `<span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);padding:4px 10px;border-radius:99px;font-size:11px;color:#94a3b8;font-weight:600;">${label}</span>`
      ).join('')}
    </div>`;

  document.body.appendChild(overlay);
}

// ── Review Screen ──────────────────────────────────────────────────────────
function safeAiValue(value) {
  return typeof sanitizeHTML === 'function'
    ? sanitizeHTML(String(value ?? ''))
    : String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]);
}

function renderAiReviewStep() {
  const uploadStep = document.getElementById('ai-step-upload');
  const reviewStep = document.getElementById('ai-step-review');
  const summary = document.getElementById('ai-review-summary');
  const container = document.getElementById('ai-review-entries');

  if (!uploadStep || !reviewStep || !summary || !container) return;

  uploadStep.style.display = 'none';
  reviewStep.style.display = 'block';

  const count = aiReviewEntries.length;
  const fileCount = aiPendingFiles.length;

  summary.textContent =
    `${count} Eintrag${count !== 1 ? 'e' : ''} aus ` +
    `${fileCount} Datei${fileCount !== 1 ? 'en' : ''} erkannt – ` +
    'bitte alle Angaben prüfen';

  container.innerHTML = '';

  aiReviewEntries.forEach((entry, index) => {
    const confidenceClass =
      entry.confidence === 'high'
        ? 'ai-confidence-high'
        : entry.confidence === 'medium'
          ? 'ai-confidence-medium'
          : 'ai-confidence-low';

    const confidenceLabel =
      entry.confidence === 'high'
        ? 'Sicher'
        : entry.confidence === 'medium'
          ? 'Unsicher'
          : 'Prüfen!';

    const card = document.createElement('div');
    card.className = 'ai-review-card';
    card.id = `ai-card-${index}`;

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <div style="width:28px;height:28px;background:linear-gradient(135deg,#E30613,#b8000f);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;">
            ${index + 1}
          </div>
          <span style="font-size:13px;font-weight:700;color:var(--dark-slate);">
            Eintrag ${index + 1}
          </span>
          <span class="ai-confidence-badge ${confidenceClass}">
            <i class="fa-solid fa-${entry.confidence === 'high' ? 'check' : 'triangle-exclamation'}" style="font-size:9px;"></i>
            ${confidenceLabel}
          </span>
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-muted);">
          <input type="checkbox" id="ai-include-${index}" ${entry._included ? 'checked' : ''}
            onchange="toggleAiEntry(${index})"
            style="width:16px;height:16px;accent-color:#E30613;cursor:pointer;">
          Hinzufügen
        </label>
      </div>

      ${entry._sourceFile ? `
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;">
          <i class="fa-solid ${/\.pdf$/i.test(entry._sourceFile) ? 'fa-file-pdf' : 'fa-image'}" style="margin-right:4px;"></i>
          ${safeAiValue(entry._sourceFile)}
        </div>` : ''}

      <div class="ai-field-row">
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Datum</label>
          <input type="text" id="ai-date-${index}"
            value="${safeAiValue(entry.date)}"
            placeholder="DD/MM/YYYY"
            oninput="updateAiEntry(${index},'date',this.value)"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;">
        </div>
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Pause (min)</label>
          <input type="number" id="ai-break-${index}"
            value="${safeAiValue(entry.breakTime)}"
            min="0" max="720" step="5"
            oninput="updateAiEntry(${index},'breakTime',parseInt(this.value,10)||0)"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;">
        </div>
      </div>

      <div class="ai-field-row single">
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Baustelle / Kunde</label>
          <input type="text" id="ai-project-${index}"
            value="${safeAiValue(entry.project)}"
            placeholder="Baustelle oder Kundenname"
            oninput="updateAiEntry(${index},'project',this.value)"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;">
        </div>
      </div>

      <div class="ai-field-row">
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Kommen</label>
          <input type="text" id="ai-start-${index}"
            value="${safeAiValue(entry.startTime)}"
            placeholder="07:00"
            oninput="updateAiEntry(${index},'startTime',this.value)"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;">
        </div>
        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Gehen</label>
          <input type="text" id="ai-end-${index}"
            value="${safeAiValue(entry.endTime)}"
            placeholder="16:15"
            oninput="updateAiEntry(${index},'endTime',this.value)"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-weight:600;">
        </div>
      </div>

      <div class="ai-field-row single">
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;display:block;">Notizen (optional)</label>
          <input type="text" id="ai-notes-${index}"
            value="${safeAiValue(entry.notes)}"
            placeholder="Tätigkeiten..."
            oninput="updateAiEntry(${index},'notes',this.value)"
            style="width:100%;padding:9px 12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;">
        </div>
      </div>

      <div id="ai-duration-preview-${index}"
        style="margin-top:10px;padding:8px 12px;background:#f1f5f9;border-radius:8px;font-size:12px;font-weight:700;color:#475569;text-align:center;">
      </div>`;

    container.appendChild(card);
    updateAiDurationPreview(index);
  });
}

function toggleAiEntry(index) {
  const entry = aiReviewEntries[index];
  const checkbox = document.getElementById(`ai-include-${index}`);
  const card = document.getElementById(`ai-card-${index}`);

  if (!entry || !checkbox) return;

  entry._included = checkbox.checked;
  if (card) card.style.opacity = entry._included ? '1' : '0.45';
}

function updateAiEntry(index, field, value) {
  if (!aiReviewEntries[index]) return;

  aiReviewEntries[index][field] = value;
  updateAiDurationPreview(index);
}

function parseAiTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  };
}

function normaliseAiTime(value) {
  const parsed = parseAiTime(
    String(value || '').trim().replace('.', ':')
  );

  return parsed ? parsed.formatted : String(value || '').trim();
}

function updateAiDurationPreview(index) {
  const preview = document.getElementById(`ai-duration-preview-${index}`);
  const entry = aiReviewEntries[index];

  if (!preview || !entry) return;

  const start = parseAiTime(entry.startTime);
  const end = parseAiTime(entry.endTime);

  if (!start || !end) {
    preview.style.color = '#ef4444';
    preview.textContent = '⚠ Bitte gültige Zeiten im Format HH:MM eingeben';
    return;
  }

  const grossMinutes = end.totalMinutes - start.totalMinutes;
  const breakMinutes = Math.max(0, Number(entry.breakTime) || 0);
  const netMinutes = grossMinutes - breakMinutes;

  if (grossMinutes <= 0) {
    preview.style.color = '#ef4444';
    preview.textContent = '⚠ Endzeit muss nach Startzeit liegen';
    return;
  }

  if (netMinutes <= 0) {
    preview.style.color = '#ef4444';
    preview.textContent = '⚠ Pause ist länger als die Arbeitszeit';
    return;
  }

  preview.style.color = '#10b981';
  preview.textContent =
    `⏱ Brutto: ${(grossMinutes / 60).toFixed(2)} h | ` +
    `Netto: ${(netMinutes / 60).toFixed(2)} h ` +
    `(${breakMinutes} min Pause)`;
}

// ── Date Validation ────────────────────────────────────────────────────────
function normaliseAiDate(rawValue) {
  const raw = String(rawValue || '').trim();

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${String(isoMatch[3]).padStart(2, '0')}/${String(isoMatch[2]).padStart(2, '0')}/${isoMatch[1]}`;
  }

  const dmyMatch = raw.match(
    /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/
  );

  if (dmyMatch) {
    return `${String(dmyMatch[1]).padStart(2, '0')}/${String(dmyMatch[2]).padStart(2, '0')}/${dmyMatch[3]}`;
  }

  return raw;
}

function isValidAiDate(dateValue) {
  const match = String(dateValue || '').match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// ── Duplicate and Overlap Detection ────────────────────────────────────────
function findAiDuplicateOrOverlap(date, startTime, endTime) {
  const start = parseAiTime(startTime);
  const end = parseAiTime(endTime);

  if (!start || !end) return null;

  const entries = globalLoggedSessionsDatabaseMock || [];

  for (const record of entries) {
    if (
      record.type !== 'work' ||
      record.date !== date ||
      !record.startTime ||
      !record.endTime
    ) {
      continue;
    }

    const recordStart = parseAiTime(record.startTime);
    const recordEnd = parseAiTime(record.endTime);

    if (!recordStart || !recordEnd) continue;

    const exactDuplicate =
      start.totalMinutes === recordStart.totalMinutes &&
      end.totalMinutes === recordEnd.totalMinutes;

    if (exactDuplicate) {
      return { type: 'duplicate', record };
    }

    const overlaps =
      start.totalMinutes < recordEnd.totalMinutes &&
      end.totalMinutes > recordStart.totalMinutes;

    if (overlaps) {
      return { type: 'overlap', record };
    }
  }

  return null;
}

// ── Confirm & Save ─────────────────────────────────────────────────────────
function confirmAiEntries() {
  const selectedEntries = aiReviewEntries.filter(entry => entry._included);

  if (!selectedEntries.length) {
    showToast('Keine Einträge zum Hinzufügen ausgewählt.', 'error');
    return;
  }

  let added = 0;
  let duplicates = 0;
  let overlaps = 0;
  let errors = 0;

  selectedEntries.forEach(entry => {
    const formattedDate = normaliseAiDate(entry.date);
    const start = parseAiTime(entry.startTime);
    const end = parseAiTime(entry.endTime);
    const project = String(entry.project || '').trim();
    const breakTime = Math.max(0, Number(entry.breakTime) || 0);

    if (
      !isValidAiDate(formattedDate) ||
      !start ||
      !end ||
      !project
    ) {
      errors++;
      return;
    }

    const grossMinutes = end.totalMinutes - start.totalMinutes;

    if (grossMinutes <= 0 || breakTime >= grossMinutes) {
      errors++;
      return;
    }

    const conflict = findAiDuplicateOrOverlap(
      formattedDate,
      start.formatted,
      end.formatted
    );

    if (conflict?.type === 'duplicate') {
      duplicates++;
      return;
    }

    if (conflict?.type === 'overlap') {
      overlaps++;
      return;
    }

    globalLoggedSessionsDatabaseMock.unshift({
      id:
        `work-ai-${Date.now()}-` +
        Math.random().toString(36).slice(2, 8),
      type: 'work',
      date: formattedDate,
      startTime: start.formatted,
      endTime: end.formatted,
      project,
      duration: grossMinutes / 60,
      breakTime,
      notes: String(entry.notes || '').trim()
    });

    added++;
  });

  if (added > 0) {
    persistUserData();
    renderHistoricalRecordsSheet();
    runGlobalApplicationMetricsEngine();
  }

  const messages = [];

  if (added) {
    messages.push(
      `${added} Eintrag${added !== 1 ? 'e' : ''} hinzugefügt`
    );
  }

  if (duplicates) {
    messages.push(
      `${duplicates} Duplikat${duplicates !== 1 ? 'e' : ''} übersprungen`
    );
  }

  if (overlaps) {
    messages.push(
      `${overlaps} Überschneidung${overlaps !== 1 ? 'en' : ''} übersprungen`
    );
  }

  if (errors) {
    messages.push(`${errors} ungültige Einträge`);
  }

  showToast(
    `${added ? '✓ ' : '⚠ '}${messages.join(' · ')}`,
    added > 0 ? 'success' : 'error'
  );

  if (added > 0) {
    if (typeof triggerSaveHaptic === 'function') {
      triggerSaveHaptic();
    }

    setTimeout(() => {
      switchActiveView(
        'history',
        document.querySelector(
          '[onclick*="switchActiveView(\'history\'"]'
        )
      );
      resetAiScan();
    }, 800);
  }
}

// ── Reset ──────────────────────────────────────────────────────────────────
function resetAiScan() {
  aiPendingFiles = [];
  aiReviewEntries = [];

  renderAiThumbs();

  const fileInput = document.getElementById('ai-file-input');
  if (fileInput) {
    fileInput.value = '';
    fileInput.removeAttribute('capture');
    fileInput.setAttribute('accept', AI_ACCEPTED_TYPES);
  }

  const uploadStep = document.getElementById('ai-step-upload');
  const reviewStep = document.getElementById('ai-step-review');
  const reviewEntries = document.getElementById('ai-review-entries');

  if (uploadStep) uploadStep.style.display = 'block';
  if (reviewStep) reviewStep.style.display = 'none';
  if (reviewEntries) reviewEntries.innerHTML = '';
}
