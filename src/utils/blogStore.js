const POSTS_KEY = 'leleo-blog-posts-v3';
const AUTH_KEY = 'leleo-blog-auth-v1';
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

function normalizeUrl(url = '') {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
  }
  if (typeof tags === 'string') {
    return tags
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

function normalizePosts(list = []) {
  return list
    .map((item, index) => {
      const title = String(item.title || '未命名记录').trim().slice(0, 120);
      const content = String(item.content || '').trim().slice(0, 120000);
      const summary = String(item.summary || excerpt(content, 120)).trim().slice(0, 200);
      return {
        id: item.id || `post-${index}-${Date.now()}`,
        title,
        summary,
        content,
        tags: normalizeTags(item.tags),
        projectUrl: normalizeUrl(item.projectUrl || item.url || ''),
        kind: item.kind === 'project' || item.projectUrl ? 'project' : 'note',
        createdAt: item.createdAt || Date.now() - index * 1000,
        updatedAt: item.updatedAt || item.createdAt || Date.now() - index * 1000,
      };
    })
    .filter((item) => item.title && item.content);
}

export function excerpt(content = '', len = 80) {
  const raw = String(content || '');
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= len) return text;
  return `${text.slice(0, len)}…`;
}

export function loadBlogPosts(seed = []) {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalizePosts(parsed);
    }
  } catch (_) {}
  return normalizePosts(seed);
}

export function saveBlogPosts(list) {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(normalizePosts(list)));
  } catch (_) {}
}

export function getBlogPost(list, id) {
  return (list || []).find((item) => item.id === id) || null;
}

function buildPayload(payload = {}) {
  const now = Date.now();
  const content = String(payload.content || '').trim().slice(0, 120000);
  const projectUrl = normalizeUrl(payload.projectUrl || '');
  return {
    title: String(payload.title || '未命名记录').trim().slice(0, 120),
    summary: String(payload.summary || excerpt(content, 120)).trim().slice(0, 200),
    content,
    tags: normalizeTags(payload.tags),
    projectUrl,
    kind: payload.kind === 'project' || projectUrl ? 'project' : 'note',
    updatedAt: now,
  };
}

export function addBlogPost(list, payload) {
  const now = Date.now();
  const body = buildPayload(payload);
  const next = [
    {
      id: `b-${now}-${Math.random().toString(36).slice(2, 7)}`,
      ...body,
      createdAt: now,
    },
    ...list,
  ];
  saveBlogPosts(next);
  return normalizePosts(next);
}

export function updateBlogPost(list, id, payload) {
  const body = buildPayload(payload);
  const next = list.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      ...body,
      createdAt: item.createdAt,
    };
  });
  saveBlogPosts(next);
  return normalizePosts(next);
}

export function removeBlogPost(list, id) {
  const next = list.filter((item) => item.id !== id);
  saveBlogPosts(next);
  return next;
}

export function getBlogAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { ok: false, expiresAt: 0 };
    const parsed = JSON.parse(raw);
    const expiresAt = Number(parsed?.expiresAt) || 0;
    if (!parsed?.ok || Date.now() >= expiresAt) {
      clearBlogAuth();
      return { ok: false, expiresAt: 0 };
    }
    return { ok: true, expiresAt };
  } catch (_) {
    return { ok: false, expiresAt: 0 };
  }
}

export function setBlogAuth(ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ok: true, expiresAt }));
  } catch (_) {}
  return { ok: true, expiresAt };
}

export function clearBlogAuth() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (_) {}
}

export function verifyBlogPassword(input, expected) {
  return String(input || '') === String(expected || '');
}

export function formatBlogTime(ts) {
  try {
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return '';
  }
}

export function notifyBlogUpdated() {
  window.dispatchEvent(new Event('leleo-blog-updated'));
}

export { DEFAULT_TTL_MS };
