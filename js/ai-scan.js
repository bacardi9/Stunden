const aiScanState = { files: [], previewUrls: [] };

function aiElement(id) { return document.getElementById(id); }
function aiToast(message, type = 'info') { if (typeof showToast === 'function') showToast(message, type); }

function triggerAiCamera() {
  const input = aiElement('ai-file-input');
  if (!input) return;
  input.setAttribute('capture', 'environment');
  input.click();
}
function triggerAiGallery() {
  const input = aiElement('ai-file-input');
  if (!input) return;
  input.removeAttribute('capture');
  input.click();
}
function handleAiFileSelect(event) {
  addAiFiles(event?.target?.files || []);
  if (event?.target) event.target.value = '';
}

function addAiFiles(fileList) {
  const imageFiles = Array.from(fileList).filter(file => file.type.startsWith('image/'));
  if (!imageFiles.length) {
    aiToast('Bitte eine Bilddatei auswählen.', 'error');
    return;
  }
  const remainingSlots = Math.max(0, 10 - aiScanState.files.length);
  aiScanState.files.push(...imageFiles.slice(0, remainingSlots));
  renderAiPreview();
  if (imageFiles.length > remainingSlots) {
    aiToast('Es können höchstens 10 Fotos geprüft werden.', 'info');
  } else {
    aiToast(`${aiScanState.files.length} ${aiScanState.files.length === 1 ? 'Foto' : 'Fotos'} für die Vorschau bereit.`, 'success');
  }
}

function renderAiPreview() {
  aiScanState.previewUrls.forEach(url => URL.revokeObjectURL(url));
  aiScanState.previewUrls = aiScanState.files.map(file => URL.createObjectURL(file));
  const thumbs = aiElement('ai-thumbs-row');
  const counter = aiElement('ai-thumb-counter');
  const preview = aiElement('ai-preview-img');
  const placeholder = aiElement('ai-dropzone-placeholder');
  const analyzeButton = aiElement('btn-ai-analyze');

  if (thumbs) {
    thumbs.replaceChildren();
    aiScanState.previewUrls.forEach((url, index) => {
      const item = document.createElement('div');
      item.className = 'ai-thumb-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Foto ${index + 1} anzeigen`);
      const image = document.createElement('img');
      image.src = url;
      image.alt = `Vorschau Foto ${index + 1}`;
      item.appendChild(image);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'thumb-remove';
      remove.setAttribute('aria-label', `Foto ${index + 1} entfernen`);
      remove.textContent = '×';
      remove.addEventListener('click', event => { event.stopPropagation(); removeAiFile(index); });
      item.appendChild(remove);
      const selectPreview = () => {
        if (!preview) return;
        preview.src = url;
        preview.style.display = 'block';
      };
      item.addEventListener('click', selectPreview);
      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPreview(); }
      });
      thumbs.appendChild(item);
    });
    thumbs.style.display = aiScanState.files.length ? 'flex' : 'none';
  }
  if (counter) {
    counter.textContent = aiScanState.files.length ? `${aiScanState.files.length} von 10 Fotos ausgewählt` : '';
    counter.style.display = aiScanState.files.length ? 'block' : 'none';
  }
  if (preview) {
    if (aiScanState.previewUrls.length) { preview.src = aiScanState.previewUrls[0]; preview.style.display = 'block'; }
    else { preview.removeAttribute('src'); preview.style.display = 'none'; }
  }
  if (placeholder) placeholder.style.display = aiScanState.files.length ? 'none' : 'block';
  if (analyzeButton) analyzeButton.style.display = aiScanState.files.length ? 'block' : 'none';
}

