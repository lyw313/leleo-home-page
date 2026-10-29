<template>
  <div class="blog-editor">
    <div class="blog-editor__toolbar" role="toolbar" aria-label="正文工具栏">
      <button type="button" class="blog-editor__btn" title="大序号标题（1. 2. 3.）" @mousedown.prevent="saveSelection" @click="insertHeading(2)">
        <v-icon icon="mdi-format-header-2" size="18"></v-icon>
        大序号
      </button>
      <button type="button" class="blog-editor__btn" title="小序号标题（1.1 1.2）" @mousedown.prevent="saveSelection" @click="insertHeading(3)">
        <v-icon icon="mdi-format-header-3" size="18"></v-icon>
        小序号
      </button>
      <span class="blog-editor__sep" aria-hidden="true"></span>
      <button type="button" class="blog-editor__btn" title="有序列表" @mousedown.prevent="saveSelection" @click="exec('insertOrderedList')">
        <v-icon icon="mdi-format-list-numbered" size="18"></v-icon>
      </button>
      <button type="button" class="blog-editor__btn" title="无序列表" @mousedown.prevent="saveSelection" @click="exec('insertUnorderedList')">
        <v-icon icon="mdi-format-list-bulleted" size="18"></v-icon>
      </button>
      <button type="button" class="blog-editor__btn" title="加粗" @mousedown.prevent="saveSelection" @click="exec('bold')">
        <v-icon icon="mdi-format-bold" size="18"></v-icon>
      </button>
      <button type="button" class="blog-editor__btn" title="插入表格" @mousedown.prevent="saveSelection" @click="insertTable">
        <v-icon icon="mdi-table" size="18"></v-icon>
      </button>
      <span class="blog-editor__sep" aria-hidden="true"></span>
      <button
        type="button"
        class="blog-editor__btn blog-editor__btn--accent"
        title="在光标处插入文档附件"
        @mousedown.prevent="saveSelection"
        @click="pickFile"
      >
        <v-icon icon="mdi-file-upload-outline" size="18"></v-icon>
        上传文档
      </button>
      <input
        ref="fileInput"
        class="blog-editor__file"
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt,.html,.htm,.csv,.zip,.rar,.7z,.png,.jpg,.jpeg,.gif,.webp,application/pdf,text/plain,text/markdown,text/html,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        @change="onFileChange"
      />
      <span class="blog-editor__hint">表格可点「删除」· 文档点击打开</span>
    </div>

    <div
      ref="surface"
      class="blog-editor__surface blog-body-content"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      data-placeholder="先点到想插入的位置，再点「上传文档」。表格右上角可删除；表格后可继续换行输入。"
      @input="onInput"
      @paste="onPaste"
      @blur="onBlur"
      @keydown="onKeydown"
      @mouseup="onCaretMove"
      @keyup="onCaretMove"
      @click="onSurfaceClick"
    ></div>

    <div class="blog-editor__meta">
      <span>{{ textLength }} 字</span>
      <span v-if="uploadTip" class="blog-editor__tip">{{ uploadTip }}</span>
    </div>
  </div>
</template>

<script>
import {
  sanitizeHtml,
  softSanitizeHtml,
  textToHtml,
  stripHtml,
  isHtmlContent,
  escapeHtml,
  buildFileAttachmentHtml,
  buildTableBlockHtml,
  fileToStoredDataUrl,
  openBlogAttachment,
  ensureEditorSpacers,
} from '../utils/blogHtml.js';

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function isSpacerParagraph(el) {
  if (!el || el.tagName !== 'P') return false;
  const html = (el.innerHTML || '').replace(/\s+/g, '').toLowerCase();
  return html === '' || html === '<br>' || html === '<br/>' || html === '<br />';
}

