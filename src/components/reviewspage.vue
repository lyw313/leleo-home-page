<template>
  <Teleport to="body">
    <div class="reviews-page">
      <div class="reviews-page__scrim" :style="scrimStyle" aria-hidden="true"></div>

      <div class="reviews-sheet">
        <header class="reviews-sheet__top">
          <button type="button" class="reviews-sheet__back" @click="$emit('back')">
            ← 返回主页
          </button>
          <span class="reviews-sheet__brand">Reviews</span>
        </header>

        <div class="reviews-sheet__hero">
          <h1>对我的评价</h1>
          <p>一些路过留下的话，也有正在写下的认真。</p>
        </div>

        <div class="reviews-sheet__filters">
          <button
            v-for="f in filters"
            :key="f.key"
            type="button"
            class="reviews-chip"
            :class="{ active: filter === f.key }"
            @click="filter = f.key"
          >
            {{ f.label }} ({{ f.count }})
          </button>
        </div>
        <p class="reviews-sheet__status">正在浏览 {{ filtered.length }} / {{ items.length }} 条评价</p>

        <section class="reviews-sheet__grid">
          <article v-if="loading" class="reviews-item reviews-item--empty">加载中…</article>
          <article v-else-if="!filtered.length" class="reviews-item reviews-item--empty">
            还没有评价，来写第一条吧。
          </article>
          <article
            v-for="(item, idx) in filtered"
            :key="item.id"
            class="reviews-item"
          >
            <div class="reviews-item__index">{{ String(idx + 1).padStart(2, '0') }}</div>
            <div class="reviews-item__head">
              <h2>「{{ item.name || '匿名' }}」</h2>
              <span class="reviews-item__stars">{{ stars(item.rating) }}</span>
              <button
                v-if="isAdmin"
                type="button"
                class="reviews-item__del"
                title="删除"
                @click="remove(item.id)"
              >删除</button>
            </div>
            <p class="reviews-item__body">{{ item.content }}</p>
            <time class="reviews-item__time">{{ formatTime(item.createdAt) }}</time>
          </article>
        </section>

        <form class="reviews-compose" @submit.prevent="submit">
          <h3>留下一条评价</h3>
          <div class="reviews-compose__row">
            <input
              v-model="draft.name"
              class="reviews-compose__input"
              type="text"
              maxlength="24"
              placeholder="昵称（可选）"
            />
            <div class="reviews-compose__rate" title="评分">
              <button
                v-for="n in 5"
                :key="n"
                type="button"
                class="reviews-compose__star"
                :class="{ on: draft.rating >= n }"
                @click="draft.rating = n"
              >★</button>
            </div>
          </div>
          <textarea
            v-model="draft.content"
            class="reviews-compose__textarea"
            rows="3"
            maxlength="200"
            placeholder="写下你的评价…"
          ></textarea>
          <div class="reviews-compose__foot">
            <span>{{ hint || '最多 200 字' }}</span>
            <button type="submit" class="reviews-compose__btn" :disabled="!canSubmit || sending">
              {{ sending ? '提交中…' : '提交评价' }}
            </button>
          </div>
        </form>

        <footer class="reviews-sheet__foot">
          <span>TAKE YOUR TIME, STAY A LITTLE LONGER.</span>
          <span>李应旺</span>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { assetUrl } from '../utils/assetUrl.js';

const API = '/api/reviews';

