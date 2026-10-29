import { pullFromServer, pushToServer } from './serverSync.js';

const POSTS_KEY = 'leleo-blog-posts-v3';
const FOLDERS_KEY = 'leleo-blog-folders-v1';
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
      const content = String(item.content || '').trim().slice(0, 500000);
      const summary = String(item.summary || excerpt(content, 120)).trim().slice(0, 200);
      const folderId = item.folderId == null || item.folderId === '' ? null : String(item.folderId);
      return {
        id: item.id || `post-${index}-${Date.now()}`,
        title,
        summary,
        content,
        tags: normalizeTags(item.tags),
        projectUrl: normalizeUrl(item.projectUrl || item.url || ''),
        kind: item.kind === 'project' || item.projectUrl ? 'project' : 'note',
        folderId,
        createdAt: item.createdAt || Date.now() - index * 1000,
        updatedAt: item.updatedAt || item.createdAt || Date.now() - index * 1000,
      };
    })
    .filter((item) => item.title && item.content);
}

export function normalizeFolders(list = []) {
  const folders = (list || [])
    .map((item, index) => {
      const name = String(item.name || '').trim().slice(0, 40);
      if (!name) return null;
      const parentId = item.parentId == null || item.parentId === '' ? null : String(item.parentId);
      return {
        id: String(item.id || `f-${Date.now()}-${index}`),
        name,
        parentId,
        createdAt: Number(item.createdAt) || Date.now() - index * 1000,
      };
    })
    .filter(Boolean);

  const ids = new Set(folders.map((f) => f.id));
  return folders.map((f) => ({
    ...f,
    parentId: f.parentId && ids.has(f.parentId) && f.parentId !== f.id ? f.parentId : null,
  }));
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

function writeBlogCache(posts, folders) {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(normalizePosts(posts)));
  } catch (_) {}
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(normalizeFolders(folders)));
  } catch (_) {}
}

function mergeFolders(a = [], b = []) {
  const map = new Map();
  [...a, ...b].forEach((f) => map.set(f.id, f));
  return normalizeFolders([...map.values()]);
}

/**
 * 从 PostgreSQL 拉取博客；换浏览器 / 清缓存后靠这个恢复。
 * 本地为空时以服务器为准；两边都有则按 updatedAt 合并。
 */
export async function hydrateBlogFromServer(seedPosts = []) {
  const localPosts = loadBlogPosts(seedPosts);
  const localFolders = loadBlogFolders();
  const local = { posts: localPosts, folders: localFolders };

  return pullFromServer('blog', local, (loc, remote) => {
    const remoteFolders = normalizeFolders(remote.folders || []);
    const remotePosts = normalizePosts(remote.posts || []);
    const remoteHas = remotePosts.length > 0 || remoteFolders.length > 0;
    const localEmpty = loc.posts.length === 0 && loc.folders.length === 0;

    let nextFolders;
    let nextPosts;

    if (remoteHas && localEmpty) {
      // 换浏览器：服务器权威
      nextFolders = remoteFolders.length ? remoteFolders : ensureDefaultFolder([], { persist: false });
      const ids = new Set(nextFolders.map((f) => f.id));
      const fallback = nextFolders[0]?.id || null;
      nextPosts = remotePosts.map((p) => ({
        ...p,
        folderId: p.folderId && ids.has(p.folderId) ? p.folderId : fallback,
      }));
    } else {
      nextFolders = mergeFolders(loc.folders, remoteFolders);
      if (!nextFolders.length) nextFolders = ensureDefaultFolder([], { persist: false });
      const ids = new Set(nextFolders.map((f) => f.id));
      const fallback = nextFolders[0]?.id || null;
      const byId = new Map(loc.posts.map((p) => [p.id, p]));
      remotePosts.forEach((p) => {
        const old = byId.get(p.id);
        if (!old || (p.updatedAt || 0) >= (old.updatedAt || 0)) {
          byId.set(p.id, {
            ...p,
            folderId: p.folderId && ids.has(p.folderId) ? p.folderId : fallback,
          });
        }
      });
      nextPosts = [...byId.values()].map((p) => ({
        ...p,
        folderId: p.folderId && ids.has(p.folderId) ? p.folderId : fallback,
      }));
    }

    const same = JSON.stringify({ posts: nextPosts, folders: nextFolders })
      === JSON.stringify({ posts: loc.posts, folders: loc.folders });
    if (same) {
      if (!remoteHas && (loc.posts.length || loc.folders.length)) {
        pushToServer('blog', { posts: loc.posts, folders: loc.folders });
      }
      return { posts: loc.posts, folders: loc.folders };
    }

    // 只写缓存，不在这里 push（避免未登录 401；登录后由 syncLocalToServer 负责）
    writeBlogCache(nextPosts, nextFolders);
    notifyBlogUpdated();
    return { posts: nextPosts, folders: nextFolders };
  });
}

