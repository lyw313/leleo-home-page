/** Kugou personal collection playlist helper */

const KG_SALT = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt';
const METING = 'https://api.i-meto.com/meting/api';

async function md5Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('MD5', data).catch(() => null);
  if (buf) {
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // SubtleCrypto may lack MD5 in some browsers — use spark-md5 fallback via dynamic import path avoided;
  // use a tiny pure JS md5 below.
  return md5Fallback(text);
}

function md5Fallback(string) {
  function cmn(q, a, b, x, s, t) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  function toUtf8(s) {
    return unescape(encodeURIComponent(s));
  }

  const msg = toUtf8(string);
  const n = msg.length;
  const words = [];
  for (let i = 0; i < n; i += 1) {
    words[i >> 2] |= msg.charCodeAt(i) << ((i % 4) * 8);
  }
  words[n >> 2] |= 0x80 << ((n % 4) * 8);
  const l = ((n + 8) >> 6) + 1;
  words[l * 16 - 2] = n * 8;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < l; i += 1) {
    const oa = a;
    const ob = b;
    const oc = c;
    const od = d;
    const x = words.slice(i * 16, i * 16 + 16);
    while (x.length < 16) x.push(0);

    a = ff(a, b, c, d, x[0], 7, -680876936);
    d = ff(d, a, b, c, x[1], 12, -389564586);
    c = ff(c, d, a, b, x[2], 17, 606105819);
    b = ff(b, c, d, a, x[3], 22, -1044525330);
    a = ff(a, b, c, d, x[4], 7, -176418897);
    d = ff(d, a, b, c, x[5], 12, 1200080426);
    c = ff(c, d, a, b, x[6], 17, -1473231341);
    b = ff(b, c, d, a, x[7], 22, -45705983);
    a = ff(a, b, c, d, x[8], 7, 1770035416);
    d = ff(d, a, b, c, x[9], 12, -1958414417);
    c = ff(c, d, a, b, x[10], 17, -42063);
    b = ff(b, c, d, a, x[11], 22, -1990404162);
    a = ff(a, b, c, d, x[12], 7, 1804603682);
    d = ff(d, a, b, c, x[13], 12, -40341101);
    c = ff(c, d, a, b, x[14], 17, -1502002290);
    b = ff(b, c, d, a, x[15], 22, 1236535329);

    a = gg(a, b, c, d, x[1], 5, -165796510);
    d = gg(d, a, b, c, x[6], 9, -1069501632);
    c = gg(c, d, a, b, x[11], 14, 643717713);
    b = gg(b, c, d, a, x[0], 20, -373897302);
    a = gg(a, b, c, d, x[5], 5, -701558691);
    d = gg(d, a, b, c, x[10], 9, 38016083);
    c = gg(c, d, a, b, x[15], 14, -660478335);
    b = gg(b, c, d, a, x[4], 20, -405537848);
    a = gg(a, b, c, d, x[9], 5, 568446438);
    d = gg(d, a, b, c, x[14], 9, -1019803690);
    c = gg(c, d, a, b, x[3], 14, -187363961);
    b = gg(b, c, d, a, x[8], 20, 1163531501);
    a = gg(a, b, c, d, x[13], 5, -1444681467);
    d = gg(d, a, b, c, x[2], 9, -51403784);
    c = gg(c, d, a, b, x[7], 14, 1735328473);
    b = gg(b, c, d, a, x[12], 20, -1926607734);

    a = hh(a, b, c, d, x[5], 4, -378558);
    d = hh(d, a, b, c, x[8], 11, -2022574463);
    c = hh(c, d, a, b, x[11], 16, 1839030562);
    b = hh(b, c, d, a, x[14], 23, -35309556);
    a = hh(a, b, c, d, x[1], 4, -1530992060);
    d = hh(d, a, b, c, x[4], 11, 1272893353);
    c = hh(c, d, a, b, x[7], 16, -155497632);
    b = hh(b, c, d, a, x[10], 23, -1094730640);
    a = hh(a, b, c, d, x[13], 4, 681279174);
    d = hh(d, a, b, c, x[0], 11, -358537222);
    c = hh(c, d, a, b, x[3], 16, -722521979);
    b = hh(b, c, d, a, x[6], 23, 76029189);
    a = hh(a, b, c, d, x[9], 4, -640364487);
    d = hh(d, a, b, c, x[12], 11, -421815835);
    c = hh(c, d, a, b, x[15], 16, 530742520);
    b = hh(b, c, d, a, x[2], 23, -995338651);

    a = ii(a, b, c, d, x[0], 6, -198630844);
    d = ii(d, a, b, c, x[7], 10, 1126891415);
    c = ii(c, d, a, b, x[14], 15, -1416354905);
    b = ii(b, c, d, a, x[5], 21, -57434055);
    a = ii(a, b, c, d, x[12], 6, 1700485571);
    d = ii(d, a, b, c, x[3], 10, -1894986606);
    c = ii(c, d, a, b, x[10], 15, -1051523);
    b = ii(b, c, d, a, x[1], 21, -2054922799);
    a = ii(a, b, c, d, x[8], 6, 1873313359);
    d = ii(d, a, b, c, x[15], 10, -30611744);
    c = ii(c, d, a, b, x[6], 15, -1560198380);
    b = ii(b, c, d, a, x[13], 21, 1309151649);
    a = ii(a, b, c, d, x[4], 6, -145523070);
    d = ii(d, a, b, c, x[11], 10, -1120210379);
    c = ii(c, d, a, b, x[2], 15, 718787259);
    b = ii(b, c, d, a, x[9], 21, -343485551);

    a = (a + oa) | 0;
    b = (b + ob) | 0;
    c = (c + oc) | 0;
    d = (d + od) | 0;
  }

  function hex(n) {
    let s = '';
    for (let j = 0; j < 4; j += 1) {
      s += ((n >> (j * 8)) & 255).toString(16).padStart(2, '0');
    }
    return s;
  }
  return hex(a) + hex(b) + hex(c) + hex(d);
}