export default {
  name: 'ReviewsPage',
  props: {
    isAdmin: { type: Boolean, default: false },
    background: { type: String, default: '/img/reviews/portrait.png' },
  },
  emits: ['back'],
  data() {
    return {
      items: [],
      loading: true,
      sending: false,
      hint: '',
      filter: 'all',
      draft: { name: '', content: '', rating: 5 },
    };
  },
  computed: {
    canSubmit() {
      return String(this.draft.content || '').trim().length >= 2;
    },
    scrimStyle() {
      const url = assetUrl(this.background);
      return {
        backgroundImage: `linear-gradient(180deg, rgba(12,16,24,0.45), rgba(12,16,24,0.62)), url('${url}')`,
      };
    },
    filters() {
      const counts = { all: this.items.length, 5: 0, 4: 0, 3: 0, low: 0 };
      this.items.forEach((it) => {
        const r = Number(it.rating) || 5;
        if (r >= 5) counts[5] += 1;
        else if (r === 4) counts[4] += 1;
        else if (r === 3) counts[3] += 1;
        else counts.low += 1;
      });
      return [
        { key: 'all', label: '全部', count: counts.all },
        { key: '5', label: '五星', count: counts[5] },
        { key: '4', label: '四星', count: counts[4] },
        { key: '3', label: '三星', count: counts[3] },
        { key: 'low', label: '其他', count: counts.low },
      ];
    },
    filtered() {
      if (this.filter === 'all') return this.items;
      if (this.filter === 'low') {
        return this.items.filter((it) => (Number(it.rating) || 5) <= 2);
      }
      const n = Number(this.filter);
      return this.items.filter((it) => (Number(it.rating) || 5) === n);
    },
  },
  mounted() {
    document.body.style.overflow = 'hidden';
    this.load();
  },
  beforeUnmount() {
    document.body.style.overflow = '';
  },
  methods: {
    stars(n) {
      const v = Math.max(1, Math.min(5, Number(n) || 5));
      return '★'.repeat(v) + '☆'.repeat(5 - v);
    },
    formatTime(ts) {
      try {
        const d = new Date(ts);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      } catch (_) {
        return '';
      }
    },
    async load() {
      this.loading = true;
      try {
        const res = await fetch(API, { credentials: 'include' });
        const data = await res.json();
        this.items = Array.isArray(data?.items) ? data.items : [];
      } catch (_) {
        this.items = [];
        this.hint = '暂时无法读取评价';
      } finally {
        this.loading = false;
      }
    },
    async submit() {
      if (!this.canSubmit || this.sending) return;
      this.sending = true;
      this.hint = '';
      try {
        const res = await fetch(API, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: this.draft.name.trim() || '匿名',
            content: this.draft.content.trim(),
            rating: this.draft.rating,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'submit failed');
        this.items = [data.item, ...this.items];
        this.draft = { name: '', content: '', rating: 5 };
        this.filter = 'all';
        this.hint = '已提交，谢谢你！';
        try { window.dispatchEvent(new Event('leleo-reviews-updated')); } catch (_) {}
        setTimeout(() => {
          if (this.hint.includes('谢谢')) this.hint = '';
        }, 2800);
      } catch (_) {
        this.hint = '提交失败，请稍后重试';
      } finally {
        this.sending = false;
      }
    },
    async remove(id) {
      if (!this.isAdmin || !id) return;
      this.hint = '';
      try {
        const me = await fetch('/api/auth/me', { credentials: 'include' });
        const meData = me.ok ? await me.json() : null;
        if (!meData?.admin) {
          this.hint = '删除需要管理员服务端登录：请先用左下角「管理员登录」（需连上后端）';
          return;
        }
        const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.status === 401) {
          this.hint = '登录已过期，请重新在左下角登录后再删除';
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          this.hint = data?.error || '删除失败';
          return;
        }
        this.items = this.items.filter((x) => x.id !== id);
        this.hint = '';
        try { window.dispatchEvent(new Event('leleo-reviews-updated')); } catch (_) {}
      } catch (_) {
        this.hint = '删除失败：网络异常';
      }
    },
  },
};
</script>

