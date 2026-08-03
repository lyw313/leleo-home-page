const ALLOWED_TAGS = new Set([
  'P', 'BR', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'CAPTION', 'COLGROUP', 'COL',
  'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'A', 'IMG',
]);

const ALLOWED_ATTRS = {
  A: ['href', 'title', 'target', 'rel', 'download', 'class', 'contenteditable', 'data-blog-file', 'data-file-name', 'data-file-size', 'data-file-mime'],
  IMG: ['src', 'alt', 'title'],
  TD: ['colspan', 'rowspan'],
  TH: ['colspan', 'rowspan'],
  COL: ['span'],
  OL: ['start', 'type'],
  LI: ['value'],
  CODE: ['class'],
  PRE: ['class'],
  DIV: ['class', 'data-blog-table', 'data-blog-file', 'contenteditable', 'data-action'],
  SPAN: ['class', 'data-action', 'contenteditable', 'title'],
  TABLE: ['class'],
};

function isSafeUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return false;
  if (value.startsWith('#')) return true;
  if (value.startsWith('data:')) {
    const mime = value.slice(5).split(/[;,]/)[0].toLowerCase();
    if (!mime || mime === 'text/html' || mime.includes('javascript') || mime.includes('ecmascript')) {
      return false;
    }
    return true;
  }
  return /^(https?:|mailto:|tel:|\/|blob:)/i.test(value);
}

