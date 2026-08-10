const STORAGE_KEY = 'leleo-planner-v1';

const DEFAULT_TOPICS = [];

const TOPIC_COLORS = ['#5ec8ff', '#ffd56a', '#9ae6b4', '#f6ad55', '#d6bcfa', '#fc8181', '#76e4f7', '#fbb6ce'];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key = '') {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateLabel(key = '') {
  const d = parseDateKey(key);
  if (!d) return key || '';
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 周${week}`;
}

function eachDateKey(startKey, endKey) {
  const a = parseDateKey(startKey);
  const b = parseDateKey(endKey);
  if (!a || !b) return [];
  const from = a <= b ? a : b;
  const to = a <= b ? b : a;
  const keys = [];
  const cur = new Date(from);
  while (cur <= to) {
    keys.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

export function normalizeTopic(raw = {}, index = 0) {
  const name = String(raw.name || '').trim().slice(0, 24);
  if (!name) return null;
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate) ? raw.startDate : '';
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(raw.endDate) ? raw.endDate : '';
  return {
    id: String(raw.id || `t-${Date.now()}-${index}`).slice(0, 40),
    name,
    color: String(raw.color || TOPIC_COLORS[index % TOPIC_COLORS.length]),
    startDate,
    endDate,
  };
}

function normalizeEntry(key, raw = {}) {
  const date = toDateKey(parseDateKey(key) || new Date()) || String(key || '').slice(0, 10);
  const topicIds = Array.isArray(raw.topicIds)
    ? raw.topicIds.map((id) => String(id)).filter(Boolean).slice(0, 12)
    : [];
  const plan = String(raw.plan || '').trim().slice(0, 5000);
  const diary = String(raw.diary || '').trim().slice(0, 20000);
  return {
    date,
    topicIds,
    plan,
    diary,
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

function isEmptyEntry(entry) {
  return !entry?.plan && !entry?.diary && !(entry?.topicIds || []).length;
}

/** 兼容旧版纯日期 map */
export function normalizePlannerState(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { topics: DEFAULT_TOPICS.map((t, i) => ({ ...t })), days: {} };
  }

  // 新格式 { topics, days }
  if (input.days || input.topics) {
    const topicsRaw = Array.isArray(input.topics) ? input.topics : [];
    const topics = topicsRaw.map((t, i) => normalizeTopic(t, i)).filter(Boolean).slice(0, 30);
    const days = {};
    Object.entries(input.days || {}).forEach(([key, value]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      const entry = normalizeEntry(key, value || {});
      if (!isEmptyEntry(entry)) days[key] = entry;
    });
    return { topics, days };
  }

  // 旧格式：日期 key 直接挂在根上
  const days = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
    const entry = normalizeEntry(key, value || {});
    if (!isEmptyEntry(entry)) days[key] = entry;
  });
  return { topics: [], days };
}

export function loadPlanner() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizePlannerState({});
    return normalizePlannerState(JSON.parse(raw));
  } catch (_) {
    return normalizePlannerState({});
  }
}

export function savePlanner(state) {
  const next = normalizePlannerState(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (_) {}
  window.dispatchEvent(new Event('leleo-planner-updated'));
  return next;
}

export function getPlannerEntry(state, dateKey) {
  const key = String(dateKey || '');
  const days = state?.days || {};
  return days[key] || { date: key, topicIds: [], plan: '', diary: '', updatedAt: 0 };
}

export function upsertPlannerEntry(state, dateKey, payload = {}) {
  const key = String(dateKey || toDateKey());
  const prev = getPlannerEntry(state, key);
  const entry = normalizeEntry(key, {
    ...prev,
    ...payload,
    updatedAt: Date.now(),
  });
  const days = { ...(state?.days || {}) };
  if (isEmptyEntry(entry)) delete days[key];
  else days[key] = entry;
  return savePlanner({ topics: state?.topics || [], days });
}

/** 把知识点安排到一段日期（含首尾），并写回 topic 的起止日期 */
export function assignTopicToRange(state, topicId, startKey, endKey, { replace = false } = {}) {
  const id = String(topicId || '');
  if (!id) return state;
  const keys = eachDateKey(startKey, endKey);
  if (!keys.length) return state;
  const a = startKey <= endKey ? startKey : endKey;
  const b = startKey <= endKey ? endKey : startKey;
  const days = { ...(state?.days || {}) };
  keys.forEach((key) => {
    const prev = days[key] || { date: key, topicIds: [], plan: '', diary: '', updatedAt: 0 };
    let topicIds = replace ? [id] : [...(prev.topicIds || [])];
    if (!topicIds.includes(id)) topicIds.push(id);
    topicIds = topicIds.slice(0, 12);
    const entry = normalizeEntry(key, { ...prev, topicIds, updatedAt: Date.now() });
    if (isEmptyEntry(entry)) delete days[key];
    else days[key] = entry;
  });
  const topics = (state?.topics || []).map((t) => (
    t.id === id ? { ...t, startDate: a, endDate: b } : t
  ));
  return savePlanner({ topics, days });
}

/** 新建知识点并直接排到日期区间 */
export function createTopicWithRange(state, name, startKey, endKey) {
  const topic = normalizeTopic({
    name,
    color: TOPIC_COLORS[(state?.topics || []).length % TOPIC_COLORS.length],
    startDate: startKey,
    endDate: endKey,
  }, (state?.topics || []).length);
  if (!topic) return state;
  const topics = [...(state?.topics || []), topic];
  return assignTopicToRange({ topics, days: state?.days || {} }, topic.id, startKey, endKey);
}

export function addPlannerTopic(state, name, startKey = '', endKey = '') {
  const topic = normalizeTopic({
    name,
    color: TOPIC_COLORS[(state?.topics || []).length % TOPIC_COLORS.length],
    startDate: startKey,
    endDate: endKey,
  });
  if (!topic) return state;
  const topics = [...(state?.topics || [])];
  if (topics.some((t) => t.name === topic.name)) return state;
  topics.push(topic);
  let next = { topics, days: state?.days || {} };
  if (startKey && endKey) {
    next = assignTopicToRange(next, topic.id, startKey, endKey);
  } else {
    next = savePlanner(next);
  }
  return next;
}

export function updateTopicRange(state, topicId, startKey, endKey) {
  const id = String(topicId || '');
  if (!id || !startKey || !endKey) return state;
  // 先从旧区间清掉该知识点
  const days = { ...(state?.days || {}) };
  Object.keys(days).forEach((key) => {
    const entry = days[key];
    if (!(entry.topicIds || []).includes(id)) return;
    const topicIds = entry.topicIds.filter((x) => x !== id);
    const next = normalizeEntry(key, { ...entry, topicIds, updatedAt: Date.now() });
    if (isEmptyEntry(next)) delete days[key];
    else days[key] = next;
  });
  return assignTopicToRange({ topics: state?.topics || [], days }, id, startKey, endKey);
}

export function removePlannerTopic(state, topicId) {
  const id = String(topicId || '');
  const topics = (state?.topics || []).filter((t) => t.id !== id);
  const days = {};
  Object.entries(state?.days || {}).forEach(([key, entry]) => {
    const next = normalizeEntry(key, {
      ...entry,
      topicIds: (entry.topicIds || []).filter((x) => x !== id),
    });
    if (!isEmptyEntry(next)) days[key] = next;
  });
  return savePlanner({ topics, days });
}

export function monthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const start = new Date(year, monthIndex, 1 - startPad);
  const weeks = [];
  for (let w = 0; w < 6; w += 1) {
    const row = [];
    for (let d = 0; d < 7; d += 1) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      row.push({
        date: cur,
        key: toDateKey(cur),
        inMonth: cur.getMonth() === monthIndex,
        isToday: toDateKey(cur) === toDateKey(new Date()),
      });
    }
    weeks.push(row);
  }
  return weeks;
}

export function countPlannerDays(state = {}) {
  return Object.keys(state?.days || {}).length;
}

export function mergePlannerStates(base = {}, incoming = {}) {
  const a = normalizePlannerState(base);
  const b = normalizePlannerState(incoming);
  const topicMap = new Map();
  [...a.topics, ...b.topics].forEach((t) => topicMap.set(t.id, t));
  const days = { ...a.days };
  Object.entries(b.days).forEach(([key, entry]) => {
    const old = days[key];
    if (!old || (entry.updatedAt || 0) >= (old.updatedAt || 0)) {
      days[key] = entry;
    }
  });
  return { topics: [...topicMap.values()].slice(0, 30), days };
}

export { STORAGE_KEY as PLANNER_STORAGE_KEY, DEFAULT_TOPICS, TOPIC_COLORS };
