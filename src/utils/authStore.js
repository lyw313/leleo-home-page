const AUTH_KEY = 'leleo-site-auth-v1';
const RENEW_KEY = 'leleo-site-auth-renew-v1';
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

export function getSiteAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { ok: false, expiresAt: 0 };
    const parsed = JSON.parse(raw);
    const expiresAt = Number(parsed?.expiresAt) || 0;
    if (!parsed?.ok || Date.now() >= expiresAt) {
      clearSiteAuth();
      return { ok: false, expiresAt: 0 };
    }
    return { ok: true, expiresAt };
  } catch (_) {
    return { ok: false, expiresAt: 0 };
  }
}

export function setSiteAuth(ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ok: true, expiresAt }));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('leleo-auth-changed', { detail: { ok: true, expiresAt } }));
  return { ok: true, expiresAt };
}

export function extendSiteAuth(ttlMs = DEFAULT_TTL_MS) {
  const auth = getSiteAuth();
  if (!auth.ok) return { ok: false, expiresAt: 0 };
  const base = Math.max(auth.expiresAt, Date.now());
  const expiresAt = base + ttlMs;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ok: true, expiresAt }));
    localStorage.setItem(RENEW_KEY, JSON.stringify({ lastRenewAt: Date.now() }));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('leleo-auth-changed', { detail: { ok: true, expiresAt } }));
  return { ok: true, expiresAt };
}

export function getLastRenewAt() {
  try {
    const raw = localStorage.getItem(RENEW_KEY);
    if (!raw) return 0;
    return Number(JSON.parse(raw)?.lastRenewAt) || 0;
  } catch (_) {
    return 0;
  }
}

export function canRenewAuth(cooldownMs = DEFAULT_TTL_MS) {
  const last = getLastRenewAt();
  if (!last) return true;
  return Date.now() - last >= cooldownMs;
}

export function renewCooldownLeft(cooldownMs = DEFAULT_TTL_MS) {
  const last = getLastRenewAt();
  if (!last) return 0;
  return Math.max(0, cooldownMs - (Date.now() - last));
}

export function clearSiteAuth() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('leleo-auth-changed', { detail: { ok: false, expiresAt: 0 } }));
}

export function verifySitePassword(input, expected) {
  return String(input || '') === String(expected || '');
}

export function authTtlFromConfig(cfg = {}) {
  const hours = Number(cfg.sessionHours);
  if (hours > 0) return hours * 60 * 60 * 1000;
  return DEFAULT_TTL_MS;
}

export { DEFAULT_TTL_MS };
