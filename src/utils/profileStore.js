const STORAGE_KEY = 'leleo-profile-v1';

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 16);
  }
  if (typeof tags === 'string') {
    return tags
      .split(/[,，、\n]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 16);
  }
  return [];
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((item) => ({
      name: String(item?.name || '').trim().slice(0, 40),
      point: Math.max(0, Math.min(100, Number(item?.point) || 0)),
      icon: String(item?.icon || '').trim(),
    }))
    .filter((item) => item.name)
    .slice(0, 16);
}

function normalizeAbout(about = {}) {
  return {
    title: String(about.title || '关于我').trim().slice(0, 40) || '关于我',
    summary: String(about.summary || '').trim().slice(0, 500),
  };
}

export function loadProfile(seed = {}) {
  const fallback = {
    about: normalizeAbout(seed.aboutMe || {}),
    tags: normalizeTags(seed.tags || []),
    skills: normalizeSkills(seed.polarChart?.skills || []),
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      about: normalizeAbout({ ...fallback.about, ...(parsed.about || {}) }),
      tags: Object.prototype.hasOwnProperty.call(parsed, 'tags')
        ? normalizeTags(parsed.tags)
        : fallback.tags,
      skills: Object.prototype.hasOwnProperty.call(parsed, 'skills')
        ? (normalizeSkills(parsed.skills).length
          ? normalizeSkills(parsed.skills)
          : fallback.skills)
        : fallback.skills,
    };
  } catch (_) {
    return fallback;
  }
}

export function saveProfile(profile) {
  const next = {
    about: normalizeAbout(profile.about || {}),
    tags: normalizeTags(profile.tags || []),
    skills: normalizeSkills(profile.skills || []),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('leleo-profile-updated', { detail: next }));
  return next;
}

export { normalizeTags, normalizeSkills, normalizeAbout };
