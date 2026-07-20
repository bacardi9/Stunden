const AI_KEY_STORAGE = 'sch_gemini_key';
const AI_MAX_FILES = 10;
const AI_MAX_FILE_SIZE = 10 * 1024 * 1024;
const AI_ACCEPTED_TYPES = 'image/*,application/pdf';
const PDF_RESTORE_MAX_SIZE = 25 * 1024 * 1024;
const PDF_JS_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_WORKER_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let aiPendingFiles = [];
let aiReviewEntries = [];
let aiReviewSourceCount = 0;
let pdfJsLoadPromise = null;

// ── Setup ─────────────────────────────────────────────────────────────────
function configureAiFileInput() {
  const input = document.getElementById('ai-file-input');
  if (!input) return;

  input.accept = AI_ACCEPTED_TYPES;
  input.multiple = true;
}

function initAiKeyUI() {
  configureAiFileInput();
  injectPdfRestoreOption();

  const key = getAiApiKey();
  const keyCard = document.getElementById('ai-api-key-card');
  const keyInput = document.getElementById('ai-api-key-input');
  const keyStatus = document.getElementById('ai-key-status');

  if (key && keyCard && keyInput) {
    keyInput.value = '••••••••••••••••••••••';
    keyCard.style.borderLeftColor = '#10b981';

    if (keyStatus) {
      keyStatus.style.color = '#10b981';
      keyStatus.textContent = '✓ API Key vorhanden';
    }
  }

  const placeholder = document.getElementById('ai-dropzone-placeholder');

  if (placeholder) {
    const title = placeholder.querySelector('div[style*="font-size:14px"]');
    const description = placeholder.querySelector(
      'div[style*="font-size:12px"]'
    );

    if (title) {
      title.textContent = 'Fotos oder PDFs hierher ziehen oder tippen';
    }

    if (description) {
      description.textContent =
        'JPG, PNG, HEIC oder PDF · max. 10 MB · bis zu 10 Dateien';
    }
  }
}