export function formatFileSize(bytes = 0) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function isTextLikeFile(name = '', mime = '') {
  const n = String(name || '').toLowerCase();
  const m = String(mime || '').toLowerCase();
  if (/^text\//.test(m) || m === 'application/json' || m === 'application/xml') return true;
  return /\.(txt|md|markdown|csv|json|xml|html?|log|css|js|ts|vue|py|java|c|cpp|h|hpp|sql)$/i.test(n);
}

/** 按 UTF-8 / GB18030 智能读文本，避免中文乱码 */
export async function readTextSmart(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (_) {
    try {
      return new TextDecoder('gb18030').decode(bytes);
    } catch (_) {
      return new TextDecoder('utf-8').decode(bytes);
    }
  }
}

export function textToUtf8DataUrl(text, mime = 'text/plain') {
  const safeMime = String(mime || 'text/plain').split(';')[0] || 'text/plain';
  const bytes = new TextEncoder().encode(String(text ?? ''));
  return `data:${safeMime};charset=utf-8;base64,${bytesToBase64(bytes)}`;
}

export async function fileToStoredDataUrl(file) {
  if (isTextLikeFile(file.name, file.type)) {
    const text = await readTextSmart(file);
    const mime = file.type && /^text\//i.test(file.type)
      ? file.type.split(';')[0]
      : (/\.html?$/i.test(file.name) ? 'text/html' : /\.csv$/i.test(file.name) ? 'text/csv' : 'text/plain');
    return textToUtf8DataUrl(text, mime);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read fail'));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl = '') {
  const raw = String(dataUrl || '');
  if (!raw.startsWith('data:')) return new Blob();
  const comma = raw.indexOf(',');
  if (comma < 0) return new Blob();
  const meta = raw.slice(5, comma);
  const data = raw.slice(comma + 1);
  const parts = meta.split(';').filter(Boolean);
  const mime = parts[0] || 'application/octet-stream';
  const isBase64 = parts.some((p) => p.toLowerCase() === 'base64');
  const charsetPart = parts.find((p) => /^charset=/i.test(p));
  const type = charsetPart ? `${mime.split(';')[0]};${charsetPart}` : mime;

  if (isBase64) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  try {
    return new Blob([decodeURIComponent(data)], { type: type || 'text/plain;charset=utf-8' });
  } catch (_) {
    return new Blob([data], { type: type || 'text/plain;charset=utf-8' });
  }
}

/** 用 Blob 打开/下载，避免 data URL 中文乱码 */
export function openBlogAttachment({ href, name = 'document', mime = '' } = {}) {
  const fileName = String(name || 'document');
  let blob;
  if (String(href || '').startsWith('data:')) {
    blob = dataUrlToBlob(href);
  } else {
    return window.open(href, '_blank', 'noopener,noreferrer');
  }

  let type = blob.type || mime || 'application/octet-stream';
  if (isTextLikeFile(fileName, type) && !/charset=/i.test(type)) {
    type = `${type.split(';')[0] || 'text/plain'};charset=utf-8`;
    blob = new Blob([blob], { type });
  }

  const previewable = /^(application\/pdf|text\/|image\/)/i.test(type)
    || /\.(pdf|txt|md|markdown|png|jpe?g|gif|webp|html?|csv)$/i.test(fileName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  a.target = '_blank';
  if (!previewable) a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** 生成可点击打开的文档附件 HTML（插在光标处） */
export function buildFileAttachmentHtml({ name, href, size, mime = '' } = {}) {
  const fileName = String(name || '未命名文档').slice(0, 180);
  const safeHref = String(href || '');
  const sizeText = formatFileSize(size);
  const safeMime = String(mime || '').slice(0, 120);
  return [
    `<a class="blog-file" data-blog-file="1" contenteditable="false"`,
    ` href="${escapeHtml(safeHref)}"`,
    ` title="点击打开 ${escapeHtml(fileName)}"`,
    ` data-file-name="${escapeHtml(fileName)}"`,
    ` data-file-size="${escapeHtml(String(size || 0))}"`,
    ` data-file-mime="${escapeHtml(safeMime)}"`,
    ` target="_blank" rel="noopener noreferrer">`,
    `<span class="blog-file__badge">文档</span>`,
    `<span class="blog-file__name">${escapeHtml(fileName)}</span>`,
    `<span class="blog-file__meta">${escapeHtml(sizeText)} · 点击打开</span>`,
    `</a>`,
  ].join('');
}

export function buildTableBlockHtml(innerTableHtml = '') {
  const table = innerTableHtml || `<table>
    <thead><tr><th>类别</th><th>技术/组件</th></tr></thead>
    <tbody>
      <tr><td>示例</td><td>内容</td></tr>
      <tr><td></td><td></td></tr>
    </tbody>
  </table>`;
  return [
    `<div class="blog-table-wrap" data-blog-table="1">`,
    `<div class="blog-table-wrap__bar" contenteditable="false">`,
    `<span>表格</span>`,
    `<span class="blog-table-wrap__del" data-action="delete-table" title="删除表格" contenteditable="false">删除</span>`,
    `</div>`,
    table,
    `</div>`,
    `<p><br></p>`,
  ].join('');
}

export function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripHtml(html = '') {
  const raw = String(html || '');
  if (!raw) return '';
  if (typeof document !== 'undefined') {
    const box = document.createElement('div');
    box.innerHTML = raw;
    return (box.textContent || box.innerText || '').replace(/\s+/g, ' ').trim();
  }
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isHtmlContent(content = '') {
  return /<\/?[a-z][\s\S]*>/i.test(String(content || ''));
}

function cleanNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName.toUpperCase();
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META' || tag === 'IFRAME') {
    return null;
  }

  // ChatGPT / AI 工具粘贴的「表格」外壳：保留内部真正表格
  if (tag === 'BUTTON' || tag === 'SVG' || tag === 'PATH') return null;

  if (!ALLOWED_TAGS.has(tag)) {
    const frag = document.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) frag.appendChild(cleaned);
    });
    return frag.childNodes.length ? frag : null;
  }

  const el = document.createElement(tag.toLowerCase());
  const allow = ALLOWED_ATTRS[tag] || [];
  allow.forEach((attr) => {
    const val = node.getAttribute(attr);
    if (val == null || val === '') return;
    if ((attr === 'href' || attr === 'src') && !isSafeUrl(val)) return;
    if (attr === 'class' && !/^[\w\s\-:.]+$/.test(val)) return;
    el.setAttribute(attr, val);
  });

  if (tag === 'A') {
    el.setAttribute('rel', 'noopener noreferrer');
    if (!el.getAttribute('target')) el.setAttribute('target', '_blank');
  }

  Array.from(node.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) el.appendChild(cleaned);
  });

  return el;
}

