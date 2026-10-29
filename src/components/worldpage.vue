<template>
  <div class="world-page" v-if="module" :style="{ '--accent': accent }">
    <div class="world-page__scrim" aria-hidden="true"></div>
    <div class="world-page__inner">
      <header class="world-page__header">
        <div class="world-page__header-row">
          <button type="button" class="world-page__back" @click="$emit('back')">
            <v-icon icon="mdi-arrow-left" size="18"></v-icon>
            返回主页
          </button>
          <button
            v-if="isAdmin"
            type="button"
            class="world-page__add"
            @click="showForm = !showForm"
          >
            <v-icon icon="mdi-plus" size="18"></v-icon>
            添加内容
          </button>
        </div>
        <div class="world-page__hero" :style="{ '--accent': accent }">
          <div class="world-page__icon">
            <v-icon v-if="module.icon" :icon="module.icon" size="28"></v-icon>
          </div>
          <div>
            <p class="world-page__eyebrow">My World</p>
            <h1 class="world-page__title">{{ module.title }}</h1>
            <p v-if="module.desc" class="world-page__subtitle">{{ module.desc }}</p>
            <p class="world-page__mode">{{ isAdmin ? '管理员可添加 / 删除' : '游客模式 · 仅可浏览' }}</p>
          </div>
        </div>
      </header>

      <section v-if="isAdmin && showForm" class="world-page__form">
        <input v-model="draft.title" class="world-page__input" type="text" maxlength="80" placeholder="标题" />
        <input v-model="draft.text" class="world-page__input" type="text" maxlength="300" placeholder="简介 / 说明" />
        <input v-model="draft.image" class="world-page__input" type="text" maxlength="400" placeholder="图片地址（可选，如 /img/world/sport/xxx.png）" />
        <input
          v-model="draft.website"
          class="world-page__input"
          type="url"
          maxlength="400"
          placeholder="访问网页（可选，如 https://xxx.com）"
        />
        <input
          v-model="draft.repo"
          class="world-page__input"
          type="url"
          maxlength="400"
          placeholder="GitHub 仓库（可选，如 https://github.com/xxx/yyy）"
        />
        <button type="button" class="world-page__add" :disabled="!canAdd" @click="addItem">保存</button>
      </section>

      <section class="world-page__grid" :class="{ 'world-page__grid--photo': hasPhotos }">
        <article
          v-for="(item, idx) in items"
          :key="item.id || idx"
          class="world-card"
          :class="{ 'has-image': !!item.image }"
          :style="{ '--delay': `${idx * 0.06}s`, '--accent': accent }"
        >
          <button
            v-if="isAdmin"
            type="button"
            class="world-card__del"
            title="删除"
            @click.stop="removeItem(item.id)"
          >
            <v-icon icon="mdi-delete-outline" size="16"></v-icon>
          </button>
          <div v-if="item.image" class="world-card__media">
            <img :src="item.image" :alt="item.title" loading="lazy" />
          </div>
          <div class="world-card__body">
            <div class="world-card__index">{{ String(idx + 1).padStart(2, '0') }}</div>
            <h2 class="world-card__title">{{ item.title }}</h2>
            <p v-if="item.text" class="world-card__text">{{ item.text }}</p>
            <div class="world-card__actions">
              <a
                v-if="item.website"
                class="world-card__btn world-card__btn--link"
                :href="item.website"
                target="_blank"
                rel="noopener noreferrer"
              >
                项目网址
              </a>
              <button
                v-else
                type="button"
                class="world-card__btn world-card__btn--disabled"
                disabled
                title="未填写网页地址"
              >
                项目网址
              </button>
              <a
                v-if="item.repo"
                class="world-card__btn"
                :href="item.repo"
                target="_blank"
                rel="noopener noreferrer"
              >
                查看仓库
              </a>
              <button
                v-else
                type="button"
                class="world-card__btn world-card__btn--disabled"
                disabled
                title="未填写 GitHub 仓库"
              >
                查看仓库
              </button>
            </div>
          </div>
        </article>
      </section>

      <div v-if="!items.length" class="world-page__empty">这里还是空的{{ isAdmin ? '，点右上角添加内容吧' : '' }}</div>
    </div>

    <Teleport to="body">
      <Transition name="world-view">
        <div
          v-if="viewer"
          class="world-viewer"
          :style="{ '--accent': accent }"
          @click.self="closeViewer"
          @keydown.esc.prevent="closeViewer"
        >
          <div class="world-viewer__glow" aria-hidden="true"></div>
          <div class="world-viewer__sparkles" aria-hidden="true">
            <i v-for="n in 18" :key="n" :style="sparkleStyle(n)"></i>
          </div>

          <button type="button" class="world-viewer__close" title="关闭" @click="closeViewer">
            <v-icon icon="mdi-close" size="22"></v-icon>
          </button>

          <div class="world-viewer__stage">
            <div class="world-viewer__frame">
              <div v-if="viewer.image" class="world-viewer__media">
                <img :src="viewer.image" :alt="viewer.title" />
              </div>
              <div v-else class="world-viewer__placeholder">
                <v-icon :icon="module.icon || 'mdi-star-four-points'" size="64"></v-icon>
              </div>
              <div class="world-viewer__shine" aria-hidden="true"></div>
            </div>

            <div class="world-viewer__meta">
              <h2>{{ viewer.title }}</h2>
              <p v-if="viewer.text">{{ viewer.text }}</p>
              <div class="world-viewer__actions">
                <a
                  v-if="viewer.website"
                  class="world-viewer__link"
                  :href="viewer.website"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  项目网址
                  <v-icon icon="mdi-arrow-top-right" size="16"></v-icon>
                </a>
                <a
                  v-if="viewer.repo"
                  class="world-viewer__link"
                  :href="viewer.repo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看仓库
                  <v-icon icon="mdi-github" size="16"></v-icon>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
