/**
 * 部署在子路径（如 /leleo/）时，把 /img /music 等根路径补上 Vite BASE_URL。
 */
const PUBLIC_PREFIXES = ['/img/', '/music/', '/css/', '/fonts/', '/assets/'];

export function getAssetBase() {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export function assetUrl(path) {
  if (path == null || path === '') return path;
  if (typeof path !== 'string') return path;
  if (/^(https?:|data:|blob:|\/\/)/i.test(path)) return path;
  if (path.startsWith('#') || path.startsWith('mdi-')) return path;

  const base = getAssetBase();
  if (!base) return path;

  if (path.startsWith(base + '/') || path === base) return path;

  if (path.startsWith('/')) {
    const needsPrefix = PUBLIC_PREFIXES.some((p) => path.startsWith(p)) || path === '/img' || path === '/music';
    if (needsPrefix) return `${base}${path}`;
  }
  return path;
}

/** 递归改写对象里以公共目录开头的字符串路径 */
export function withAssetBase(value) {
  if (Array.isArray(value)) return value.map(withAssetBase);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = withAssetBase(v);
    return out;
  }
  return assetUrl(value);
}
