function renderHistoricalRecordsSheet() {
  const container = document.getElementById('history-items-container');
  if (!container) return;
  
  let entries = [...(globalLoggedSessionsDatabaseMock || [])];
  
  // Get sort preference from localStorage or default to 'date-desc'
  const sortPref = localStorage.getItem('sch_history_sort') || 'date-desc';
  
  // Apply sorting
  if (sortPref === 'date-asc') {
    entries.sort((a, b) => parseDMYLocal(a.date) - parseDMYLocal(b.date));
  } else if (sortPref === 'date-desc') {
    entries.sort((a, b) => parseDMYLocal(b.date) - parseDMYLocal(a.date));
  } else if (sortPref === 'duration-asc') {
    entries.sort((a, b) => {
      const durationA = a.type === 'schule' ? 0 : Math.max(0, (a.duration || 0) - ((a.breakTime || 0) / 60));
      const durationB = b.type === 'schule' ? 0 : Math.max(0, (b.duration || 0) - ((b.breakTime || 0) / 60));
      return durationA - durationB;
    });
  } else if (sortPref === 'duration-desc') {
    entries.sort((a, b) => {
      const durationA = a.type === 'schule' ? 0 : Math.max(0, (a.duration || 0) - ((a.breakTime || 0) / 60));
      const durationB = b.type === 'schule' ? 0 : Math.max(0, (b.duration || 0) - ((b.breakTime || 0) / 60));
      return durationB - durationA;
    });
  } else if (sortPref === 'project-az') {
    entries.sort((a, b) => (a.project || '').localeCompare(b.project || ''));
  }
  
  if (!entries.length) {
    container.innerHTML = `<div class="history-item"><div class="item-main-row"><div class="hist-left"><h5>Keine Einträge vorhanden.</h5><p>Neue Arbeitszeiten erscheinen hier.</p></div></div></div>`;
    return;
  }
  
  // Build sort bar
  const sortBar = `
    <div id="history-sort-bar">
      <div class="sort-label">Sortierung:</div>
      <button class="sort-pill ${sortPref === 'date-desc' ? 'active' : ''}" onclick="setSortPreference('date-desc')">
        <i class="fa-solid fa-arrow-down"></i> Datum (Neu)
      </button>
      <button class="sort-pill ${sortPref === 'date-asc' ? 'active' : ''}" onclick="setSortPreference('date-asc')">
        <i class="fa-solid fa-arrow-up"></i> Datum (Alt)
      </button>
      <button class="sort-pill ${sortPref === 'duration-desc' ? 'active' : ''}" onclick="setSortPreference('duration-desc')">
        <i class="fa-solid fa-hourglass-end"></i> Dauer (Lang)
      </button>
      <button class="sort-pill ${sortPref === 'duration-asc' ? 'active' : ''}" onclick="setSortPreference('duration-asc')">
        <i class="fa-solid fa-hourglass-start"></i> Dauer (Kurz)
      </button>
      <button class="sort-pill ${sortPref === 'project-az' ? 'active' : ''}" onclick="setSortPreference('project-az')">
        <i class="fa-solid fa-arrow-down-a-z"></i> Baustelle (A–Z)
      </button>
    </div>
  `;
  
  container.innerHTML = sortBar + entries.map(r => {
    const isSchool = r.type === 'schule';
    const net = isSchool ? 0 : Math.max(0, (r.duration || 0) - ((r.breakTime || 0) / 60));
    return `<div class="history-item">
      <div class="item-main-row">
        <div class="hist-left">
          <h5>${escapeHtml(r.date)} · ${escapeHtml(isSchool ? 'BERUFSSCHULE' : (r.project || '-'))}</h5>
          <p>${isSchool ? 'Schultag' : `${escapeHtml(r.startTime || '-')} – ${escapeHtml(r.endTime || '-')} · Pause ${r.breakTime || 0} min`}</p>
          ${r.notes ? `<p>${escapeHtml(r.notes)}</p>` : ''}
        </div>
        <div class="hist-right">
          ${isSchool ? '🎓' : net.toFixed(2) + ' hrs'}
          <button class="action-icon-btn delete-hover" onclick="deleteWorkRecord('${r.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function setSortPreference(sortType) {
  localStorage.setItem('sch_history_sort', sortType);
  renderHistoricalRecordsSheet();
}
