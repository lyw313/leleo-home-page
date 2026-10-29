const STORAGE_KEY = 'leleo-world-modules-v1';

function normalizeItem(item, index = 0) {
  const repo = String(item.repo || item.link || '').trim();
  const website = String(item.website || '').trim();
  return {
    id: item.id || `w-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    title: String(item.title || '未命名').trim().slice(0, 80),
    text: String(item.text || '').trim().slice(0, 300),
    image: String(item.image || '').trim(),
    website,
    repo,
    // 兼容旧字段：link 视为仓库地址
    link: repo,
  };
}

function seedFromConfig(lifeModules = []) {
  const map = {};
  lifeModules.forEach((mod) => {
    if (!mod?.key) return;
    map[mod.key] = (mod.items || []).map((item, i) => normalizeItem(item, i));
  });
  return map;
}

export function loadWorldMap(lifeModules = []) {
  const seed = seedFromConfig(lifeModules);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const merged = { ...seed };
        Object.keys({ ...seed, ...parsed }).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(parsed, key) && Array.isArray(parsed[key])) {
            merged[key] = parsed[key].map((item, i) => normalizeItem(item, i));
          }
        });
        return merged;
      }
    }
  } catch (_) {}
  return seed;
}

export function saveWorldMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map || {}));
  } catch (_) {}
  window.dispatchEvent(new Event('leleo-world-updated'));
}

export function getWorldItems(map, key) {
  return Array.isArray(map?.[key]) ? map[key] : [];
}

export function addWorldItem(map, key, payload) {
  const next = { ...map };
  const list = [...(next[key] || [])];
  list.unshift(normalizeItem(payload));
  next[key] = list;
  saveWorldMap(next);
  return next;
}

export function removeWorldItem(map, key, id) {
  const next = { ...map };
  next[key] = (next[key] || []).filter((item) => item.id !== id);
  saveWorldMap(next);
  return next;
}
