/** 解析 LRC 文本为 [{ time, text }] */
export function parseLyrics(text = '') {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/);
  const result = [];
  const timeTag = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const tags = [...line.matchAll(timeTag)];
    if (!tags.length) continue;
    const lyricText = line.replace(timeTag, '').trim();
    if (!lyricText) continue;
    for (const match of tags) {
      const minutes = Number(match[1]) || 0;
      const seconds = Number(match[2]) || 0;
      const frac = match[3] || '0';
      const ms = Number(frac.padEnd(3, '0').slice(0, 3)) / 1000;
      result.push({
        time: minutes * 60 + seconds + ms,
        text: lyricText,
      });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function guessLrcUrl(audioUrl = '') {
  if (!audioUrl || audioUrl.startsWith('blob:')) return '';
  return String(audioUrl).replace(/\.(mp3|m4a|ogg|wav|flac)(\?.*)?$/i, '.lrc$2');
}

export async function fetchTextIfOk(url) {
  if (!url) return '';
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const text = await res.text();
    if (!text || text.trim().startsWith('<!')) return '';
    return text;
  } catch (_) {
    return '';
  }
}

/** 用 lrclib 按歌名/歌手搜同步歌词 */
export async function fetchOnlineLrc(song = {}) {
  const title = String(song.title || '').trim();
  const artist = String(song.author || '').trim();
  if (!title) return '';
  try {
    const q = encodeURIComponent([artist, title].filter(Boolean).join(' '));
    const res = await fetch(`https://lrclib.net/api/search?q=${q}`);
    if (!res.ok) return '';
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return '';
    const hit =
      list.find((item) => item?.syncedLyrics) ||
      list.find((item) => item?.plainLyrics) ||
      list[0];
    return hit?.syncedLyrics || hit?.plainLyrics || '';
  } catch (_) {
    return '';
  }
}

/**
 * 解析当前歌曲歌词：内嵌文本 > lrc 地址 > 同名 .lrc > 在线搜索
 */
export async function resolveSongLyrics(song = {}) {
  if (!song) return [];
  if (song.lrcText) {
    const parsed = parseLyrics(song.lrcText);
    if (parsed.length) return parsed;
    // 纯文本无时间轴：均匀占位显示
    return String(song.lrcText)
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text, i) => ({ time: i * 4, text }));
  }

  if (song.lrc) {
    const text = await fetchTextIfOk(song.lrc);
    const parsed = parseLyrics(text);
    if (parsed.length) return parsed;
  }

  const twin = guessLrcUrl(song.url);
  if (twin) {
    const text = await fetchTextIfOk(twin);
    const parsed = parseLyrics(text);
    if (parsed.length) return parsed;
  }

  const online = await fetchOnlineLrc(song);
  if (online) {
    const parsed = parseLyrics(online);
    if (parsed.length) return parsed;
    return String(online)
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text, i) => ({ time: i * 4, text }));
  }

  return [];
}

export function findLyricIndex(lyrics, currentTime) {
  if (!lyrics?.length) return -1;
  let idx = -1;
  for (let i = 0; i < lyrics.length; i += 1) {
    if (currentTime >= lyrics[i].time) idx = i;
    else break;
  }
  return idx;
}
