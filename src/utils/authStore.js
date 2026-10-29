const AUTH_KEY = 'leleo-site-auth-v1';
const RENEW_KEY = 'leleo-site-auth-renew-v1';
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;
const API_BASE = '/api';

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
    return { ok: true, expiresAt, source: parsed.source || 'local' };
  } catch (_) {
    return { ok: false, expiresAt: 0 };
  }
}

export function setSiteAuth(ttlMs = DEFAULT_TTL_MS, extra = {}) {
  const expiresAt = Date.now() + ttlMs;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      ok: true,
      expiresAt,
      source: extra.source || 'local',
    }));
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
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      ok: true,
      expiresAt,
      source: auth.source || 'local',
    }));
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

/** 优先打后端登录；服务端不可用时回落本地密码（迁移期） */
export async function loginSite(password, expectedLocal, ttlMs = DEFAULT_TTL_MS) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const data = await res.json();
      const expiresAt = Number(data.expiresAt) || (Date.now() + ttlMs);
      setSiteAuth(Math.max(60_000, expiresAt - Date.now()), { source: 'server' });
      return { ok: true, source: 'server', expiresAt };
    }
    if (res.status === 401) {
      return { ok: false, error: '密码不对' };
    }
  } catch (_) {
    // 后端不可用 → 本地兜底
  }
  if (!verifySitePassword(password, expectedLocal)) {
    return { ok: false, error: '密码不对' };
  }
  const auth = setSiteAuth(ttlMs, { source: 'local' });
  return { ok: true, source: 'local', expiresAt: auth.expiresAt };
}

export async function logoutSite() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (_) {}
  clearSiteAuth();
}

/**
 * 核对服务端 Cookie 是否仍为管理员。
 * 若服务端明确说未登录，而本地还记着 source:server，则清掉本地态，避免「能看到删除按钮但接口 401」。
 */
export async function refreshServerAuth() {
  const local = getSiteAuth();
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) {
      // 网络/服务异常：保留本地态（可能仍是 local 兜底）
      return local;
    }
    const data = await res.json();
    if (data.admin) {
      const expiresAt = Number(data.expiresAt) || (Date.now() + DEFAULT_TTL_MS);
      setSiteAuth(Math.max(60_000, expiresAt - Date.now()), { source: 'server' });
      return { ok: true, expiresAt, source: 'server' };
    }
    // 服务端明确：没有管理员 Cookie
    if (local.source === 'server') {
      clearSiteAuth();
      return { ok: false, expiresAt: 0 };
    }
    // 本地兜底登录：UI 可显示管理，但写接口仍会失败
    return local;
  } catch (_) {
    return local;
  }
}

/** 是否具备可写服务端的管理员会话（Cookie） */
export async function hasServerAdminSession() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.admin;
  } catch (_) {
    return false;
  }
}

export { DEFAULT_TTL_MS };