function placeCaretIn(el, atStart = true) {
  if (!el) return;
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(atStart);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export default {
  name: 'BlogEditor',
  props: {
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      uploadTip: '',
      syncing: false,
      savedRange: null,
    };
  },
  computed: {
    textLength() {
      return stripHtml(this.modelValue).length;
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(val) {
        this.$nextTick(() => this.applyExternal(val));
      },
    },
  },
  mounted() {
    this.applyExternal(this.modelValue);
    document.addEventListener('selectionchange', this.onSelectionChange);
  },
  beforeUnmount() {
    document.removeEventListener('selectionchange', this.onSelectionChange);
  },
  methods: {
    applyExternal(val) {
      const el = this.$refs.surface;
      if (!el || this.syncing) return;
      const next = this.toEditorHtml(val);
      if (el.innerHTML === next) return;
      if (document.activeElement === el) return;
      el.innerHTML = next || '';
      ensureEditorSpacers(el);
    },
    toEditorHtml(val) {
      const raw = String(val || '');
      if (!raw.trim()) return '';
      if (isHtmlContent(raw)) return sanitizeHtml(raw);
      return `<div class="blog-plain">${escapeHtml(raw).replace(/\n/g, '<br>')}</div>`;
    },
    focus() {
      this.$refs.surface?.focus();
    },
    saveSelection() {
      const el = this.$refs.surface;
      const sel = window.getSelection();
      if (!el || !sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      this.savedRange = range.cloneRange();
    },
    onCaretMove() {
      this.saveSelection();
      this.highlightActiveCell();
    },
    onSelectionChange() {
      const el = this.$refs.surface;
      if (!el || document.activeElement !== el) {
        this.clearActiveCell();
        return;
      }
      this.highlightActiveCell();
    },
    clearActiveCell() {
      const el = this.$refs.surface;
      if (!el) return;
      el.querySelectorAll('td.is-editing, th.is-editing').forEach((cell) => {
        cell.classList.remove('is-editing');
      });
    },
    highlightActiveCell() {
      const el = this.$refs.surface;
      const sel = window.getSelection();
      if (!el || !sel || !sel.rangeCount) {
        this.clearActiveCell();
        return;
      }
      const node = sel.anchorNode;
      if (!node || !el.contains(node)) {
        this.clearActiveCell();
        return;
      }
      const cell = node.nodeType === Node.ELEMENT_NODE
        ? node.closest?.('td, th')
        : node.parentElement?.closest?.('td, th');
      this.clearActiveCell();
      if (cell && el.contains(cell)) {
        cell.classList.add('is-editing');
      }
    },
    restoreSelection() {
      const el = this.$refs.surface;
      if (!el) return false;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return false;
      if (this.savedRange && el.contains(this.savedRange.commonAncestorContainer)) {
        sel.removeAllRanges();
        sel.addRange(this.savedRange);
        return true;
      }
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      this.savedRange = range.cloneRange();
      return true;
    },
    insertHtmlAtCursor(html) {
      this.restoreSelection();
      document.execCommand('insertHTML', false, html);
      const el = this.$refs.surface;
      if (el) ensureEditorSpacers(el);
      this.saveSelection();
      this.sync();
    },
    exec(cmd, value = null) {
      this.restoreSelection();
      document.execCommand(cmd, false, value);
      this.saveSelection();
      this.sync();
    },
    insertHeading(level) {
      this.restoreSelection();
      const tag = level === 2 ? 'h2' : 'h3';
      const sel = window.getSelection();
      const text = (sel && String(sel).trim()) || (level === 2 ? '大标题' : '小标题');
      document.execCommand('insertHTML', false, `<${tag}>${escapeHtml(text)}</${tag}><p><br></p>`);
      this.saveSelection();
      this.sync();
    },
    insertTable() {
      this.insertHtmlAtCursor(sanitizeHtml(buildTableBlockHtml()));
    },
    removeTableWrap(wrap) {
      if (!wrap) return;
      const surface = this.$refs.surface;
      let spacer = wrap.nextElementSibling;
      wrap.remove();
      if (spacer && isSpacerParagraph(spacer)) {
        placeCaretIn(spacer, true);
      } else if (surface) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        if (spacer) surface.insertBefore(p, spacer);
        else surface.appendChild(p);
        placeCaretIn(p, true);
      }
      this.sync();
    },
    onInput() {
      const el = this.$refs.surface;
      if (el) ensureEditorSpacers(el);
      this.sync();
    },
    onBlur() {
      this.saveSelection();
      this.sync();
    },
    onSurfaceClick(e) {
      const delBtn = e.target?.closest?.('[data-action="delete-table"]');
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        const wrap = delBtn.closest('.blog-table-wrap');
        this.removeTableWrap(wrap);
        return;
      }

      const fileLink = e.target?.closest?.('a.blog-file');
      if (fileLink) {
        e.preventDefault();
        e.stopPropagation();
        openBlogAttachment({
          href: fileLink.getAttribute('href'),
          name: fileLink.getAttribute('data-file-name') || 'document',
          mime: fileLink.getAttribute('data-file-mime') || '',
        });
        return;
      }

      // 仅空单元格：补 <br> 并放入光标；有内容时交给浏览器，避免点后面又跳回开头
      const cell = e.target?.closest?.('td, th');
      if (cell && this.$refs.surface?.contains(cell)) {
        const empty = !(cell.textContent || '').trim();
        if (empty) {
          if (!cell.querySelector('br')) cell.innerHTML = '<br>';
          placeCaretIn(cell, true);
        }
        this.highlightActiveCell();
        this.saveSelection();
        return;
      }

      this.saveSelection();
      this.highlightActiveCell();
    },
    onPaste(e) {
      const html = e.clipboardData?.getData('text/html');
      const text = e.clipboardData?.getData('text/plain') || '';
      if (!html && !text) return;
      e.preventDefault();
      this.saveSelection();

      let inserted = '';
      if (html && /<table[\s>]/i.test(html)) {
        inserted = sanitizeHtml(`${html}<p><br></p>`);
      } else if (html && /<\/?(h[1-6]|ul|ol|li|p|strong|b|em|blockquote)[\s>]/i.test(html)) {
        inserted = sanitizeHtml(html);
      } else if (text.includes('|') && text.includes('\n')) {
        inserted = textToHtml(text);
      } else if (text) {
        inserted = text
          .split(/\n{2,}/)
          .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
          .join('');
      }

      if (!inserted) return;
      this.insertHtmlAtCursor(inserted);
      this.uploadTip = html && /<table[\s>]/i.test(html) ? '已粘贴表格（可点右上角删除）' : '';
      if (this.uploadTip) setTimeout(() => { this.uploadTip = ''; }, 2200);
    },
    onKeydown(e) {
      const surface = this.$refs.surface;
      if (!surface) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        this.exec(e.shiftKey ? 'outdent' : 'indent');
        return;
      }

      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;

      // 在表格最后一格按 Enter：跳出表格到下一空行
      if (e.key === 'Enter' && !e.shiftKey) {
        const cell = sel.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? sel.anchorNode.closest?.('td, th')
          : sel.anchorNode?.parentElement?.closest?.('td, th');
        if (cell) {
          const table = cell.closest('table');
          const wrap = cell.closest('.blog-table-wrap');
          if (table && wrap) {
            const cells = Array.from(table.querySelectorAll('td, th'));
            if (cells[cells.length - 1] === cell) {
              e.preventDefault();
              let spacer = wrap.nextElementSibling;
              if (!isSpacerParagraph(spacer)) {
                spacer = document.createElement('p');
                spacer.innerHTML = '<br>';
                wrap.after(spacer);
              }
              placeCaretIn(spacer, true);
              this.sync();
              return;
            }
          }
        }
      }

      // 空行里 Backspace：删掉上方表格
      if (e.key === 'Backspace' && sel.isCollapsed) {
        const node = sel.anchorNode;
        const offset = sel.anchorOffset;
        let block = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
        while (block && block.parentElement !== surface) block = block.parentElement;
        if (!block || block.parentElement !== surface) return;

        const atStart = (node === block && offset === 0)
          || (block.childNodes[0] === node && offset === 0)
          || (isSpacerParagraph(block) && offset === 0);

        if (!atStart) return;
        const prev = block.previousElementSibling;
        if (prev?.classList?.contains('blog-table-wrap')) {
          e.preventDefault();
          this.removeTableWrap(prev);
        }
      }
    },
    sync() {
      const el = this.$refs.surface;
      if (!el) return;
      this.syncing = true;
      ensureEditorSpacers(el);
      // 输入过程只用轻量清洗，避免完整 sanitize 重排/删段导致丢内容
      const html = softSanitizeHtml(el.innerHTML);
      const empty = !stripHtml(html) && !/<img|<table|data-blog-file|blog-file/i.test(html);
      this.$emit('update:modelValue', empty ? '' : html);
      this.$nextTick(() => { this.syncing = false; });
    },
    /** 正式保存前调用：完整 sanitize，并立刻回写 v-model */
    flush() {
      const el = this.$refs.surface;
      if (!el) return this.modelValue || '';
      this.syncing = true;
      ensureEditorSpacers(el);
      const html = sanitizeHtml(el.innerHTML);
      const empty = !stripHtml(html) && !/<img|<table|data-blog-file|blog-file/i.test(html);
      const next = empty ? '' : html;
      if (el.innerHTML !== next) el.innerHTML = next || '';
      this.$emit('update:modelValue', next);
      this.$nextTick(() => { this.syncing = false; });
      return next;
    },
    pickFile() {
      this.$refs.fileInput?.click();
    },
    async onFileChange(e) {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        this.uploadTip = '文件过大（上限约 1.5MB，浏览器本地存储限制）';
        return;
      }
      try {
        const dataUrl = await fileToStoredDataUrl(file);
        if (!dataUrl.startsWith('data:')) {
          this.uploadTip = '读取文档失败';
          return;
        }
        const card = buildFileAttachmentHtml({
          name: file.name,
          href: dataUrl,
          size: file.size,
          mime: file.type || '',
        });
        this.insertHtmlAtCursor(`${card}<p><br></p>`);
        this.uploadTip = `已插入「${file.name}」，点击即可打开`;
        setTimeout(() => { this.uploadTip = ''; }, 2800);
      } catch (_) {
        this.uploadTip = '读取文档失败';
      }
    },
  },
};
</script>