function injectPdfRestoreOption() {
  const uploadStep = document.getElementById('ai-step-upload');

  if (!uploadStep || document.getElementById('pdf-restore-card')) return;

  const card = document.createElement('div');
  card.id = 'pdf-restore-card';
  card.className = 'app-card';
  card.style.borderLeft = '4px solid #10b981';

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      <div style="width:42px;height:42px;border-radius:12px;background:rgba(16,185,129,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fa-solid fa-file-arrow-up" style="color:#10b981;font-size:18px;"></i>
      </div>
      <div>
        <div style="font-size:14px;font-weight:800;color:var(--text-main);">
          PDF-Daten wiederherstellen
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
          Importiert exportierte PDFs dieser Website – ohne KI
        </div>
      </div>
    </div>

    <p style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:12px;">
      Datum, Baustelle, Arbeitszeiten und Pausen werden lokal aus deinen
      alten Arbeitsbericht-PDFs gelesen. Die Dateien werden nicht hochgeladen.
    </p>

    <input
      type="file"
      id="pdf-restore-input"
      accept="application/pdf,.pdf"
      multiple
      style="display:none;"
      onchange="handlePdfRestoreSelect(event)"
    >

    <button
      type="button"
      class="primary-btn"
      style="background:linear-gradient(135deg,#10b981,#059669)!important;box-shadow:0 4px 16px rgba(16,185,129,0.25)!important;"
      onclick="triggerPdfRestore()"
    >
      <i class="fa-solid fa-file-pdf" style="margin-right:8px;"></i>
      Export-PDFs auswählen
    </button>

    <div
      id="pdf-restore-status"
      style="display:none;margin-top:10px;font-size:11px;font-weight:600;color:var(--text-muted);"
    ></div>
  `;

  const apiKeyCard = document.getElementById('ai-api-key-card');

  if (apiKeyCard && apiKeyCard.parentNode === uploadStep) {
    uploadStep.insertBefore(card, apiKeyCard);
  } else {
    uploadStep.appendChild(card);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAiKeyUI);
} else {
  setTimeout(initAiKeyUI, 0);
}

// ── Gemini key ─────────────────────────────────────────────────────────────
function saveAiApiKey() {
  const input = document.getElementById('ai-api-key-input');
  const status = document.getElementById('ai-key-status');
  const value = input?.value.trim() || '';

  if (!value.startsWith('AIza')) {
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

// ── Standard image/PDF selection ──────────────────────────────────────────
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
      message: `"${file.name}" wird nicht unterstützt.`
    };
  }

  if (!file.size) {
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

function handleAiFileSelect(event) {
  const input = document.getElementById('ai-file-input');
  const files = Array.from(event?.target?.files || []);

  if (input) {
    input.removeAttribute('capture');
    input.accept = AI_ACCEPTED_TYPES;
  }

  if (!files.length) return;

  const remaining = AI_MAX_FILES - aiPendingFiles.length;

  if (remaining <= 0) {
    showToast(`Maximal ${AI_MAX_FILES} Dateien erlaubt.`, 'error');
    if (input) input.value = '';
    return;
  }

  const selectedFiles = files.slice(0, remaining);
  let completed = 0;

  if (files.length > remaining) {
    showToast(
      `Nur ${remaining} weitere Datei(en) hinzugefügt.`,
      'info'
    );
  }

  selectedFiles.forEach(file => {
    const validation = validateAiFile(file);

    if (!validation.valid) {
      completed++;
      showToast(validation.message, 'error');

      if (completed === selectedFiles.length) renderAiThumbs();
      return;
    }

    const reader = new FileReader();

    reader.onload = loadEvent => {
      const dataUrl = String(loadEvent.target?.result || '');
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

  document.getElementById('ai-dropzone')?.classList.remove('dragover');

  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length) handleAiFileSelect({ target: { files } });
}

function triggerAiGallery() {
  const input = document.getElementById('ai-file-input');
  if (!input) return;

  input.removeAttribute('capture');
  input.accept = AI_ACCEPTED_TYPES;
  input.click();
}

function triggerAiCamera() {
  const input = document.getElementById('ai-file-input');
  if (!input) return;

  input.accept = 'image/*';
  input.setAttribute('capture', 'environment');
  input.click();
}

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
    icon.style.cssText =
      'font-size:25px;color:#dc2626;margin-bottom:4px;';

    const name = document.createElement('span');
    name.textContent = file.name;
    name.title = file.name;
    name.style.cssText =
      'display:block;width:100%;font-size:8px;font-weight:700;' +
      'color:#991b1b;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;';

    item.append(icon, name);
  } else {
    const image = document.createElement('img');
    image.src = file.dataUrl;
    image.alt = file.name || `Foto ${index + 1}`;
    item.appendChild(image);
  }

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'thumb-remove';
  removeButton.title = 'Entfernen';
  removeButton.textContent = '×';

  removeButton.onclick = clickEvent => {
    clickEvent.stopPropagation();
    removeAiFile(index);
  };

  item.appendChild(removeButton);
  return item;
}

function renderAiThumbs() {
  const row = document.getElementById('ai-thumbs-row');
  const counter = document.getElementById('ai-thumb-counter');
  const placeholder = document.getElementById('ai-dropzone-placeholder');
  const preview = document.getElementById('ai-preview-img');
  const analyzeButton = document.getElementById('btn-ai-analyze');

  if (!row || !counter || !placeholder || !preview || !analyzeButton) {
    return;
  }

  if (!aiPendingFiles.length) {
    row.innerHTML = '';
    row.style.display = 'none';
    counter.style.display = 'none';
    preview.style.display = 'none';
    preview.src = '';
    placeholder.style.display = 'block';
    analyzeButton.style.display = 'none';
    return;
  }

  placeholder.style.display = 'none';
  analyzeButton.style.display = 'block';

  const singleImage =
    aiPendingFiles.length === 1 && !aiPendingFiles[0].isPdf;

  if (singleImage) {
    preview.src = aiPendingFiles[0].dataUrl;
    preview.alt = aiPendingFiles[0].name;
    preview.style.display = 'block';
    row.style.display = 'none';
    row.innerHTML = '';
  } else {
    preview.src = '';
    preview.style.display = 'none';
    row.style.display = 'flex';
    row.innerHTML = '';

    aiPendingFiles.forEach((file, index) => {
      row.appendChild(createAiFilePreview(file, index));
    });

    if (aiPendingFiles.length < AI_MAX_FILES) {
      const add = document.createElement('div');
      add.className = 'ai-thumb-item';
      add.style.cssText =
        'display:flex;align-items:center;justify-content:center;' +
        'background:#f1f5f9;cursor:pointer;border:2px dashed #cbd5e1;';
      add.innerHTML =
        '<i class="fa-solid fa-plus" style="color:#94a3b8;font-size:20px;"></i>';

      add.onclick = clickEvent => {
        clickEvent.stopPropagation();
        triggerAiGallery();
      };

      row.appendChild(add);
    }
  }

  counter.style.display = 'block';
  counter.textContent =
    `${aiPendingFiles.length} / ${AI_MAX_FILES} Dateien ausgewählt`;
}

function removeAiFile(index) {
  aiPendingFiles.splice(index, 1);
  renderAiThumbs();
}

function removeAiPhoto(index) {
  removeAiFile(index);
}

// ── Local PDF restoration ─────────────────────────────────────────────────
function triggerPdfRestore() {
  document.getElementById('pdf-restore-input')?.click();
}

function setPdfRestoreStatus(message, color = 'var(--text-muted)') {
  const status = document.getElementById('pdf-restore-status');
  if (!status) return;

  status.style.display = message ? 'block' : 'none';
  status.style.color = color;
  status.textContent = message;
}

function loadPdfJsLibrary() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    return Promise.resolve(window.pdfjsLib);
  }

  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDF_JS_URL;
    script.async = true;

    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error('PDF.js wurde nicht geladen.'));
        return;
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      resolve(window.pdfjsLib);
    };

    script.onerror = () => {
      reject(new Error('PDF.js konnte nicht geladen werden.'));
    };

    document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
}

async function handlePdfRestoreSelect(event) {
  const input = event?.target;
  const files = Array.from(input?.files || []);

  if (input) input.value = '';
  if (!files.length) return;

  const invalid = files.find(file => !isPdfFile(file));

  if (invalid) {
    showToast('Bitte nur PDF-Dateien auswählen.', 'error');
    return;
  }

  const tooLarge = files.find(file => file.size > PDF_RESTORE_MAX_SIZE);

  if (tooLarge) {
    showToast(
      `"${tooLarge.name}" ist größer als 25 MB.`,
      'error'
    );
    return;
  }

  showPdfRestoreOverlay(true, 0, files.length);
  setPdfRestoreStatus('PDF-Modul wird geladen…');

  const allEntries = [];
  let failed = 0;

  try {
    const pdfjs = await loadPdfJsLibrary();

    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      showPdfRestoreOverlay(true, index + 1, files.length, file.name);
      setPdfRestoreStatus(
        `Lese ${index + 1} von ${files.length}: ${file.name}`
      );

      try {
        const entries = await extractWorkLogsFromExportPdf(file, pdfjs);
        allEntries.push(...entries);
      } catch (error) {
        console.error(`PDF import failed for ${file.name}:`, error);
        failed++;
      }
    }
  } catch (error) {
    console.error('PDF.js load failed:', error);
    showPdfRestoreOverlay(false);
    setPdfRestoreStatus('PDF-Modul konnte nicht geladen werden.', '#ef4444');
    showToast('PDF-Leser konnte nicht geladen werden.', 'error');
    return;
  }

  showPdfRestoreOverlay(false);

  const uniqueEntries = removeDuplicateParsedPdfEntries(allEntries);

  if (!uniqueEntries.length) {
    setPdfRestoreStatus(
      'Keine Arbeitszeilen erkannt. Bitte nur PDFs verwenden, die von dieser Website exportiert wurden.',
      '#ef4444'
    );

    showToast(
      failed
        ? `${failed} PDF-Datei(en) konnten nicht gelesen werden.`
        : 'Keine Arbeitszeiten im PDF erkannt.',
      'error'
    );
    return;
  }

  aiPendingFiles = [];
  aiReviewSourceCount = files.length;

  aiReviewEntries = uniqueEntries.map((entry, index) => ({
    date: entry.date,
    project: entry.project,
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakTime: entry.breakTime,
    notes: entry.notes || 'Aus PDF wiederhergestellt',
    confidence: entry.confidence || 'high',
    _sourceFile: entry._sourceFile,
    _id: `pdf-${Date.now()}-${index}`,
    _included: true
  }));

  setPdfRestoreStatus(
    `✓ ${uniqueEntries.length} Arbeitseinträge erkannt`,
    '#10b981'
  );

  if (failed) {
    showToast(
      `${failed} PDF-Datei(en) konnten nicht vollständig gelesen werden.`,
      'info'
    );
  }

  renderAiReviewStep('PDF-Wiederherstellung abgeschlossen');
}

async function extractWorkLogsFromExportPdf(file, pdfjs) {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const entries = [];

  let activeDate = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = groupPdfTextItemsIntoLines(content.items);

    for (const line of lines) {
      const lineText = line.items
        .map(item => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const detectedDate = parseExportPdfDate(lineText);

      if (detectedDate) {
        activeDate = detectedDate;
        continue;
      }

      if (!activeDate) continue;

      const entry = parseExportPdfWorkRow(
        line.items,
        lineText,
        activeDate,
        file.name
      );

      if (entry) entries.push(entry);
    }
  }

  return entries;
}

function groupPdfTextItemsIntoLines(items) {
  const lines = [];

  items.forEach(rawItem => {
    const text = String(rawItem.str || '').trim();
    if (!text) return;

    const x = Number(rawItem.transform?.[4]) || 0;
    const y = Number(rawItem.transform?.[5]) || 0;

    let line = lines.find(existing => Math.abs(existing.y - y) <= 2);

    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }

    line.items.push({ text, x, y });
  });

  lines.forEach(line => {
    line.items.sort((a, b) => a.x - b.x);
  });

  return lines.sort((a, b) => b.y - a.y);
}

function parseExportPdfDate(text) {
  const months = {
    januar: 1,
    februar: 2,
    märz: 3,
    maerz: 3,
    april: 4,
    mai: 5,
    juni: 6,
    juli: 7,
    august: 8,
    september: 9,
    oktober: 10,
    november: 11,
    dezember: 12
  };

  const normalized = String(text || '')
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const namedDate = normalized.match(
    /(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)?\s*(\d{1,2})\.\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\s+(\d{4})/
  );

  if (namedDate) {
    const day = Number(namedDate[1]);
    const month = months[namedDate[2]];
    const year = Number(namedDate[3]);

    return formatValidatedPdfDate(day, month, year);
  }

  const numericDate = normalized.match(
    /(?:^|\s)(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s|$)/
  );

  if (numericDate) {
    return formatValidatedPdfDate(
      Number(numericDate[1]),
      Number(numericDate[2]),
      Number(numericDate[3])
    );
  }

  return '';
}

function formatValidatedPdfDate(day, month, year) {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return (
    `${String(day).padStart(2, '0')}/` +
    `${String(month).padStart(2, '0')}/` +
    `${year}`
  );
}

function parseExportPdfWorkRow(items, lineText, date, sourceFile) {
  if (
    /tagesarbeit|gesamtarbeitszeit|arbeitsstunden|ausstellungsdatum/i.test(
      lineText
    )
  ) {
    return null;
  }

  const timePattern =
    /(\d{1,2}:\d{2})\s*(?:–|—|-)\s*(\d{1,2}:\d{2})/;

  let timeIndex = items.findIndex(item => timePattern.test(item.text));
  let timeMatch =
    timeIndex >= 0 ? items[timeIndex].text.match(timePattern) : null;

  if (!timeMatch) {
    timeMatch = lineText.match(timePattern);
  }

  if (!timeMatch) return null;

  const startTime = normaliseAiTime(timeMatch[1]);
  const endTime = normaliseAiTime(timeMatch[2]);
  const start = parseAiTime(startTime);
  const end = parseAiTime(endTime);

  if (!start || !end || end.totalMinutes <= start.totalMinutes) {
    return null;
  }

  let durationIndex = -1;
  let netHours = null;

  for (let index = items.length - 1; index >= 0; index--) {
    const durationMatch = items[index].text.match(
      /^(-?\d+(?:[.,]\d+)?)\s*(?:h|hrs|std\.?)$/i
    );

    if (durationMatch) {
      durationIndex = index;
      netHours = Number(durationMatch[1].replace(',', '.'));
      break;
    }
  }

  if (netHours === null) {
    const durationMatches = [
      ...lineText.matchAll(/(-?\d+(?:[.,]\d+)?)\s*(?:h|hrs|std\.?)/gi)
    ];

    if (durationMatches.length) {
      netHours = Number(
        durationMatches.at(-1)[1].replace(',', '.')
      );
    }
  }

  if (!Number.isFinite(netHours) || netHours <= 0) return null;

  let projectParts = [];

  if (timeIndex >= 0 && durationIndex > timeIndex) {
    projectParts = items
      .slice(timeIndex + 1, durationIndex)
      .map(item => item.text);
  } else {
    let remainder = lineText.replace(timePattern, ' ');

    remainder = remainder.replace(
      /-?\d+(?:[.,]\d+)?\s*(?:h|hrs|std\.?).*$/i,
      ''
    );

    projectParts = [remainder];
  }

  const project = projectParts
    .join(' ')
    .replace(/\bArbeitszeit\b/gi, ' ')
    .replace(/\bDauer\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[–—|\s]+|[–—|\s]+$/g, '')
    .trim();

  if (
    !project ||
    /berufsschule|schultag/i.test(project) ||
    /^(zeit|projekt|baustelle)$/i.test(project)
  ) {
    return null;
  }

  const grossMinutes = end.totalMinutes - start.totalMinutes;
  const netMinutes = Math.round(netHours * 60);
  let breakTime = grossMinutes - netMinutes;

  if (breakTime < 0 || breakTime >= grossMinutes) {
    breakTime = 0;
  }

  if (breakTime <= 2) {
    breakTime = 0;
  } else {
    breakTime = Math.round(breakTime / 5) * 5;
  }

  return {
    date,
    project,
    startTime: start.formatted,
    endTime: end.formatted,
    breakTime,
    notes: 'Aus PDF wiederhergestellt',
    confidence: 'high',
    _sourceFile: sourceFile
  };
}

function removeDuplicateParsedPdfEntries(entries) {
  const seen = new Set();

  return entries.filter(entry => {
    const key = [
      entry.date,
      entry.startTime,
      entry.endTime,
      String(entry.project || '').trim().toLowerCase()
    ].join('|');

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function showPdfRestoreOverlay(show, current = 0, total = 1, fileName = '') {
  let overlay = document.getElementById('pdf-restore-overlay');

  if (!show) {
    overlay?.remove();
    return;
  }

  const percentage = total
    ? Math.round((current / total) * 100)
    : 0;

  const progressText = total > 1
    ? `PDF ${current} von ${total}`
    : 'PDF wird gelesen';

  if (overlay) {
    const subtitle = overlay.querySelector('.pdf-restore-overlay-sub');
    const bar = overlay.querySelector('.pdf-restore-overlay-bar');
    const fileLabel = overlay.querySelector('.pdf-restore-overlay-file');

    if (subtitle) subtitle.textContent = progressText;
    if (bar) bar.style.width = `${percentage}%`;
    if (fileLabel) fileLabel.textContent = fileName;
    return;
  }

  overlay = document.createElement('div');
  overlay.id = 'pdf-restore-overlay';
  overlay.className = 'ai-scanning-overlay';

  overlay.innerHTML = `
    <div class="ai-scanning-spinner" style="border-top-color:#10b981;"></div>
    <div style="text-align:center;">
      <div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:6px;">
        PDF-Daten werden wiederhergestellt…
      </div>
      <div class="pdf-restore-overlay-sub" style="font-size:13px;color:#94a3b8;">
        ${progressText}
      </div>
      <div class="pdf-restore-overlay-file" style="font-size:11px;color:#64748b;margin-top:4px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${safeAiValue(fileName)}
      </div>
    </div>
    <div style="width:220px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
      <div class="pdf-restore-overlay-bar" style="height:100%;width:${percentage}%;background:#10b981;border-radius:2px;transition:width 0.3s;"></div>
    </div>
    <div style="font-size:11px;color:#64748b;">
      <i class="fa-solid fa-lock" style="margin-right:5px;color:#10b981;"></i>
      Lokale Verarbeitung – keine KI
    </div>
  `;

  document.body.appendChild(overlay);
}

// ── Gemini analysis ────────────────────────────────────────────────────────
function getAiScanPrompt() {
  return `Analysiere diesen deutschen Stundenzettel und extrahiere alle Arbeitseinträge.

Gib ausschließlich ein gültiges JSON-Array zurück:
[
  {
    "date": "DD/MM/YYYY",
    "project": "Baustelle oder Kunde",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "breakTime": 30,
    "notes": "",
    "confidence": "high"
  }
]

confidence muss "high", "medium" oder "low" sein.
Wenn keine Einträge erkannt werden, antworte mit [].`;
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

  const allEntries = [];
  let errors = 0;

  showAiScanningOverlay(true, 0, aiPendingFiles.length);

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
                { text: getAiScanPrompt() },
                {
                  inline_data: {
                    mime_type: file.isPdf
                      ? 'application/pdf'
                      : file.mime,
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
        throw new Error(
          errorData?.error?.message || `HTTP ${response.status}`
        );
      }

      const data = await response.json();
      const rawText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

      const arrayMatch = rawText.match(/\[[\s\S]*\]/);
      if (!arrayMatch) continue;

      const parsed = JSON.parse(arrayMatch[0]);

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
    showToast(
      errors
        ? `${errors} Datei(en) konnten nicht analysiert werden.`
        : 'Keine Einträge erkannt.',
      'error'
    );
    return;
  }

  aiReviewSourceCount = aiPendingFiles.length;

  aiReviewEntries = allEntries.map((entry, index) => ({
    date: normaliseAiDate(entry.date),
    project: String(entry.project || '').trim(),
    startTime: normaliseAiTime(entry.startTime),
    endTime: normaliseAiTime(entry.endTime),
    breakTime: Math.max(0, Number(entry.breakTime) || 0),
    notes: String(entry.notes || ''),
    confidence: ['high', 'medium', 'low'].includes(entry.confidence)
      ? entry.confidence
      : 'low',
    _sourceFile: entry._sourceFile || '',
    _id: `ai-${Date.now()}-${index}`,
    _included: true
  }));

  renderAiReviewStep('KI-Analyse abgeschlossen');
}

function showAiScanningOverlay(show, current = 0, total = 1) {
  let overlay = document.getElementById('ai-scanning-overlay');

  if (!show) {
    overlay?.remove();
    return;
  }

  const progressText = total > 1
    ? `Datei ${current} von ${total}`
    : 'Gemini liest deine Datei';

  const percentage = total
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
  `;

  document.body.appendChild(overlay);
}

