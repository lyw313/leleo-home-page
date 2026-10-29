<template>
  <Teleport to="body">
    <div
      v-show="visible"
      id="loading-box"
      class="intro-box"
      :class="{ 'is-leaving': leaving }"
      @click="open"
    >
      <!-- 第三层：深色幕帘，最后推开 -->
      <div class="intro-panel intro-panel--trail" aria-hidden="true"></div>
      <!-- 第二层：橙色几何幕帘 -->
      <div
        class="intro-panel intro-panel--follow"
        :style="{ backgroundImage: `url('${curtainSrc}')` }"
        aria-hidden="true"
      ></div>
      <!-- 第一层：主背景轮播 -->
      <div
        class="intro-panel intro-panel--main"
        :style="{ backgroundImage: `url('${bgSrc}')` }"
      >
        <div class="intro-veil"></div>
        <div class="intro-center">
          <div class="intro-avatar-wrap">
            <div
              class="intro-avatar"
              :style="{ backgroundImage: `url('${avatarSrc}')` }"
            ></div>
            <span class="intro-dot"></span>
          </div>
          <div class="intro-copy">
            <div class="intro-eyebrow">Welcome</div>
            <h1 class="intro-title">{{ title }}</h1>
            <p class="intro-sub">{{ subtitle }}</p>
          </div>
          <p class="intro-hint">{{ leaving ? '正在进入…' : '点击进入' }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { assetUrl } from '../utils/assetUrl.js';

const INTRO_BG_KEY = 'leleo-intro-bg-index';
const ROTATE_MS = 3 * 60 * 1000; // 3 分钟

const DEFAULT_BGS = [
  '/img/intro-bg.png',
  '/img/intro-bg-2.png',
  '/img/intro-bg-3.png',
];

export default {
  name: 'Loader',
  props: {
    avatar: { type: String, default: '/img/avatar.jpg' },
    title: { type: String, default: '李应旺' },
    subtitle: { type: String, default: '认真生活 · 热爱前端' },
    backgrounds: {
      type: Array,
      default: () => DEFAULT_BGS,
    },
    curtain: { type: String, default: '/img/intro-curtain.png' },
  },
  emits: ['done'],
  data() {
    return {
      visible: true,
      leaving: false,
      finished: false,
      endTimer: null,
      rotateTimer: null,
      bgIndex: 0,
    };
  },
  computed: {
    bgList() {
      const list = (this.backgrounds || []).filter(Boolean);
      return list.length ? list : DEFAULT_BGS;
    },
    avatarSrc() {
      return assetUrl(this.avatar);
    },
    bgSrc() {
      return assetUrl(this.bgList[this.bgIndex % this.bgList.length]);
    },
    curtainSrc() {
      return assetUrl(this.curtain);
    },
  },
  mounted() {
    document.documentElement.classList.add('intro-lock');
    document.body.classList.add('intro-lock');
    this.initBgIndex();
    this.preloadBgs();
    this.rotateTimer = setInterval(() => {
      if (this.finished) return;
      this.bgIndex = (this.bgIndex + 1) % this.bgList.length;
      this.persistBgIndex(this.bgIndex);
    }, ROTATE_MS);
  },
  beforeUnmount() {
    if (this.endTimer) clearTimeout(this.endTimer);
    if (this.rotateTimer) clearInterval(this.rotateTimer);
    document.documentElement.classList.remove('intro-lock');
    document.body.classList.remove('intro-lock');
  },
  methods: {
    initBgIndex() {
      let idx = 0;
      try {
        const raw = localStorage.getItem(INTRO_BG_KEY);
        const prev = Number(raw);
        if (Number.isFinite(prev) && prev >= 0) {
          idx = (Math.floor(prev) + 1) % this.bgList.length;
        }
      } catch (_) {}
      this.bgIndex = idx;
      this.persistBgIndex(idx);
    },
    persistBgIndex(idx) {
      try {
        localStorage.setItem(INTRO_BG_KEY, String(idx));
      } catch (_) {}
    },
    preloadBgs() {
      this.bgList.forEach((src) => {
        const img = new Image();
        img.src = assetUrl(src);
      });
      const img = new Image();
      img.src = assetUrl(this.curtain);
    },
    open() {
      if (this.finished) return;
      this.finished = true;
      this.leaving = true;
      if (this.rotateTimer) {
        clearInterval(this.rotateTimer);
        this.rotateTimer = null;
      }

      this.endTimer = setTimeout(() => {
        this.visible = false;
        document.documentElement.classList.remove('intro-lock');
        document.body.classList.remove('intro-lock');
        this.$emit('done');
      }, 1400);
    },
  },
};
</script>

<style>
html.intro-lock,
body.intro-lock {
  overflow: hidden !important;
}
</style>

<style scoped>
.intro-box {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  z-index: 2147483000;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
}

.intro-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: translate3d(0, 0, 0);
}

.intro-panel--trail {
  z-index: 1;
  background: #0b0e14;
}

.intro-panel--follow {
  z-index: 2;
  background-color: #e68a2e;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: -30px 0 60px rgba(0, 0, 0, 0.55);
}

.intro-panel--main {
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #152033;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: -34px 0 70px rgba(0, 0, 0, 0.6);
  transition: background-image 0.8s ease;
}

.intro-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(8, 12, 18, 0.28) 0%, rgba(8, 12, 18, 0.5) 100%),
    radial-gradient(ellipse 70% 55% at 50% 42%, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.4));
  pointer-events: none;
}

.intro-box.is-leaving .intro-panel--main {
  animation: introPushRight 0.85s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
.intro-box.is-leaving .intro-panel--follow {
  animation: introPushRight 0.85s cubic-bezier(0.65, 0, 0.35, 1) 0.18s forwards;
}
.intro-box.is-leaving .intro-panel--trail {
  animation: introPushRight 0.85s cubic-bezier(0.65, 0, 0.35, 1) 0.36s forwards;
}

@keyframes introPushRight {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(105%, 0, 0); }
}

.intro-center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  text-align: center;
  color: #f7fafc;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
}

.intro-avatar-wrap {
  position: relative;
  width: 108px;
  height: 108px;
}

.intro-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.92);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.intro-dot {
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #6bdf8f;
  border: 4px solid #fff;
  top: 50%;
  left: 50%;
  transform: translate(18px, 24px);
  box-shadow: 0 2px 10px rgba(107, 223, 143, 0.45);
}

.intro-copy {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.intro-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.7;
}

.intro-title {
  margin: 0;
  font-size: clamp(1.45rem, 3.5vw, 2rem);
  font-weight: 750;
  letter-spacing: 0.06em;
}

.intro-sub {
  margin: 0;
  font-size: 0.92rem;
  opacity: 0.85;
}

.intro-hint {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  animation: introHintPulse 1.6s ease-in-out infinite;
}

@keyframes introHintPulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.95; }
}
</style>
