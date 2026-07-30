<template>
  <div class="reviews-page">
    <div class="reviews-page__scrim" :style="scrimStyle" aria-hidden="true"></div>
    <div class="reviews-page__inner">
      <header class="reviews-page__header">
        <button type="button" class="reviews-page__back" @click="$emit('back')">
          <v-icon icon="mdi-arrow-left" size="18"></v-icon>
          返回主页
        </button>
        <div class="reviews-page__hero">
          <p class="reviews-page__eyebrow">Reviews</p>
          <h1 class="reviews-page__title">大家的评价</h1>
          <p class="reviews-page__subtitle">真诚的一句话，比很多点赞更有分量。</p>
        </div>
      </header>

      <div class="reviews-page__layout">
        <section class="reviews-compose">
          <div class="reviews-compose__head">
            <h2>写一条评价</h2>
            <p>名字必填，关系可选，内容至少两个字。</p>
          </div>

          <div class="reviews-compose__grid">
            <label class="reviews-field">
              <span>你的名字</span>
              <input v-model="form.name" maxlength="20" placeholder="怎么称呼你" />
            </label>
            <label class="reviews-field">
              <span>你们的关系</span>
              <input v-model="form.relation" maxlength="20" placeholder="同学 / 朋友 / 家人…" />
            </label>
          </div>

          <label class="reviews-field">
            <span>评价内容</span>
            <textarea
              v-model="form.text"
              maxlength="300"
              rows="3"
              placeholder="说说你眼中的 TA…"
            ></textarea>
          </label>

          <div class="reviews-compose__foot">
            <span class="reviews-compose__count">{{ form.text.length }}/300</span>
            <button type="button" class="reviews-compose__submit" :disabled="!canSubmit" @click="submit">
              发布评价
            </button>
          </div>
          <p v-if="hint" class="reviews-compose__hint">{{ hint }}</p>
        </section>

        <section class="reviews-list">
          <div class="reviews-list__head">
            <div>
              <h2>全部评价</h2>
              <p>按时间倒序排列</p>
            </div>
            <span class="reviews-list__count">{{ reviews.length }}</span>
          </div>

          <div class="reviews-list__body">
            <div v-if="!reviews.length" class="reviews-empty">
              <span class="reviews-empty__mark">“ ”</span>
              <p>还没有评价，来当第一条吧。</p>
            </div>

            <article v-for="item in reviews" :key="item.id" class="review-card">
              <div class="review-card__top">
                <span class="review-card__avatar">{{ (item.name || '?').slice(0, 1) }}</span>
                <div class="review-card__meta">
                  <div class="review-card__name">{{ item.name }}</div>
                  <div class="review-card__sub">
                    <span v-if="item.relation" class="review-card__tag">{{ item.relation }}</span>
                    <span v-if="item.createdAt">{{ formatTime(item.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <p class="review-card__text">{{ item.text }}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { loadReviews, addReview } from '../utils/commentsStore.js';

export default {
  name: 'ReviewsPage',
  props: {
    seed: { type: Array, default: () => [] },
    background: { type: String, default: '/img/world/life/sunset.png' },
  },
  emits: ['back'],
  data() {
    return {
      reviews: [],
      hint: '',
      form: {
        name: '',
        relation: '',
        text: '',
      },
    };
  },
  computed: {
    canSubmit() {
      return this.form.name.trim().length > 0 && this.form.text.trim().length >= 2;
    },
    scrimStyle() {
      return {
        '--page-bg': this.background ? `url(${this.background})` : 'none',
      };
    },
  },
  created() {
    this.reviews = loadReviews(this.seed);
  },
  methods: {
    formatTime(ts) {
      try {
        const d = new Date(ts);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${d.getFullYear()}-${m}-${day} ${h}:${min}`;
      } catch (_) {
        return '';
      }
    },
    submit() {
      if (!this.canSubmit) return;
      this.reviews = addReview(this.reviews, this.form);
      this.form = { name: '', relation: '', text: '' };
      this.hint = '发布成功，谢谢你的评价！';
      setTimeout(() => {
        this.hint = '';
      }, 2500);
    },
  },
};
</script>

<style scoped>
.reviews-page {
  position: absolute;
  inset: 0;
  z-index: 20;
  overflow: auto;
  color: #f4f6f8;
}

.reviews-page__scrim {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 80% 55% at 12% -10%, rgba(255, 220, 140, 0.12), transparent 50%),
    radial-gradient(ellipse 70% 50% at 95% 0%, rgba(140, 210, 255, 0.08), transparent 45%),
    linear-gradient(165deg, rgba(10, 14, 20, 0.72), rgba(10, 14, 20, 0.58)),
    var(--page-bg, none) center / cover no-repeat;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.reviews-page__inner {
  position: relative;
  z-index: 1;
  max-width: 1280px;
  min-height: 100%;
  margin: 0 auto;
  padding: 1.6rem 1.35rem 3rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.reviews-page__header {
  margin-bottom: 1.75rem;
}

.reviews-page__back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 1.35rem;
  padding: 0.5rem 0.95rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.12);
  color: #f4f6f8;
  cursor: pointer;
  font-size: 0.86rem;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.reviews-page__back:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.35);
}

.reviews-page__eyebrow {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(244, 246, 248, 0.62);
}

.reviews-page__title {
  margin: 0;
  font-family: "myfont", "Segoe UI", sans-serif;
  font-size: clamp(1.85rem, 4vw, 2.45rem);
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.15;
  color: #ffffff;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.35);
}

.reviews-page__subtitle {
  margin: 0.65rem 0 0;
  max-width: 28rem;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(244, 246, 248, 0.82);
}

.reviews-page__layout {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 1.1rem;
  align-items: start;
  min-height: min(84vh, 900px);
}

.reviews-compose,
.reviews-list {
  border-radius: 24px;
  background: rgba(22, 28, 36, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 40px rgba(0, 0, 0, 0.28);
  padding: 1.35rem 1.4rem 1.45rem;
  backdrop-filter: blur(10px);
}

.reviews-compose {
  align-self: start;
  padding: 0.9rem 0.95rem 1rem;
  min-width: 0;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  min-height: min(84vh, 900px);
  min-width: 0;
  padding: 1.4rem 1.5rem 1.2rem;
}

.reviews-compose__head h2,
.reviews-list__head h2 {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #ffffff;
}

.reviews-compose__head p,
.reviews-list__head p {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: rgba(244, 246, 248, 0.62);
}

.reviews-compose__head {
  margin-bottom: 1.15rem;
}

.reviews-compose__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.reviews-list__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.1rem;
  flex-shrink: 0;
}

.reviews-list__body {
  flex: 1 1 auto;
  overflow: auto;
  min-height: 0;
  padding-right: 0.15rem;
}

.reviews-list__count {
  min-width: 2.1rem;
  height: 2.1rem;
  padding: 0 0.55rem;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1a1f28;
  background: linear-gradient(135deg, #ffe8a0, #c8f0ff);
}

.reviews-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
  font-size: 0.8rem;
}
.reviews-field span {
  color: rgba(244, 246, 248, 0.72);
  letter-spacing: 0.04em;
}

.reviews-field input,
.reviews-field textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.35);
  color: #f4f6f8;
  padding: 0.78rem 0.9rem;
  font: inherit;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.reviews-field input::placeholder,
.reviews-field textarea::placeholder {
  color: rgba(244, 246, 248, 0.4);
}
.reviews-field input:focus,
.reviews-field textarea:focus {
  border-color: rgba(255, 232, 160, 0.55);
  background: rgba(0, 0, 0, 0.45);
}
.reviews-field textarea {
  min-height: 88px;
}

.reviews-compose__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.reviews-compose__count {
  font-size: 0.75rem;
  color: rgba(244, 246, 248, 0.55);
}
.reviews-compose__submit {
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1.35rem;
  font-weight: 700;
  cursor: pointer;
  color: #1a1f28;
  background: linear-gradient(135deg, #ffe8a0, #b8f0ff);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.reviews-compose__submit:hover:not(:disabled) {
  transform: translateY(-1px);
}
.reviews-compose__submit:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
.reviews-compose__hint {
  margin: 0.85rem 0 0;
  font-size: 0.84rem;
  color: #b8ffd4;
}

.reviews-empty {
  min-height: 280px;
  display: grid;
  place-content: center;
  padding: 2.4rem 1rem;
  text-align: center;
  color: rgba(244, 246, 248, 0.7);
}
.reviews-empty__mark {
  display: block;
  font-size: 2rem;
  opacity: 0.45;
  margin-bottom: 0.4rem;
}
.reviews-empty p {
  margin: 0;
}

.review-card {
  padding: 1.05rem 1.05rem 1.1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 0.8rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.review-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}
.review-card:last-child {
  margin-bottom: 0;
}

.review-card__top {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 0.7rem;
}

.review-card__avatar {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: #1a1f28;
  background: linear-gradient(135deg, #ffe8a0, #b8f0ff);
  flex-shrink: 0;
}

.review-card__name {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  color: #ffffff;
}

.review-card__sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.2rem;
  font-size: 0.72rem;
  color: rgba(244, 246, 248, 0.58);
}

.review-card__tag {
  display: inline-flex;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(244, 246, 248, 0.85);
}

.review-card__text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.75;
  color: rgba(244, 246, 248, 0.92);
}

@media (max-width: 900px) {
  .reviews-page__layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .reviews-list {
    min-height: 70vh;
  }
  .reviews-compose__grid {
    grid-template-columns: 1fr;
  }
  .reviews-page__inner {
    padding: 1.2rem 1rem 2.4rem;
  }
}
</style>
