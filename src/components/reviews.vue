<template>
  <section
    class="reviews-card building-solid"
    :style="cardStyle"
    role="button"
    tabindex="0"
    @click="goPage"
    @keydown.enter.prevent="goPage"
  >
    <div class="reviews-card__veil" aria-hidden="true"></div>
    <div class="reviews-card__body">
      <header class="reviews-card__head">
        <div>
          <div class="reviews-card__eyebrow">Reviews</div>
          <h3 class="reviews-card__title">对我的评价</h3>
        </div>
        <span class="reviews-card__count">{{ items.length }}</span>
      </header>

      <div class="reviews-card__list">
        <div v-if="loading" class="reviews-card__empty">加载中…</div>
        <div v-else-if="!previewItems.length" class="reviews-card__empty">
          还没有评价，点击进入评价页
        </div>
        <article
          v-for="item in previewItems"
          :key="item.id"
          class="reviews-card__item"
        >
          <div class="reviews-card__item-top">
            <strong>{{ item.name }}</strong>
            <span class="reviews-card__stars">{{ stars(item.rating) }}</span>
          </div>
          <p>{{ item.content }}</p>
          <time>{{ formatTime(item.createdAt) }}</time>
        </article>
      </div>

      <div class="reviews-card__more" aria-hidden="true">
        进入评价页
        <span>›</span>
      </div>
    </div>
  </section>
</template>

<script>
import { assetUrl } from '../utils/assetUrl.js';

const API = '/api/reviews';

export default {
  name: 'ReviewsCard',
  props: {
    background: { type: String, default: '/img/reviews/portrait.png' },
  },
  emits: ['open-reviews'],
  data() {
    return {
      items: [],
      loading: true,
    };
  },
  computed: {
    previewItems() {
      return [...this.items]
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
        .slice(0, 4);
    },
    cardStyle() {
      const url = assetUrl(this.background);
      return { '--reviews-bg': `url('${url}')` };
    },
  },
  mounted() {
    this.load();
    window.addEventListener('leleo-reviews-updated', this.load);
  },
  beforeUnmount() {
    window.removeEventListener('leleo-reviews-updated', this.load);
  },
  methods: {
    goPage() {
      this.$emit('open-reviews');
      // 兜底：直接改 hash，避免父组件事件没接上
      try {
        if ((location.hash || '').replace(/^#\/?/, '') !== 'reviews') {
          location.hash = 'reviews';
        }
      } catch (_) {}
    },
    stars(n) {
      const v = Math.max(1, Math.min(5, Number(n) || 5));
      return '★'.repeat(v) + '☆'.repeat(5 - v);
    },
    formatTime(ts) {
      try {
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.reviews-card {
  position: relative;
  width: 100%;
  max-width: none;
  margin: 0.55rem 0 0.35rem;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background:
    linear-gradient(135deg, rgba(12, 24, 48, 0.55), rgba(8, 16, 32, 0.72)),
    var(--reviews-bg) right 18% / cover no-repeat;
  color: #f4f7ff;
  text-align: left;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
  box-sizing: border-box;
  cursor: pointer;
}
.reviews-card:hover .reviews-card__more {
  background: rgba(255, 255, 255, 0.22);
}
.reviews-card__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(105deg, rgba(8, 14, 28, 0.82) 0%, rgba(8, 14, 28, 0.55) 48%, rgba(8, 14, 28, 0.28) 100%);
  pointer-events: none;
}
.reviews-card__body {
  position: relative;
  z-index: 1;
  padding: 0.85rem 0.9rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.reviews-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  flex-shrink: 0;
}
.reviews-card__eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.65;
}
.reviews-card__title {
  margin: 0.15rem 0 0;
  font-size: 1.05rem;
  font-weight: 750;
}
.reviews-card__count {
  min-width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.14);
}
.reviews-card__list {
  flex: 1 1 auto;
  min-height: 120px;
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-right: 0.15rem;
}
.reviews-card__empty {
  margin: auto;
  opacity: 0.65;
  font-size: 0.86rem;
  text-align: center;
  padding: 1rem 0.5rem;
}
.reviews-card__item {
  padding: 0.55rem 0.6rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.reviews-card__item-top {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.25rem;
}
.reviews-card__item-top strong { font-size: 0.86rem; }
.reviews-card__stars {
  color: #ffd27a;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}
.reviews-card__item p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  opacity: 0.9;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.reviews-card__item time {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.7rem;
  opacity: 0.55;
}
.reviews-card__more {
  flex-shrink: 0;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  padding: 0.6rem 0.9rem;
  background: rgba(255, 255, 255, 0.16);
  color: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-sizing: border-box;
}
.reviews-card__more span {
  font-size: 1.1rem;
  line-height: 1;
}
</style>
