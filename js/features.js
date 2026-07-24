function renderVacationRecordsSheet() {
  const container = document.getElementById('vacation-days-list-container');
  if (!container) return;

  container.innerHTML =
    '<div class="history-item"><h5>Keine Urlaubseinträge</h5></div>';
}

function renderRecentlyDeletedBinSheet() {
  const container = document.getElementById('deleted-items-bin-container');
  if (!container) return;

  container.innerHTML =
    '<div class="history-item"><h5>Papierkorb ist leer</h5></div>';
}

function setLeaveManagementType(type) {
  activeLeaveSubManagementType = type;

  const vacationButton = document.getElementById('toggle-leave-vacation');
  const sickButton = document.getElementById('toggle-leave-sick');

  vacationButton?.classList.toggle('active', type === 'vacation');
  sickButton?.classList.toggle('active', type === 'sick');
}

function openHiddenTrashView() {
  switchActiveView('deleted', null);
}

function deleteWorkRecord(id) {
  const index = globalLoggedSessionsDatabaseMock.findIndex(
    record => String(record.id) === String(id)
  );

  if (index === -1) return;

  const deletedRecord = globalLoggedSessionsDatabaseMock.splice(index, 1)[0];

  recentlyDeletedItemsBinCache.push({
    ...deletedRecord,
    deletedAt: Date.now()
  });

  renderHistoricalRecordsSheet();
  persistUserData();
  showToast('Eintrag gelöscht.', 'success');
}

function handleSecureSignOutRequest() {
  localStorage.removeItem('schuermann_auth_user');
  localStorage.removeItem('schuermann_current_user');

  auth.signOut().finally(() => {
    window.location.reload();
  });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return String(text == null ? '' : text).replace(
    /[&<>"']/g,
    character => map[character]
  );
}
