import { mergePlannerStates } from './plannerStore.js';

const BACKUP_VERSION = 1;
const BACKUP_KIND = 'leleo-site-backup';

/** 可迁移的业务数据（不含登录态） */
export const BACKUP_STORAGE_KEYS = [
  'leleo-blog-posts-v3',
  'leleo-blog-folders-v1',
  'leleo-blog-posts-v2',
  'leleo-blog-posts-v1',
  'leleo-profile-v1',
  'leleo-world-modules-v1',
  'leleo-planner-v1',
  'leleo-music-playlist-v1',
  'leleo-music-volume',
];

const DB_NAME = 'leleo-music-db';
const DB_STORE = 'blobs';

function openMusicDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read fail'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const raw = String(dataUrl || '');
  if (!raw.startsWith('data:')) return null;
  const comma = raw.indexOf(',');
  if (comma < 0) return null;
  const meta = raw.slice(5, comma);
  const data = raw.slice(comma + 1);
  const parts = meta.split(';').filter(Boolean);
  const mime = parts[0] || 'application/octet-stream';
  const isBase64 = parts.some((p) => p.toLowerCase() === 'base64');
  if (isBase64) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  try {
    return new Blob([decodeURIComponent(data)], { type: mime });
  } catch (_) {
    return new Blob([data], { type: mime });
  }
}

async function exportMusicBlobs() {
  const blobs = {};
  try {
    const db = await openMusicDb();
    const keys = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    for (const key of keys) {
      const blob = await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (blob) {
        // eslint-disable-next-line no-await-in-loop
        blobs[String(key)] = await blobToDataUrl(blob);
      }
    }
  } catch (_) {}
  return blobs;
}

async function importMusicBlobs(blobs = {}) {
  const entries = Object.entries(blobs || {});
  if (!entries.length) return 0;
  let count = 0;
  try {
    const db = await openMusicDb();
    for (const [key, dataUrl] of entries) {
      const blob = dataUrlToBlob(dataUrl);
      if (!blob) continue;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(blob, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
      count += 1;
    }
  } catch (_) {}
  return count;
}

function migrateLegacyBlogKeys(storage = {}) {
  // 若只有旧 key，写入当前 v3
  if (!storage['leleo-blog-posts-v3']) {
    const legacy = storage['leleo-blog-posts-v2'] || storage['leleo-blog-posts-v1'];
    if (legacy) storage['leleo-blog-posts-v3'] = legacy;
  }
  return storage;
}

export function summarizeBackup(payload) {
  const storage = payload?.storage || {};
  let blogCount = 0;
  try {
    const raw = storage['leleo-blog-posts-v3'] || storage['leleo-blog-posts-v2'] || storage['leleo-blog-posts-v1'];
    const list = raw ? JSON.parse(raw) : [];
    blogCount = Array.isArray(list) ? list.length : 0;
  } catch (_) {}
  return {
    exportedAt: payload?.exportedAt || '',
    host: payload?.host || '',
    blogCount,
    hasProfile: !!storage['leleo-profile-v1'],
    hasWorld: !!storage['leleo-world-modules-v1'],
    hasPlanner: !!storage['leleo-planner-v1'],
    hasMusic: !!storage['leleo-music-playlist-v1'],
    musicBlobCount: Object.keys(payload?.musicBlobs || {}).length,
  };
}

export async function buildSiteBackup() {
  const storage = {};
  BACKUP_STORAGE_KEYS.forEach((key) => {
    try {
      const val = localStorage.getItem(key);
      if (val != null) storage[key] = val;
    } catch (_) {}
  });
  const musicBlobs = await exportMusicBlobs();
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    host: typeof location !== 'undefined' ? location.host : '',
    storage,
    musicBlobs,
  };
}

export async function downloadSiteBackup() {
  const payload = await buildSiteBackup();
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `leleo-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return summarizeBackup(payload);
}

export function parseBackupFileText(text) {
  const payload = JSON.parse(String(text || ''));
  if (!payload || typeof payload !== 'object') {
    throw new Error('备份文件无效');
  }

  // 本站正式备份
  if (payload.kind === BACKUP_KIND) {
    if (!payload.storage || typeof payload.storage !== 'object') {
      throw new Error('备份文件内容不完整');
    }
    return payload;
  }

  // 兼容控制台手工 dump：{ "leleo-blog-posts-v3": "...", ... }
  const looksLikeRawDump = BACKUP_STORAGE_KEYS.some((k) => k in payload);
  if (looksLikeRawDump && !payload.storage) {
    return {
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      host: 'manual-dump',
      storage: payload,
      musicBlobs: {},
    };
  }

  throw new Error('不是本站的数据备份文件');
}

export async function importSiteBackup(payload, { merge = false } = {}) {
  const data = migrateLegacyBlogKeys({ ...(payload.storage || {}) });
  const applied = [];

  BACKUP_STORAGE_KEYS.forEach((key) => {
    if (!(key in data)) return;
    // 不导入登录态相关（列表里本身没有）
    try {
      if (!merge) {
        localStorage.setItem(key, data[key]);
        applied.push(key);
        return;
      }
      // merge：目标为空才写入；博客合并数组；计划本按日期合并
      if (key.startsWith('leleo-blog-posts-')) {
        const incoming = JSON.parse(data[key] || '[]');
        const existing = JSON.parse(localStorage.getItem('leleo-blog-posts-v3') || '[]');
        if (!Array.isArray(incoming)) return;
        const map = new Map();
        [...existing, ...incoming].forEach((item) => {
          if (item?.id) map.set(item.id, item);
          else map.set(`anon-${map.size}`, item);
        });
        localStorage.setItem('leleo-blog-posts-v3', JSON.stringify([...map.values()]));
        applied.push('leleo-blog-posts-v3');
        return;
      }
      if (key === 'leleo-blog-folders-v1') {
        const incoming = JSON.parse(data[key] || '[]');
        const existing = JSON.parse(localStorage.getItem('leleo-blog-folders-v1') || '[]');
        if (!Array.isArray(incoming)) return;
        const map = new Map();
        [...existing, ...incoming].forEach((item) => {
          if (item?.id) map.set(item.id, item);
          else map.set(`anon-${map.size}`, item);
        });
        localStorage.setItem('leleo-blog-folders-v1', JSON.stringify([...map.values()]));
        applied.push('leleo-blog-folders-v1');
        return;
      }
      if (key === 'leleo-planner-v1') {
        let incoming = {};
        let existing = {};
        try { incoming = JSON.parse(data[key] || '{}'); } catch (_) {}
        try { existing = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) {}
        const merged = mergePlannerStates(existing, incoming);
        localStorage.setItem(key, JSON.stringify(merged));
        applied.push(key);
        return;
      }
      if (localStorage.getItem(key) == null) {
        localStorage.setItem(key, data[key]);
        applied.push(key);
      }
    } catch (_) {}
  });

  const blobCount = await importMusicBlobs(payload.musicBlobs || {});

  window.dispatchEvent(new Event('leleo-blog-updated'));
  window.dispatchEvent(new CustomEvent('leleo-profile-updated', { detail: null }));
  window.dispatchEvent(new Event('leleo-world-updated'));
  window.dispatchEvent(new CustomEvent('leleo-music-updated'));
  window.dispatchEvent(new Event('leleo-planner-updated'));

  return {
    applied,
    blobCount,
    summary: summarizeBackup(payload),
  };
}

export async function readBackupFromFile(file) {
  const text = await file.text();
  return parseBackupFileText(text);
}
