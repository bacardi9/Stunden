function parseDMYLocal(dateStr) {
  const [d, m, y] = (dateStr || '').split('.');
  return new Date(y, m - 1, d).getTime();
}
function handleNewRecordSubmission(e) {
  e.preventDefault();
  showToast('Record saved', 'success');
  persistUserData();
}
function handleVacationDayLogSubmission(e) {
  e.preventDefault();
  showToast('Vacation logged', 'success');
  persistUserData();
}
function handleSchuleSubmission() {
  showToast('School day logged', 'success');
  persistUserData();
}
function selectBreakOption(mins, btn) {
  document.querySelectorAll('.break-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  activeSelectedFormBreakDuration = mins;
}
function showProjectSuggestions(val) { console.log('Suggest:', val); }
function hideProjectSuggestions() {}
function handleFeedbackSubmissionEngine(e) {
  e.preventDefault();
  showToast('Feedback sent', 'success');
}
function handlePasswordChange() { showToast('Password updated', 'success'); }
function logoutOtherDevicesEngine() { showToast('Other devices logged out', 'success'); }
function showToast(msg, type) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = type;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