function isSpacerParagraph(el) {
  if (!el || el.tagName !== 'P') return false;
  const html = (el.innerHTML || '').replace(/\s+/g, '').toLowerCase();
  return html === '' || html === '<br>' || html === '<br/>' || html === '<br />';
}

function ensureTableBar(wrap) {
  let bar = wrap.querySelector(':scope > .blog-table-wrap__bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'blog-table-wrap__bar';
    wrap.insertBefore(bar, wrap.firstChild);
  }
  bar.setAttribute('contenteditable', 'false');
  if (!bar.querySelector('[data-action="delete-table"]')) {
    bar.innerHTML = [
      '<span>表格</span>',
      '<span class="blog-table-wrap__del" data-action="delete-table" title="删除表格" contenteditable="false">删除</span>',
    ].join('');
  }
}

function wrapTableBlocks(root) {
  const tables = Array.from(root.querySelectorAll('table'));
  tables.forEach((table) => {
    let wrap = table.closest('.blog-table-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'blog-table-wrap';
      wrap.setAttribute('data-blog-table', '1');
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }
    ensureTableBar(wrap);
  });
}

/** 表格/附件后保证可落点：没有下一节点时补空行；紧贴另一块级附件时插入空行 */
export function ensureEditorSpacers(root) {
  if (!root) return;
  const blocks = Array.from(root.querySelectorAll('.blog-table-wrap, a.blog-file'));
  blocks.forEach((block) => {
    const next = block.nextSibling;
    if (!next) {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      block.after(p);
      return;
    }
    if (next.nodeType === Node.TEXT_NODE) {
      const text = next.textContent || '';
      const pGap = document.createElement('p');
      pGap.innerHTML = '<br>';
      if (text.trim()) {
        const hold = document.createElement('p');
        hold.textContent = text;
        next.replaceWith(hold);
        block.after(pGap);
      } else {
        next.replaceWith(pGap);
      }
      return;
    }
    if (next.nodeType !== Node.ELEMENT_NODE) return;
    if (isSpacerParagraph(next)) return;
    // 两个表格/附件紧挨着时，中间留空行方便插入光标
    if (next.classList?.contains('blog-table-wrap') || next.classList?.contains('blog-file')) {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      block.after(p);
    }
  });
}

/** 清洗粘贴 / 上传得到的 HTML，保留表格结构 */
export function sanitizeHtml(html = '') {
  const raw = String(html || '').trim();
  if (!raw || typeof document === 'undefined') return raw;

  const template = document.createElement('template');
  template.innerHTML = raw;

  // 若外层是「表格」卡片（含复制/下载按钮），尽量抽出 table
  const allTables = template.content.querySelectorAll('table');
  let sourceRoot = template.content;
  if (allTables.length === 1) {
    const text = (template.content.textContent || '').replace(/\s+/g, '');
    if (text.startsWith('表格') || template.content.querySelector('button, svg')) {
      const frag = document.createDocumentFragment();
      frag.appendChild(allTables[0].cloneNode(true));
      Array.from(template.content.childNodes).forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'TABLE') return;
        if (n.contains && n.contains(allTables[0])) return;
        const t = (n.textContent || '').trim();
        if (!t || t === '表格' || t === '删除') return;
        if (n.nodeType === Node.TEXT_NODE) {
          const p = document.createElement('p');
          p.textContent = t;
          frag.insertBefore(p, frag.firstChild);
        } else if (n.nodeType === Node.ELEMENT_NODE && !n.querySelector?.('table')) {
          frag.insertBefore(n.cloneNode(true), frag.firstChild);
        }
      });
      sourceRoot = frag;
    }
  }

  const out = document.createElement('div');
  Array.from(sourceRoot.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) out.appendChild(cleaned);
  });

  wrapTableBlocks(out);
  ensureEditorSpacers(out);

  // 去掉空壳，但保留表格/附件后的换行占位段落
  out.querySelectorAll('p, div, span').forEach((el) => {
    if (el.classList.contains('blog-table-wrap') || el.classList.contains('blog-table-wrap__bar')) return;
    if (el.classList.contains('blog-table-wrap__del') || el.classList.contains('blog-file')) return;
    if (el.getAttribute('data-action') === 'delete-table') return;
    if (isSpacerParagraph(el)) {
      const prev = el.previousElementSibling;
      if (prev && (prev.classList.contains('blog-table-wrap') || prev.classList.contains('blog-file'))) {
        return;
      }
      // 连续多个空段只留一个（跟在块后时）
      if (prev && isSpacerParagraph(prev)) {
        el.remove();
      }
      return;
    }
    if (el.querySelector('table, img, br, a.blog-file')) return;
    if (!(el.textContent || '').trim()) el.remove();
  });

  ensureEditorSpacers(out);
  return out.innerHTML.trim();
}