/** @deprecated 兼容旧调用：同步返回本地缓存，并触发后台 hydrate */
export function loadBlogState(seedPosts = []) {
  const posts = loadBlogPosts(seedPosts);
  const folders = loadBlogFolders().length ? loadBlogFolders() : ensureDefaultFolder([]);
  hydrateBlogFromServer(seedPosts).catch(() => {});
  return { posts, folders };
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

/**
 * 写入 localStorage，并尝试推到服务端。
 * @returns {Promise<{ posts: array, synced: boolean }>}
 */
export async function saveBlogPosts(list) {
  const next = normalizePosts(list);
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(next));
  } catch (_) {}
  const remote = await pushToServer('blog', { posts: next, folders: loadBlogFolders() });
  return { posts: next, synced: !!remote };
}

export function loadBlogFolders() {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalizeFolders(parsed);
    }
  } catch (_) {}
  return [];
}

export async function saveBlogFolders(list) {
  const next = normalizeFolders(list);
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
  } catch (_) {}
  await pushToServer('blog', { posts: loadBlogPosts(), folders: next });
  window.dispatchEvent(new Event('leleo-blog-updated'));
  return next;
}

export function getBlogPost(list, id) {
  return (list || []).find((item) => item.id === id) || null;
}

export function getBlogFolder(folders, id) {
  if (id == null) return null;
  return (folders || []).find((f) => f.id === id) || null;
}

export function listChildFolders(folders, parentId = null) {
  const pid = parentId == null || parentId === '' ? null : parentId;
  return (folders || [])
    .filter((f) => (f.parentId || null) === pid)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export function listPostsInFolder(posts, folderId = null) {
  const fid = folderId == null || folderId === '' ? null : folderId;
  return (posts || []).filter((p) => (p.folderId || null) === fid);
}

export function getFolderPath(folders, folderId) {
  const path = [];
  let cur = getBlogFolder(folders, folderId);
  const guard = new Set();
  while (cur && !guard.has(cur.id)) {
    path.unshift(cur);
    guard.add(cur.id);
    cur = getBlogFolder(folders, cur.parentId);
  }
  return path;
}

export function collectDescendantFolderIds(folders, folderId) {
  const ids = new Set([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    (folders || []).forEach((f) => {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        changed = true;
      }
    });
  }
  return ids;
}

export function ensureDefaultFolder(folders = [], { persist = true } = {}) {
  const list = normalizeFolders(folders);
  if (list.length) return list;
  const created = normalizeFolders([
    {
      id: `f-default-${Date.now()}`,
      name: '默认收藏',
      parentId: null,
      createdAt: Date.now(),
    },
  ]);
  if (!persist) return created;
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(created));
  } catch (_) {}
  // 不阻塞 hydrate；后台推一次即可
  pushToServer('blog', { posts: loadBlogPosts(), folders: created });
  return created;
}

export function resolveValidFolderId(folders, folderId, fallbackId = null) {
  const ids = new Set((folders || []).map((f) => f.id));
  if (folderId && ids.has(folderId)) return folderId;
  if (fallbackId && ids.has(fallbackId)) return fallbackId;
  return folders?.[0]?.id || null;
}

/** 把无收藏夹 / 失效收藏夹的记录归入有效收藏夹 */
export function ensurePostsHaveFolders(posts = [], folders = []) {
  // 空库时不要立刻落盘「默认收藏」，否则会挡住从服务器 hydrate，甚至覆盖 PG
  const shouldPersist = (folders || []).length > 0 || (posts || []).length > 0;
  const folderList = ensureDefaultFolder(folders, { persist: shouldPersist });
  const ids = new Set(folderList.map((f) => f.id));
  const fallback = folderList[0]?.id || null;
  let changed = false;
  const next = (posts || []).map((p) => {
    const fid = p.folderId && ids.has(p.folderId) ? p.folderId : fallback;
    if (fid !== (p.folderId || null)) {
      changed = true;
      return { ...p, folderId: fid };
    }
    return p;
  });
  if (changed && shouldPersist) saveBlogPosts(next);
  return { posts: normalizePosts(next), folders: folderList, changed };
}