// ── Review UI ──────────────────────────────────────────────────────────────
function safeAiValue(value) {
  if (typeof sanitizeHTML === 'function') {
    return sanitizeHTML(String(value ?? ''));
  }

  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderAiReviewStep(completedTitle = 'Analyse abgeschlossen') {
  const uploadStep = document.getElementById('ai-step-upload');
  const reviewStep = document.getElementById('ai-step-review');
  const summary = document.getElementById('ai-review-summary');
  const container = document.getElementById('ai-review-entries');

  if (!uploadStep || !reviewStep || !summary || !container) return;

  uploadStep.style.display = 'none';
  reviewStep.style.display = 'block';

  const title = reviewStep.querySelector(
    'div[style*="font-size:13px"][style*="font-weight:700"]'
  );

  if (title) title.textContent = completedTitle;

  const count = aiReviewEntries.length;
  const fileCount =
    aiReviewSourceCount || aiPendingFiles.length || 1;

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
          <span style="font-size:13px;font-weight:700;color:var(--text-main);">
            Eintrag ${index + 1}
          </span>
          <span class="ai-confidence-badge ${confidenceClass}">
            <i class="fa-solid fa-${entry.confidence === 'high' ? 'check' : 'triangle-exclamation'}"></i>
            ${confidenceLabel}
          </span>
        </div>

        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-muted);">
          <input
            type="checkbox"
            id="ai-include-${index}"
            ${entry._included ? 'checked' : ''}
            onchange="toggleAiEntry(${index})"
            style="width:16px;height:16px;accent-color:#E30613;"
          >
          Hinzufügen
        </label>
      </div>

      ${entry._sourceFile ? `
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;">
          <i class="fa-solid ${/\.pdf$/i.test(entry._sourceFile) ? 'fa-file-pdf' : 'fa-image'}" style="margin-right:4px;"></i>
          ${safeAiValue(entry._sourceFile)}
        </div>
      ` : ''}

      <div class="ai-field-row">
        <div class="form-group" style="margin-bottom:8px;">
          <label>Datum</label>
          <input
            type="text"
            value="${safeAiValue(entry.date)}"
            placeholder="DD/MM/YYYY"
            oninput="updateAiEntry(${index},'date',this.value)"
          >
        </div>

        <div class="form-group" style="margin-bottom:8px;">
          <label>Pause (min)</label>
          <input
            type="number"
            value="${safeAiValue(entry.breakTime)}"
            min="0"
            max="720"
            step="5"
            oninput="updateAiEntry(${index},'breakTime',parseInt(this.value,10)||0)"
          >
        </div>
      </div>

      <div class="ai-field-row single">
        <div class="form-group" style="margin-bottom:8px;">
          <label>Baustelle / Kunde</label>
          <input
            type="text"
            value="${safeAiValue(entry.project)}"
            placeholder="Baustelle oder Kundenname"
            oninput="updateAiEntry(${index},'project',this.value)"
          >
        </div>
      </div>

      <div class="ai-field-row">
        <div class="form-group" style="margin-bottom:8px;">
          <label>Kommen</label>
          <input
            type="text"
            value="${safeAiValue(entry.startTime)}"
            placeholder="07:00"
            oninput="updateAiEntry(${index},'startTime',this.value)"
          >
        </div>

        <div class="form-group" style="margin-bottom:8px;">
          <label>Gehen</label>
          <input
            type="text"
            value="${safeAiValue(entry.endTime)}"
            placeholder="16:15"
            oninput="updateAiEntry(${index},'endTime',this.value)"
          >
        </div>
      </div>

      <div class="ai-field-row single">
        <div class="form-group" style="margin-bottom:0;">
          <label>Notizen</label>
          <input
            type="text"
            value="${safeAiValue(entry.notes)}"
            placeholder="Tätigkeiten..."
            oninput="updateAiEntry(${index},'notes',this.value)"
          >
        </div>
      </div>

      <div
        id="ai-duration-preview-${index}"
        style="margin-top:10px;padding:8px 12px;background:#f1f5f9;border-radius:8px;font-size:12px;font-weight:700;text-align:center;"
      ></div>
    `;

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

// ── Validation ─────────────────────────────────────────────────────────────
function parseAiTime(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return {
    totalMinutes: hours * 60 + minutes,
    formatted:
      `${String(hours).padStart(2, '0')}:` +
      `${String(minutes).padStart(2, '0')}`
  };
}

function normaliseAiTime(value) {
  const parsed = parseAiTime(
    String(value || '').trim().replace('.', ':')
  );

  return parsed ? parsed.formatted : String(value || '').trim();
}

function normaliseAiDate(value) {
  const raw = String(value || '').trim();

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (iso) {
    return (
      `${String(iso[3]).padStart(2, '0')}/` +
      `${String(iso[2]).padStart(2, '0')}/` +
      `${iso[1]}`
    );
  }

  const dmy = raw.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
  );

  if (dmy) {
    return (
      `${String(dmy[1]).padStart(2, '0')}/` +
      `${String(dmy[2]).padStart(2, '0')}/` +
      `${dmy[3]}`
    );
  }

  return raw;
}

function isValidAiDate(value) {
  const match = String(value || '').match(
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

function updateAiDurationPreview(index) {
  const preview =
    document.getElementById(`ai-duration-preview-${index}`);
  const entry = aiReviewEntries[index];

  if (!preview || !entry) return;

  const start = parseAiTime(entry.startTime);
  const end = parseAiTime(entry.endTime);

  if (!start || !end) {
    preview.style.color = '#ef4444';
    preview.textContent = '⚠ Ungültige Uhrzeit';
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
    `⏱ ${start.formatted} – ${end.formatted} | ` +
    `Netto: ${(netMinutes / 60).toFixed(2)} h ` +
    `(${breakMinutes} min Pause)`;
}

// ── Duplicate and overlap checks ──────────────────────────────────────────
function findAiDuplicateOrOverlap(date, startTime, endTime) {
  const start = parseAiTime(startTime);
  const end = parseAiTime(endTime);

  if (!start || !end) return null;

  for (const record of globalLoggedSessionsDatabaseMock || []) {
    if (
      record.type !== 'work' ||
      record.date !== date ||
      !record.startTime ||
      !record.endTime
    ) {
      continue;
    }

    const existingStart = parseAiTime(record.startTime);
    const existingEnd = parseAiTime(record.endTime);

    if (!existingStart || !existingEnd) continue;

    if (
      start.totalMinutes === existingStart.totalMinutes &&
      end.totalMinutes === existingEnd.totalMinutes
    ) {
      return { type: 'duplicate', record };
    }

    if (
      start.totalMinutes < existingEnd.totalMinutes &&
      end.totalMinutes > existingStart.totalMinutes
    ) {
      return { type: 'overlap', record };
    }
  }

  return null;
}

// ── Confirm and save ───────────────────────────────────────────────────────
function confirmAiEntries() {
  const selected = aiReviewEntries.filter(entry => entry._included);

  if (!selected.length) {
    showToast('Keine Einträge ausgewählt.', 'error');
    return;
  }

  let added = 0;
  let duplicates = 0;
  let overlaps = 0;
  let invalid = 0;

  selected.forEach(entry => {
    const date = normaliseAiDate(entry.date);
    const start = parseAiTime(entry.startTime);
    const end = parseAiTime(entry.endTime);
    const project = String(entry.project || '').trim();
    const breakTime = Math.max(0, Number(entry.breakTime) || 0);

    if (!isValidAiDate(date) || !start || !end || !project) {
      invalid++;
      return;
    }

    const grossMinutes = end.totalMinutes - start.totalMinutes;

    if (grossMinutes <= 0 || breakTime >= grossMinutes) {
      invalid++;
      return;
    }

    const conflict = findAiDuplicateOrOverlap(
      date,
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
        `work-import-${Date.now()}-` +
        Math.random().toString(36).slice(2, 8),
      type: 'work',
      date,
      startTime: start.formatted,
      endTime: end.formatted,
      project,
      duration: grossMinutes / 60,
      breakTime,
      notes: String(entry.notes || '').trim()
    });

    added++;
  });

  if (added) {
    persistUserData();
    renderHistoricalRecordsSheet();
    runGlobalApplicationMetricsEngine();

    if (typeof renderPeriodProgressBar === 'function') {
      renderPeriodProgressBar();
    }
  }

  const messages = [];

  if (added) messages.push(`${added} hinzugefügt`);
  if (duplicates) messages.push(`${duplicates} Duplikate übersprungen`);
  if (overlaps) messages.push(`${overlaps} Überschneidungen übersprungen`);
  if (invalid) messages.push(`${invalid} ungültig`);

  showToast(
    `${added ? '✓' : '⚠'} ${messages.join(' · ')}`,
    added ? 'success' : 'error'
  );

  if (!added) return;

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
  }, 700);
}

// ── Reset ──────────────────────────────────────────────────────────────────
function resetAiScan() {
  aiPendingFiles = [];
  aiReviewEntries = [];
  aiReviewSourceCount = 0;

  renderAiThumbs();
  setPdfRestoreStatus('');

  const aiInput = document.getElementById('ai-file-input');

  if (aiInput) {
    aiInput.value = '';
    aiInput.removeAttribute('capture');
    aiInput.accept = AI_ACCEPTED_TYPES;
  }

  const pdfInput = document.getElementById('pdf-restore-input');
  if (pdfInput) pdfInput.value = '';

  const uploadStep = document.getElementById('ai-step-upload');
  const reviewStep = document.getElementById('ai-step-review');
  const reviewEntries = document.getElementById('ai-review-entries');

  if (uploadStep) uploadStep.style.display = 'block';
  if (reviewStep) reviewStep.style.display = 'none';
  if (reviewEntries) reviewEntries.innerHTML = '';
}
