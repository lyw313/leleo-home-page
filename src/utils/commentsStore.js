const STORAGE_KEY = 'leleo-reviews-v1';

function normalize(list = []) {
  return list.map((item, index) => ({
    id: item.id || `seed-${index}-${Date.now()}`,
    name: item.name || '匿名',
    relation: item.relation || '',
    text: item.text || '',
    createdAt: item.createdAt || Date.now() - index * 1000,
  }));
}

export function loadReviews(seed = []) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return normalize(parsed);
      }
    }
  } catch (_) {}
  return normalize(seed);
}

export function saveReviews(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(list)));
  } catch (_) {}
}

export function addReview(list, payload) {
  const next = [
    {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: (payload.name || '匿名').trim().slice(0, 20),
      relation: (payload.relation || '').trim().slice(0, 20),
      text: (payload.text || '').trim().slice(0, 300),
      createdAt: Date.now(),
    },
    ...list,
  ];
  saveReviews(next);
  return next;
}