function buildPayload(payload = {}) {
  const now = Date.now();
  const content = String(payload.content || '').trim().slice(0, 500000);
  const projectUrl = normalizeUrl(payload.projectUrl || '');
  const folderId = payload.folderId == null || payload.folderId === '' ? null : String(payload.folderId);
  return {
    title: String(payload.title || '未命名记录').trim().slice(0, 120),
    summary: String(payload.summary || excerpt(content, 120)).trim().slice(0, 200),
    content,
    tags: normalizeTags(payload.tags),
    projectUrl,
    kind: payload.kind === 'project' || projectUrl ? 'project' : 'note',
    folderId,
    updatedAt: now,
  };
}

export async function addBlogPost(list, payload) {
  const now = Date.now();
  const body = buildPayload(payload);
  if (!body.folderId) {
    throw new Error('记录必须选择收藏夹');
  }
  const next = [
    {
      id: `b-${now}-${Math.random().toString(36).slice(2, 7)}`,
      ...body,
      createdAt: now,
    },
    ...list,
  ];
  const { posts, synced } = await saveBlogPosts(next);
  notifyBlogUpdated();
  return { posts, synced };
}

export async function updateBlogPost(list, id, payload) {
  const body = buildPayload(payload);
  if (!body.folderId) {
    throw new Error('记录必须选择收藏夹');
  }
  const next = list.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      ...body,
      createdAt: item.createdAt,
    };
  });
  const { posts, synced } = await saveBlogPosts(next);
  notifyBlogUpdated();
  return { posts, synced };
}

export async function removeBlogPost(list, id) {
  const next = list.filter((item) => item.id !== id);
  const { posts, synced } = await saveBlogPosts(next);
  notifyBlogUpdated();
  return { posts, synced };
}

export async function addBlogFolder(folders, { name, parentId = null } = {}) {
  const folderName = String(name || '').trim().slice(0, 40);
  if (!folderName) return normalizeFolders(folders);
  const now = Date.now();
  const next = [
    ...folders,
    {
      id: `f-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name: folderName,
      parentId: parentId || null,
      createdAt: now,
    },
  ];
  return saveBlogFolders(next);
}

export async function renameBlogFolder(folders, id, name) {
  const folderName = String(name || '').trim().slice(0, 40);
  if (!folderName) return normalizeFolders(folders);
  const next = folders.map((f) => (f.id === id ? { ...f, name: folderName } : f));
  return saveBlogFolders(next);
}

export async function removeBlogFolder(folders, posts, id) {
  const removeIds = collectDescendantFolderIds(folders, id);
  const nextFolders = folders.filter((f) => !removeIds.has(f.id));
  const parent = getBlogFolder(folders, id)?.parentId || null;
  // 记录必须留在某个收藏夹：优先上级，否则挑一个仍存在的收藏夹
  let fallback = parent && nextFolders.some((f) => f.id === parent) ? parent : null;
  if (!fallback) {
    fallback = nextFolders[0]?.id || null;
  }
  if (!fallback) {
    // 删光了就重建默认收藏夹
    const restored = ensureDefaultFolder([], { persist: false });
    const defaultId = restored[0].id;
    const nextPosts = posts.map((p) => (
      p.folderId && removeIds.has(p.folderId) ? { ...p, folderId: defaultId } : p
    ));
    try {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(restored));
    } catch (_) {}
    const { posts: savedPosts } = await saveBlogPosts(nextPosts);
    notifyBlogUpdated();
    return { folders: restored, posts: savedPosts };
  }
  const nextPosts = posts.map((p) => (
    p.folderId && removeIds.has(p.folderId) ? { ...p, folderId: fallback } : p
  ));
  const foldersSaved = await saveBlogFolders(nextFolders);
  const { posts: savedPosts } = await saveBlogPosts(nextPosts);
  notifyBlogUpdated();
  return { folders: foldersSaved, posts: savedPosts };
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

export { DEFAULT_TTL_MS, FOLDERS_KEY, POSTS_KEY };