/** 纯文本 / Markdown 轻量转 HTML（上传 .md/.txt 用） */
export function textToHtml(text = '') {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return '';

  const lines = raw.split('\n');
  const blocks = [];
  let i = 0;
  let para = [];

  const flushPara = () => {
    if (!para.length) return;
    const body = para
      .map((line) => escapeHtml(line).replace(/`([^`]+)`/g, '<code>$1</code>'))
      .join('<br>');
    blocks.push(`<p>${body}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Markdown 表格
    if (trimmed.includes('|') && i + 1 < lines.length && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(lines[i + 1].trim())) {
      flushPara();
      const rows = [];
      while (i < lines.length && lines[i].trim().includes('|')) {
        const rowLine = lines[i].trim();
        if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(rowLine)) {
          i += 1;
          continue;
        }
        const cells = rowLine
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
        rows.push(cells);
        i += 1;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        const thead = `<thead><tr>${head.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
        const tbody = `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
        blocks.push(`<div class="blog-table-wrap" data-blog-table="1"><div class="blog-table-wrap__bar"><span>表格</span></div><table>${thead}${tbody}</table></div>`);
      }
      continue;
    }

    if (!trimmed) {
      flushPara();
      i += 1;
      continue;
    }

    const h = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (h) {
      flushPara();
      const level = Math.min(h[1].length, 6);
      blocks.push(`<h${level}>${escapeHtml(h[2])}</h${level}>`);
      i += 1;
      continue;
    }

    const ol = /^(\d+)[\.、\)]\s+(.+)$/.exec(trimmed);
    if (ol) {
      flushPara();
      const items = [];
      while (i < lines.length) {
        const m = /^(\d+)[\.、\)]\s+(.+)$/.exec(lines[i].trim());
        if (!m) break;
        items.push(`<li>${escapeHtml(m[2])}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const ul = /^[-*•]\s+(.+)$/.exec(trimmed);
    if (ul) {
      flushPara();
      const items = [];
      while (i < lines.length) {
        const m = /^[-*•]\s+(.+)$/.exec(lines[i].trim());
        if (!m) break;
        items.push(`<li>${escapeHtml(m[1])}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    para.push(line);
    i += 1;
  }
  flushPara();
  return sanitizeHtml(blocks.join(''));
}

/** 阅读区渲染：旧纯文本兼容 + HTML 清洗 */
export function renderBlogHtml(content = '') {
  const raw = String(content || '');
  if (!raw.trim()) return '';
  if (isHtmlContent(raw)) return sanitizeHtml(raw);
  return `<div class="blog-plain">${escapeHtml(raw).replace(/\n/g, '<br>')}</div>`;
}

export function plainExcerpt(content = '', len = 80) {
  const text = stripHtml(content);
  if (text.length <= len) return text;
  return `${text.slice(0, len)}…`;
}