function signParams(params) {
  const keys = Object.keys(params).sort();
  const joined = keys.map((k) => `${k}=${params[k]}`).join('');
  return md5Fallback(KG_SALT + joined + KG_SALT);
}

function parseFilename(filename = '') {
  const parts = String(filename).split(' - ');
  if (parts.length >= 2) {
    return { author: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { author: '未知歌手', title: filename || '未知歌曲' };
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchViaProxy(url, headers = {}) {
  // allorigins as CORS fallback
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxy);
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  return res.json();
}

async function fetchKugouPage(globalSpecialId, page = 1, pagesize = 50) {
  const t = String(Date.now());
  const params = {
    appid: '1058',
    clienttime: t,
    clientver: '20000',
    dfid: '-',
    global_specialid: globalSpecialId,
    mid: t,
    page: String(page),
    pagesize: String(pagesize),
    plat: '0',
    specialid: '0',
    srcappid: '2919',
    uuid: t,
    version: '8000',
  };
  params.signature = signParams(params);
  const qs = new URLSearchParams(params).toString();
  const url = `https://mobiles.kugou.com/api/v5/special/song_v2?${qs}`;
  const headers = {
    Referer: 'https://m3ws.kugou.com/share/index.php',
  };

  try {
    return await fetchJson(url, headers);
  } catch {
    return fetchViaProxy(url, headers);
  }
}

function mapKugouSong(item) {
  const { title, author } = parseFilename(item.filename || item.songname || '');
  const hash = (item.hash || item['320hash'] || '').toLowerCase();
  const albumId = item.album_id || 0;
  return {
    title,
    author,
    hash,
    album_id: albumId,
    url: '', // filled lazily via meting
    pic: albumId
      ? `https://imgessl.kugou.com/stdmusic/120/${String(albumId).padStart(9, '0').replace(/(\d{3})(\d{3})(\d{3})/, '$1/$2/$3')}.jpg`
      : '',
    lrc: '',
  };
}

/** Fix cover URL — Kugou album covers often use hash-based paths; fall back empty and let meting fill. */
function normalizeSong(song) {
  return {
    ...song,
    pic: song.pic || '',
  };
}

export async function fetchKugouCollection(globalSpecialId, maxPages = 4) {
  const songs = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const data = await fetchKugouPage(globalSpecialId, page, 50);
    const list = data?.data?.info || data?.info || [];
    if (!list.length) break;
    for (const item of list) {
      const mapped = normalizeSong(mapKugouSong(item));
      if (mapped.hash) songs.push(mapped);
    }
    const total = data?.data?.total || data?.total || songs.length;
    if (songs.length >= total || list.length < 50) break;
  }
  return songs;
}

export async function resolveKugouSongUrl(song) {
  if (song.url) return song;
  if (!song.hash) return song;

  const res = await fetch(`${METING}?server=kugou&type=song&id=${song.hash}`);
  if (!res.ok) throw new Error('meting song failed');
  const arr = await res.json();
  const meta = Array.isArray(arr) ? arr[0] : arr;
  if (!meta) return song;

  return {
    ...song,
    title: meta.title || song.title,
    author: meta.author || song.author,
    url: meta.url || '',
    pic: meta.pic || song.pic,
    lrc: meta.lrc || '',
  };
}

export function isValidMetingList(list) {
  return Array.isArray(list) && list.length > 0 && list.some((s) => s?.title && s?.url);
}