<style scoped>
.reviews-page {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 1.2rem;
  box-sizing: border-box;
}
.reviews-page__scrim {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(10px) saturate(0.9);
  transform: scale(1.04);
}
.reviews-sheet {
  position: relative;
  z-index: 1;
  width: min(980px, 100%);
  max-height: calc(100vh - 2.4rem);
  overflow: auto;
  margin: auto;
  padding: 1.35rem 1.6rem 1.2rem;
  border-radius: 22px;
  background: #f6f4ef;
  color: #1c1f24;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}
.reviews-sheet__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
}
.reviews-sheet__back {
  border: none;
  background: transparent;
  color: #5a616c;
  cursor: pointer;
  font-size: 0.86rem;
  padding: 0.25rem 0;
}
.reviews-sheet__back:hover { color: #1c1f24; }
.reviews-sheet__brand {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: #7a828e;
}
.reviews-sheet__hero h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  font-weight: 750;
  letter-spacing: 0.04em;
}
.reviews-sheet__hero p {
  margin: 0.45rem 0 0;
  color: #6b7380;
  font-size: 0.95rem;
}
.reviews-sheet__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1.25rem;
}
.reviews-chip {
  border: 1px solid #d7d2c8;
  background: transparent;
  color: #2a3038;
  border-radius: 999px;
  padding: 0.38rem 0.85rem;
  font-size: 0.82rem;
  cursor: pointer;
}
.reviews-chip.active {
  background: #1c1f24;
  border-color: #1c1f24;
  color: #f6f4ef;
}
.reviews-sheet__status {
  margin: 0.7rem 0 1rem;
  font-size: 0.78rem;
  color: #8a919c;
}
.reviews-sheet__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}
.reviews-item {
  border: 1px solid #ddd7cc;
  border-radius: 14px;
  padding: 1rem 1rem 0.9rem;
  background: rgba(255, 255, 255, 0.55);
  min-height: 140px;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.reviews-item--empty {
  grid-column: 1 / -1;
  align-items: center;
  justify-content: center;
  color: #8a919c;
  min-height: 100px;
}
.reviews-item__index {
  font-style: italic;
  color: #b0a89c;
  font-size: 0.85rem;
}
.reviews-item__head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.reviews-item__head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
}
.reviews-item__stars {
  color: #c7922a;
  letter-spacing: 0.05em;
  font-size: 0.85rem;
}
.reviews-item__del {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #b45a5a;
  cursor: pointer;
  font-size: 0.78rem;
}
.reviews-item__body {
  margin: 0;
  color: #4a5160;
  line-height: 1.55;
  font-size: 0.9rem;
  flex: 1;
}
.reviews-item__time {
  font-size: 0.74rem;
  color: #9aa1ab;
}
.reviews-compose {
  margin-top: 1.35rem;
  padding: 1rem 1.05rem 1rem;
  border: 1px solid #ddd7cc;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
}
.reviews-compose h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}
.reviews-compose__row {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  margin-bottom: 0.55rem;
}
.reviews-compose__input,
.reviews-compose__textarea {
  width: 100%;
  border: 1px solid #d7d2c8;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: #fff;
  color: #1c1f24;
  font: inherit;
  box-sizing: border-box;
}
.reviews-compose__input { max-width: 220px; }
.reviews-compose__textarea { resize: vertical; min-height: 84px; }
.reviews-compose__rate { display: inline-flex; gap: 0.15rem; }
.reviews-compose__star {
  border: none;
  background: transparent;
  color: #cfc6b8;
  font-size: 1.15rem;
  cursor: pointer;
  padding: 0 0.1rem;
}
.reviews-compose__star.on { color: #c7922a; }
.reviews-compose__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.7rem;
  font-size: 0.78rem;
  color: #8a919c;
}
.reviews-compose__btn {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.15rem;
  background: #1c1f24;
  color: #f6f4ef;
  cursor: pointer;
  font-size: 0.86rem;
}
.reviews-compose__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.reviews-sheet__foot {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.4rem;
  padding-top: 0.85rem;
  border-top: 1px solid #e4dfd5;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: #9aa1ab;
}
@media (max-width: 800px) {
  .reviews-page { padding: 0.65rem; }
  .reviews-sheet {
    padding: 1rem 0.95rem 0.9rem;
    max-height: calc(100vh - 1.3rem);
  }
  .reviews-sheet__grid { grid-template-columns: 1fr; }
  .reviews-compose__row { flex-direction: column; align-items: stretch; }
  .reviews-compose__input { max-width: none; }
}
</style>
