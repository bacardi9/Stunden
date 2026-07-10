// Shared feature helpers: rate-limit, email/SMS hooks,
// digital signature, dark mode, PWA install, user creation hook.

// ── Public form rate limiting (client-side; Firestore rules add server-side) ──
const RATE_KEY       = 'anfrage_last_ts';
const RATE_COUNT_KEY = 'anfrage_count';
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX       = 3;

export function checkRateLimit() {
  const now   = Date.now();
  const last  = +(localStorage.getItem(RATE_KEY)       || 0);
  let   count = +(localStorage.getItem(RATE_COUNT_KEY) || 0);
  if (now - last > RATE_WINDOW_MS) count = 0;
  if (count >= RATE_MAX) {
    return { ok: false, msg: 'Zu viele Anfragen. Bitte warten Sie eine Stunde.' };
  }
  return { ok: true };
}

export function recordRequest() {
  const now   = Date.now();
  const last  = +(localStorage.getItem(RATE_KEY)       || 0);
  let   count = +(localStorage.getItem(RATE_COUNT_KEY) || 0);
  if (now - last > RATE_WINDOW_MS) count = 0;
  localStorage.setItem(RATE_COUNT_KEY, count + 1);
  localStorage.setItem(RATE_KEY,       now);
}

// Honeypot + minimum submit time bot detection
export function isLikelyBot(form, openedAt) {
  const hp = form.querySelector('input[name="company_website"]');
  if (hp && hp.value.trim() !== '') return true;   // honeypot filled
  if (Date.now() - openedAt < 2500)  return true;  // submitted too fast (<2.5s)
  return false;
}

// ── Email / SMS confirmation ───────────────────────────────────────────────────
// Calls your deployed Cloud Function endpoint.
// The Cloud Function sends the customer a confirmation email.
export async function sendConfirmation(payload) {
  try {
    await fetch('/api/sendConfirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('Confirmation backend not reachable:', e.message);
  }
}

// ── Auto-create customer account after admin accepts Anfrage ──────────────────
// This calls a Cloud Function that:
//   1. Checks if an Auth user exists for the email.
//   2. If not, creates one and generates a password-setup link.
//   3. Sends a professional welcome email with the sign-in link.
//   4. Creates /users/{uid} with role: 'kunde'.
//   5. Links the anfrageId to the new user.
//
// Call this from your admin dashboard when marking a request as 'accepted'.
export async function provisionCustomerAccount(anfrageId, email, name) {
  try {
    const resp = await fetch('/api/provisionCustomer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anfrageId, email, name })
    });
    if (!resp.ok) throw new Error(await resp.text());
    return { ok: true };
  } catch (e) {
    console.warn('provisionCustomerAccount failed:', e.message);
    return { ok: false, error: e.message };
  }
}

// ── Digital signature pad ─────────────────────────────────────────────────────
export function initSignaturePad(canvas) {
  const ctx     = canvas.getContext('2d');
  let   drawing = false;

  // Re-apply context settings (called after canvas resize too)
  const applyStyle = () => {
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.strokeStyle = '#0f172a';
  };
  applyStyle();

  const getPos = e => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height)
    };
  };

  const onStart = e => {
    drawing = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.preventDefault();
  };
  const onMove = e => {
    if (!drawing) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };
  const onEnd = () => { drawing = false; };

  canvas.addEventListener('mousedown',  onStart);
  canvas.addEventListener('mousemove',  onMove);
  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove',  onMove,  { passive: false });
  window.addEventListener('mouseup',    onEnd);
  canvas.addEventListener('touchend',   onEnd);

  return {
    clear:     ()  => { ctx.clearRect(0, 0, canvas.width, canvas.height); applyStyle(); },
    isEmpty:   ()  => !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some(c => c !== 0),
    toDataURL: ()  => canvas.toDataURL('image/png'),
    applyStyle       // expose so caller can call after resize
  };
}

// ── Dark mode ─────────────────────────────────────────────────────────────────
export function initDarkMode(toggleBtn) {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  const sync = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (toggleBtn) toggleBtn.textContent = dark ? '☀️' : '🌙';
  };
  sync();
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (dark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
      sync();
    });
  }
}

// ── PWA install prompt ────────────────────────────────────────────────────────
export function initInstallPrompt(button) {
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    if (button) button.classList.remove('hidden');
  });
  if (button) {
    button.addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      button.classList.add('hidden');
    });
  }
}