const firebaseConfig = {
  apiKey: "AIzaSyBbBMWCPlE-TNauiJgn3SeOgM9usMXUEJA",
  authDomain: "logins-fa136.firebaseapp.com",
  projectId: "logins-fa136",
  storageBucket: "logins-fa136.firebasestorage.app",
  messagingSenderId: "624142930319",
  appId: "1:624142930319:web:f4e0c97ee517b848cf3bfa"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

function sanitizeHTML(str) {
  const el = document.createElement('div');
  el.textContent = str != null ? String(str) : '';
  return el.innerHTML;
}

let authenticatedUserGlobal      = '';
let authenticatedUserRoleGlobal  = 'user';
let activeLanguageGlobal         = 'de';
let activeLeaveSubManagementType = 'vacation';
let activeSelectedFormBreakDuration = 0;
let globalLoggedSessionsDatabaseMock = [];
let vacationLoggedDaysArrayCache     = [];
let recentlyDeletedItemsBinCache     = [];
let dailyWorkTimeBreakdownLogs       = {};
let dailyOvertimeBreakdownLogs       = {};
let adminAllEntriesCache   = [];
let adminVacAllowanceCache = {};
