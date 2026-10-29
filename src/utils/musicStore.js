import { assetUrl } from './assetUrl.js';

const LIST_KEY = 'leleo-music-playlist-v1';
const DB_NAME = 'leleo-music-db';
const DB_STORE = 'blobs';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
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

export async function saveMusicBlob(key, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMusicBlob(key) {
  if (!key) return null;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return null;
  }
}

export async function deleteMusicBlob(key) {
  if (!key) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {}
}

export function normalizeSong(song, index = 0) {
  return {
    id: song.id || `m-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    title: String(song.title || '未知歌曲').trim().slice(0, 80),
    author: String(song.author || '未知歌手').trim().slice(0, 60),
    url: String(song.url || '').trim(),
    pic: String(song.pic || '').trim(),
    blobKey: String(song.blobKey || '').trim(),
    lrc: String(song.lrc || '').trim(),
    lrcText: String(song.lrcText || '').trim().slice(0, 20000),
  };
}

export function seedFromConfig(customSongs = []) {
  return (customSongs || [])
    .filter((s) => s?.title && (s?.url || s?.blobKey))
    .map((s, i) => normalizeSong(s, i));
}

export function loadMusicPlaylist(seed = []) {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s, i) => normalizeSong(s, i));
      }
    }
  } catch (_) {}
  return (seed || []).map((s, i) => normalizeSong(s, i));
}

export function saveMusicPlaylist(list) {
  const next = (list || []).map((s, i) => normalizeSong(s, i));
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(next.map(({ id, title, author, url, pic, blobKey, lrc, lrcText }) => ({
      id,
      title,
      author,
      url: blobKey ? '' : url,
      pic,
      blobKey,
      lrc,
      lrcText,
    }))));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('leleo-music-updated'));
  return next;
}

export function addMusicSong(list, song) {
  const next = [...(list || []), normalizeSong(song, (list || []).length)];
  return saveMusicPlaylist(next);
}

export async function removeMusicSong(list, id) {
  const target = (list || []).find((s) => s.id === id);
  if (target?.blobKey) await deleteMusicBlob(target.blobKey);
  const next = (list || []).filter((s) => s.id !== id);
  return saveMusicPlaylist(next);
}

export async function hydrateMusicUrls(list = []) {
  const out = [];
  for (const song of list) {
    const item = { ...song };
    if (item.blobKey) {
      const blob = await getMusicBlob(item.blobKey);
      if (blob) {
        item.url = URL.createObjectURL(blob);
      }
    } else if (item.url) {
      item.url = assetUrl(item.url);
    }
    if (item.pic) item.pic = assetUrl(item.pic);
    if (item.url) out.push(item);
  }
  return out;
}