function removeAiFile(index) {
  aiScanState.files.splice(index, 1);
  renderAiPreview();
}
function handleAiDrop(event) {
  event.preventDefault();
  aiElement('ai-dropzone')?.classList.remove('dragover');
  addAiFiles(event.dataTransfer?.files || []);
}
function saveAiApiKey() {
  const input = aiElement('ai-api-key-input');
  const status = aiElement('ai-key-status');
  const key = input?.value.trim() || '';
  if (!key) {
    if (status) { status.textContent = 'Bitte einen Schlüssel eingeben.'; status.style.color = '#ef4444'; }
    return;
  }
  if (!/^AIza[\\w-]+$/.test(key)) {
    if (status) { status.textContent = 'Format des Schlüssels prüfen.'; status.style.color = '#ef4444'; }
    return;
  }
  try { sessionStorage.setItem('mso-ai-key', key); } catch (error) {}
  if (status) { status.textContent = 'Schlüssel für diese Sitzung gespeichert.'; status.style.color = '#10b981'; }
  aiToast('Schlüssel gespeichert. Die Foto-Vorschau ist bereit.', 'success');
}
function runAiAnalysis() {
  if (!aiScanState.files.length) { aiToast('Zuerst ein Foto auswählen.', 'info'); return; }
  aiToast('Die Vorschau ist bereit. Bitte alle Angaben vor der Übernahme prüfen.', 'info');
}
function resetAiScan() {
  aiScanState.files = [];
  renderAiPreview();
  const review = aiElement('ai-step-review');
  const upload = aiElement('ai-step-upload');
  if (review) review.style.display = 'none';
  if (upload) upload.style.display = 'block';
}
function confirmAiEntries() {
  aiToast('Bitte die erkannten Angaben vor dem Speichern prüfen.', 'info');
}

window.addEventListener('beforeunload', () => {
  aiScanState.previewUrls.forEach(url => URL.revokeObjectURL(url));
});

function normalizeGermanAiCopy() {
  const cards = document.querySelectorAll('#landing-page .lp-features-grid .lp-feature-card');
  if (cards[4]) {
    const title = cards[4].querySelector('.lp-feature-title');
    const description = cards[4].querySelector('.lp-feature-desc');
    if (title) title.textContent = 'Stundenzettel-Scan';
    if (description) description.textContent = 'Foto auswählen und die Vorschau vor der Übernahme prüfen.';
  }

  const steps = document.querySelectorAll('#landing-page .lp-step');
  if (steps[1]) {
    const description = steps[1].querySelector('p');
    if (description) description.textContent = 'Kommen, Gehen und Pause eintragen — die Vorschau unterstützt dich beim Prüfen.';
  }

  const registrationFeatures = document.querySelectorAll('#modal-register-backdrop .reg-feature-item');
  if (registrationFeatures[4]) {
    const title = registrationFeatures[4].querySelector('.reg-feature-name');
    const description = registrationFeatures[4].querySelector('.reg-feature-desc');
    if (title) title.textContent = 'Stundenzettel-Scan';
    if (description) description.textContent = 'Foto auswählen und die Vorschau vor der Übernahme prüfen.';
  }

  const scanTitle = document.querySelector('#view-ai-scan .view-title span');
  if (scanTitle) {
    const icon = scanTitle.querySelector('i');
    scanTitle.textContent = '';
    if (icon) scanTitle.appendChild(icon);
    scanTitle.append('Stundenzettel-Scan');
  }

  const analyzeButton = aiElement('btn-ai-analyze');
  if (analyzeButton) {
    analyzeButton.textContent = 'Vorschau prüfen';
    analyzeButton.setAttribute('aria-label', 'Vorschau prüfen');
  }

  const uploadDescription = document.querySelector('#ai-step-upload [style*="font-size:12px"]');
  if (uploadDescription) uploadDescription.textContent = 'Bis zu 10 Fotos – jede Vorschau einzeln prüfen';

  const keyTitle = document.querySelector('#ai-api-key-card div[style*="font-size:13px"]');
  if (keyTitle) keyTitle.textContent = 'Analyse-Schlüssel';

  const reviewTitle = document.querySelector('#ai-step-review [style*="font-size:13px"]');
  if (reviewTitle) reviewTitle.textContent = 'Vorschau abgeschlossen';
}

document.addEventListener('DOMContentLoaded', normalizeGermanAiCopy);