import {
  loadWorldMap,
  getWorldItems,
  addWorldItem,
  removeWorldItem,
} from '../utils/worldStore.js';

const ACCENTS = {
  sport: '#7CFFB2',
  game: '#9AD7FF',
  project: '#FFE08A',
  life: '#FFB4A2',
};

export default {
  name: 'WorldPage',
  props: {
    module: { type: Object, default: null },
    seedModules: { type: Array, default: () => [] },
    isAdmin: { type: Boolean, default: false },
  },
  emits: ['back'],
  data() {
    return {
      worldMap: {},
      showForm: false,
      draft: { title: '', text: '', image: '', website: '', repo: '' },
      viewer: null,
    };
  },
  computed: {
    accent() {
      return ACCENTS[this.module?.key] || '#FFE8A0';
    },
    items() {
      if (!this.module?.key) return [];
      return getWorldItems(this.worldMap, this.module.key);
    },
    hasPhotos() {
      return this.items.some((item) => !!item.image);
    },
    canAdd() {
      return this.draft.title.trim().length > 0;
    },
  },
  watch: {
    module: {
      immediate: true,
      handler() {
        this.closeViewer();
        this.reload();
      },
    },
  },
  mounted() {
    this.reload();
    window.addEventListener('leleo-world-updated', this.reload);
    window.addEventListener('keydown', this.onKey);
  },
  beforeUnmount() {
    window.removeEventListener('leleo-world-updated', this.reload);
    window.removeEventListener('keydown', this.onKey);
    document.body.style.overflow = '';
  },
  methods: {
    reload() {
      this.worldMap = loadWorldMap(this.seedModules.length ? this.seedModules : (this.module ? [this.module] : []));
    },
    openViewer(item) {
      if (!item) return;
      this.viewer = { ...item };
      document.body.style.overflow = 'hidden';
    },
    closeViewer() {
      this.viewer = null;
      document.body.style.overflow = '';
    },
    onKey(e) {
      if (e.key === 'Escape' && this.viewer) this.closeViewer();
    },
    sparkleStyle(n) {
      const left = ((n * 37) % 100);
      const top = ((n * 53) % 100);
      const delay = (n % 7) * 0.18;
      const size = 3 + (n % 5);
      return {
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${delay}s`,
      };
    },
    addItem() {
      if (!this.isAdmin || !this.canAdd || !this.module?.key) return;
      this.worldMap = addWorldItem(this.worldMap, this.module.key, this.draft);
      this.draft = { title: '', text: '', image: '', website: '', repo: '' };
      this.showForm = false;
    },
    removeItem(id) {
      if (!this.isAdmin || !this.module?.key || !id) return;
      if (!confirm('确定删除这条内容？')) return;
      this.worldMap = removeWorldItem(this.worldMap, this.module.key, id);
    },
  },
};
</script>

<style scoped>
.world-page {
  position: absolute;
  inset: 0;
  z-index: 20;
  overflow: auto;
  color: #f4f6f8;
}
.world-page__scrim {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 20% -5%, color-mix(in srgb, var(--accent, #ffe8a0) 18%, transparent), transparent 55%),
    rgba(10, 14, 20, 0.82);
  backdrop-filter: blur(18px);
}
.world-page__inner {
  position: relative;
  z-index: 1;
  max-width: 1060px;
  margin: 0 auto;
  padding: 1.6rem 1.35rem 3rem;
}
.world-page__header-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.1rem;
}
.world-page__back,
.world-page__add {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.95rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.12);
  color: #f4f6f8;
  cursor: pointer;
  font-size: 0.86rem;
}
.world-page__back:hover,
.world-page__add:hover {
  background: rgba(255, 255, 255, 0.18);
}
.world-page__add:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.world-page__hero {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
}
.world-page__icon {
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #1a1f28;
  background: linear-gradient(135deg, var(--accent), #fff);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
}
.world-page__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.62;
}
.world-page__title {
  margin: 0;
  font-family: "myfont", "Segoe UI", sans-serif;
  font-size: clamp(1.7rem, 4vw, 2.3rem);
  font-weight: 700;
  letter-spacing: 0.08em;
}
.world-page__subtitle {
  margin: 0.45rem 0 0;
  opacity: 0.8;
  font-size: 0.95rem;
  line-height: 1.55;
}
.world-page__mode {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  opacity: 0.65;
}
.world-page__form {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1.1rem;
  padding: 0.95rem;
  border-radius: 18px;
  background: rgba(22, 28, 36, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.world-page__input {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  padding: 0.65rem 0.8rem;
  font: inherit;
  outline: none;
}
.world-page__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}
.world-page__grid--photo {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.world-card {
  position: relative;
  min-height: 180px;
  padding: 1.15rem 1.1rem 1.2rem;
  border-radius: 20px;
  background: rgba(22, 28, 36, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.22);
  animation: world-card-in 0.35s ease both;
  animation-delay: var(--delay);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}
.world-card:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: color-mix(in srgb, var(--accent) 55%, rgba(255, 255, 255, 0.14));
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.28),
    0 0 24px color-mix(in srgb, var(--accent) 28%, transparent);
}
.world-card.has-image {
  padding: 0;
  min-height: 0;
}
.world-card__del {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  z-index: 2;
  width: 1.85rem;
  height: 1.85rem;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #ffb4b4;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.world-card__media {
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.25);
}
.world-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}
.world-card.has-image:hover .world-card__media img {
  transform: scale(1.05);
}
.world-card__body {
  padding: 0.85rem 0.95rem 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.world-card:not(.has-image) .world-card__body {
  padding: 0;
}
.world-card__index {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin-bottom: 0.4rem;
}
.world-card__title {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
}
.world-card__text {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.55;
  color: rgba(244, 246, 248, 0.78);
}
.world-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: auto;
  padding-top: 0.75rem;
}
.world-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: #f4f6f8;
  font-size: 0.78rem;
  cursor: pointer;
  text-decoration: none;
  font: inherit;
}
.world-card__btn:hover {
  background: rgba(255, 255, 255, 0.18);
}
.world-card__btn--link {
  border-color: color-mix(in srgb, var(--accent) 55%, rgba(255, 255, 255, 0.22));
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: #fff;
}
.world-card__btn--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.world-page__empty {
  margin-top: 1rem;
  text-align: center;
  opacity: 0.7;
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
}

.world-viewer {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1.2rem;
  background: rgba(6, 8, 12, 0.78);
  backdrop-filter: blur(14px);
  overflow: auto;
}
.world-viewer__glow {
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  background:
    radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent), transparent 68%);
  filter: blur(40px);
  animation: viewer-pulse 2.4s ease-in-out infinite;
  pointer-events: none;
}
.world-viewer__sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.world-viewer__sparkles i {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 0 8px var(--accent),
    0 0 16px color-mix(in srgb, var(--accent) 70%, #fff);
  animation: sparkle-twinkle 1.6s ease-in-out infinite;
  opacity: 0;
}
.world-viewer__close {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 3;
  width: 2.6rem;
  height: 2.6rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.world-viewer__close:hover {
  background: rgba(255, 255, 255, 0.2);
}
.world-viewer__stage {
  position: relative;
  z-index: 2;
  width: min(860px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.world-viewer__frame {
  position: relative;
  width: min(720px, 100%);
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, rgba(255, 255, 255, 0.2));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 48px color-mix(in srgb, var(--accent) 35%, transparent),
    0 0 90px color-mix(in srgb, var(--accent) 18%, transparent);
  animation: viewer-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.world-viewer__media,
.world-viewer__placeholder {
  width: 100%;
  aspect-ratio: 4 / 5;
  max-height: min(72vh, 760px);
  background: rgba(12, 16, 22, 0.95);
}
.world-viewer__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #0a0e14;
}
.world-viewer__placeholder {
  display: grid;
  place-items: center;
  color: var(--accent);
  background:
    radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%),
    rgba(12, 16, 22, 0.95);
}
.world-viewer__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 20%,
    rgba(255, 255, 255, 0.22) 45%,
    transparent 70%
  );
  transform: translateX(-120%);
  animation: viewer-shine 2.8s ease-in-out infinite;
  pointer-events: none;
}
.world-viewer__meta {
  text-align: center;
  color: #fff;
  max-width: 640px;
  animation: viewer-meta-in 0.5s ease both 0.08s;
}
.world-viewer__meta h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3.5vw, 1.9rem);
  font-weight: 750;
  letter-spacing: 0.04em;
  text-shadow: 0 0 18px color-mix(in srgb, var(--accent) 45%, transparent);
}
.world-viewer__meta p {
  margin: 0.55rem 0 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.78);
}
.world-viewer__link {
  margin-top: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.05rem;
  background: linear-gradient(135deg, var(--accent), #fff);
  color: #1a1f28;
  font-weight: 750;
  cursor: pointer;
  text-decoration: none;
}
.world-viewer__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.55rem;
}

.world-view-enter-active,
.world-view-leave-active {
  transition: opacity 0.28s ease;
}
.world-view-enter-from,
.world-view-leave-to {
  opacity: 0;
}
.world-view-enter-active .world-viewer__frame,
.world-view-leave-active .world-viewer__frame {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease;
}
.world-view-enter-from .world-viewer__frame,
.world-view-leave-to .world-viewer__frame {
  transform: scale(0.86);
  opacity: 0;
}

@keyframes world-card-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes viewer-pop {
  from { transform: scale(0.82); opacity: 0.4; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes viewer-meta-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes viewer-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.06); }
}
@keyframes viewer-shine {
  0% { transform: translateX(-130%); }
  45%, 100% { transform: translateX(130%); }
}
@keyframes sparkle-twinkle {
  0%, 100% { opacity: 0; transform: scale(0.4); }
  40% { opacity: 1; transform: scale(1.2); }
  70% { opacity: 0.35; transform: scale(0.8); }
}

@media (max-width: 900px) {
  .world-page__grid,
  .world-page__grid--photo { grid-template-columns: 1fr 1fr; }
  .world-page__inner { padding: 1.2rem 1rem 2.4rem; }
}
@media (max-width: 560px) {
  .world-page__grid,
  .world-page__grid--photo { grid-template-columns: 1fr; }
  .world-viewer__media,
  .world-viewer__placeholder {
    max-height: min(58vh, 560px);
  }
}
</style>