<style scoped>
.blog-editor {
  margin-bottom: 0.55rem;
}
.blog-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  margin-bottom: 0.45rem;
  padding: 0.45rem;
  border-radius: 12px 12px 0 0;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-bottom: none;
}
.blog-editor__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;
}
.blog-editor__btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.blog-editor__btn--accent {
  background: rgba(184, 240, 255, 0.14);
  border-color: rgba(184, 240, 255, 0.35);
}
.blog-editor__sep {
  width: 1px;
  height: 1.1rem;
  background: rgba(255, 255, 255, 0.16);
  margin: 0 0.15rem;
}
.blog-editor__hint {
  font-size: 0.68rem;
  opacity: 0.55;
  margin-left: auto;
}
.blog-editor__file {
  display: none;
}
.blog-editor__surface {
  min-height: min(48vh, 420px);
  max-height: min(70vh, 640px);
  overflow: auto;
  box-sizing: border-box;
  border-radius: 0 0 12px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  padding: 0.85rem 1rem;
  font: inherit;
  line-height: 1.75;
  outline: none;
  caret-color: #ffe8a0;
}
.blog-editor__surface:empty::before {
  content: attr(data-placeholder);
  color: rgba(255, 255, 255, 0.38);
  pointer-events: none;
}
.blog-editor__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  opacity: 0.7;
}
.blog-editor__tip {
  color: #b8f0ff;
}

@media (max-width: 720px) {
  .blog-editor__hint { display: none; }
}
</style>
