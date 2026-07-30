<template>
  <Teleport to="body">
    <div
      v-if="!exploded"
      class="page-climber"
      :class="{
        'is-angry': angry,
        'is-exploding': exploding,
        'is-moving': moving,
        'is-jumping': jumping,
        'is-climbing': climbing,
        'is-dancing': musicPlaying && !angry && !exploding,
        'face-left': facing < 0,
      }"
      :style="climberStyle"
      @click.stop="onSelfClick"
    >
      <span class="page-climber__halo" aria-hidden="true"></span>
      <span class="page-climber__arms" v-show="musicPlaying && !angry && !exploding" aria-hidden="true">
        <i class="arm left"><b></b></i>
        <i class="arm right"><b></b></i>
      </span>
      <span class="page-climber__text">{{ displayText }}</span>
      <span class="page-climber__fire" v-show="angry || exploding" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span class="page-climber__legs" v-show="!exploding" aria-hidden="true">
        <i class="leg left"></i>
        <i class="leg right"></i>
      </span>
      <span class="page-climber__bubble" v-show="angry && !exploding">怒</span>
    </div>
    <div v-if="exploding" class="page-climber-boom" aria-hidden="true">
      <div class="page-climber-boom__flash"></div>
      <div class="page-climber-boom__text">爆了!!!</div>
    </div>
    <div v-if="exploded" class="page-climber-revive">
      {{ reviveCountdown }}s 后复活...
    </div>
  </Teleport>
</template>

<script>
const INTERACTIVE_SEL = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  'option',
  'canvas',
  'video',
  'audio',
  '[role="button"]',
  '[role="tab"]',
  '[role="link"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  '[contenteditable="true"]',
  '.v-btn',
  '.v-switch',
  '.v-slider',
  '.v-tab',
  '.v-list-item',
  '.v-selection-control',
  '.v-field',
  '.v-overlay__scrim',
  '.mail-box',
  '.mail-box__btn',
  '.muscle-buddy',
  '.page-climber',
  '.page-climber-revive',
  '.floating-switch-container',
  '.reviews-page',
  '.world-page',
  '.world-dial__hit',
  '.mini-player',
  '.mini-player-fab',
  '.blog-panel',
  '.blog-page',
  '.svg-frame',
  '.turntable',
  '.leleo-left-avatar',
  '.about-panel__cta',
  '.world-tab',
  '.world-item.is-link',
  '.setbtn',
  '.v-dialog',
  '.v-menu',
].join(',');

export default {
  name: 'PageClimber',
  props: {
    title: { type: String, default: '我不是神' },
    musicPlaying: { type: Boolean, default: false },
  },
  data() {
    return {
      x: 120,
      y: 180,
      facing: 1,
      moving: false,
      jumping: false,
      climbing: false,
      angry: false,
      exploding: false,
      exploded: false,
      reviveCountdown: 13,
      clickCount: 0,
      rafId: 0,
      path: [],
      pathIndex: 0,
      explodeTimer: null,
      reviveTimer: null,
      countdownTimer: null,
      angryTimer: null,
    };
  },
  computed: {
    displayText() {
      if (this.exploding) return '爆了!!!';
      if (this.angry) return '不要惹我';
      return this.title;
    },
    climberStyle() {
      return {
        transform: `translate3d(${this.x}px, ${this.y}px, 0) scaleX(${this.facing})`,
        opacity: this.exploding ? 0 : 1,
      };
    },
  },
  mounted() {
    this.x = Math.min(window.innerWidth - 160, Math.max(80, window.innerWidth * 0.55));
    this.y = Math.min(window.innerHeight - 80, 160);
    window.addEventListener('pointerdown', this.onPagePointer, true);
  },
  beforeUnmount() {
    window.removeEventListener('pointerdown', this.onPagePointer, true);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.clearBoomTimers();
    if (this.angryTimer) clearTimeout(this.angryTimer);
  },
  methods: {
    clearBoomTimers() {
      if (this.explodeTimer) {
        clearTimeout(this.explodeTimer);
        this.explodeTimer = null;
      }
      if (this.reviveTimer) {
        clearTimeout(this.reviveTimer);
        this.reviveTimer = null;
      }
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    },
    onSelfClick(e) {
      e.stopPropagation();
      if (this.exploding || this.exploded) return;
      this.angry = true;
      this.clickCount += 1;
      if (this.clickCount >= 3) {
        this.triggerBoom();
        return;
      }
      if (this.angryTimer) clearTimeout(this.angryTimer);
      this.angryTimer = setTimeout(() => {
        if (!this.exploding && !this.exploded) this.angry = false;
      }, 1200);
    },
    triggerBoom() {
      this.clearBoomTimers();
      this.exploding = true;
      this.angry = true;
      this.clickCount = 0;
      this.moving = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);

      this.explodeTimer = setTimeout(() => {
        this.exploding = false;
        this.angry = false;
        this.exploded = true;
        this.reviveCountdown = 13;
        this.countdownTimer = setInterval(() => {
          this.reviveCountdown -= 1;
          if (this.reviveCountdown <= 0) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
          }
        }, 1000);
        this.reviveTimer = setTimeout(() => {
          this.exploded = false;
          this.reviveCountdown = 13;
          this.clearBoomTimers();
        }, 13000);
      }, 1200);
    },
    isInteractiveTarget(el) {
      // 只拦截真正可点控件；大面板空白处允许小人过去
      return !!el.closest(INTERACTIVE_SEL);
    },
    onPagePointer(e) {
      if (e.button !== 0) return;
      if (this.exploding || this.exploded) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      // 陀螺本体（含内部 svg）单独拦，时钟卡片空白处可走
      if (t.closest('.svg-frame, .turntable')) return;
      if (t.closest('.auth-chip, .auth-modal, .auth-renew, .auth-wrap, .mini-player, .profile-edit-fab, .profile-modal')) return;
      if (this.isInteractiveTarget(t)) return;
      this.goTo(e.clientX, e.clientY);
    },
    getBuildings() {
      const sels = [
        '.building-solid',
        '.about-panel',
        '.tags-panel',
        '.skill-panel',
        '.mail-box',
        '.clock-card',
        '.world-content',
        '.world-item',
        '.leleo-left-avatar',
        '.muscle-buddy',
        '.quote-block',
        '.mini-player',
        '.blog-panel',
        '.auth-chip',
        '.auth-renew',
        '.profile-edit-fab',
      ];
      const nodes = document.querySelectorAll(sels.join(','));
      const list = [];
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 36 || r.height < 28) return;
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        list.push({
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          midX: (r.left + r.right) / 2,
          topY: r.top,
        });
      });
      return list;
    },
    clampAwayFromPlayer(x, y) {
      const el = document.querySelector('.mini-player');
      if (!el) return { x, y };
      const b = el.getBoundingClientRect();
      const pad = 28;
      const inside =
        x > b.left - pad &&
        x < b.right + pad &&
        y > b.top - pad &&
        y < b.bottom + pad;
      if (!inside) return { x, y };
      // 点到歌单区域时，落到歌单左侧，避免小人钻进去
      return {
        x: Math.max(40, b.left - 36),
        y: Math.min(window.innerHeight - 40, Math.max(40, b.bottom - 20)),
      };
    },
    goTo(tx, ty) {
      const start = { x: this.x, y: this.y };
      let end = {
        x: Math.max(40, Math.min(window.innerWidth - 40, tx)),
        y: Math.max(40, Math.min(window.innerHeight - 40, ty)),
      };
      end = this.clampAwayFromPlayer(end.x, end.y);
      this.facing = end.x >= start.x ? 1 : -1;

      const buildings = this.getBuildings();
      const path = [start];
      const blockers = buildings
        .filter((b) => this.segmentHitsBox(start.x, start.y, end.x, end.y, b))
        .sort((a, b) => Math.abs(a.midX - start.x) - Math.abs(b.midX - start.x));

      blockers.slice(0, 3).forEach((b) => {
        // 歌单太高，绕左侧走，不要爬上去挡操作
        const isPlayer =
          b.right > window.innerWidth - 480 && b.bottom > window.innerHeight - 640;
        if (isPlayer) {
          path.push({ x: Math.max(40, b.left - 40), y: start.y });
          path.push({ x: Math.max(40, b.left - 40), y: end.y });
          return;
        }
        path.push({ x: b.midX, y: b.topY - 8, climb: true });
      });
      path.push({ x: end.x, y: end.y, jump: true });

      this.path = path;
      this.pathIndex = 1;
      this.moving = true;
      this.animateToNext();
    },
    segmentHitsBox(x1, y1, x2, y2, b) {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const overlap =
        minX < b.right && maxX > b.left && minY < b.bottom && maxY > b.top;
      if (!overlap) return false;
      const startInside = x1 > b.left && x1 < b.right && y1 > b.top && y1 < b.bottom;
      return !startInside;
    },
    animateToNext() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.pathIndex >= this.path.length) {
        this.moving = false;
        this.jumping = false;
        this.climbing = false;
        return;
      }
      const target = this.path[this.pathIndex];
      const from = { x: this.x, y: this.y };
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      const duration = Math.min(1200, Math.max(280, dist * 2.2));
      const start = performance.now();
      this.facing = dx >= 0 ? 1 : -1;
      this.climbing = !!target.climb;
      this.jumping = !!target.jump || Math.abs(dy) > 40;

      const step = (now) => {
        if (this.exploding || this.exploded) {
          this.moving = false;
          return;
        }
        const t = Math.min(1, (now - start) / duration);
        const arc = this.jumping ? Math.sin(Math.PI * t) * Math.min(80, dist * 0.25) : 0;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        this.x = from.x + dx * ease;
        this.y = from.y + dy * ease - arc;
        if (t < 1) {
          this.rafId = requestAnimationFrame(step);
        } else {
          this.pathIndex += 1;
          this.animateToNext();
        }
      };
      this.rafId = requestAnimationFrame(step);
    },
  },
};
</script>

<style scoped>
.page-climber {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 40;
  width: max-content;
  max-width: 220px;
  padding: 0.55rem 0.9rem 1.1rem;
  transform-origin: center bottom;
  cursor: pointer;
  user-select: none;
  pointer-events: auto;
  will-change: transform;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
}
.page-climber.face-left .page-climber__text,
.page-climber.face-left .page-climber__bubble {
  transform: scaleX(-1);
  display: inline-block;
}
.page-climber__text {
  position: relative;
  z-index: 2;
  font-family: "myfont", sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
  background: linear-gradient(90deg, #fff7c8, #fff, #c8f7ff, #fff7c8);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: title-shine 3.5s linear infinite;
}
.page-climber__halo {
  position: absolute;
  left: 50%;
  top: -0.15rem;
  width: 2.2rem;
  height: 0.55rem;
  margin-left: -1.1rem;
  border: 2px solid rgba(255, 230, 150, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 230, 150, 0.75);
  animation: halo-breathe 2.4s ease-in-out infinite;
  z-index: 1;
}
.page-climber__legs {
  position: absolute;
  left: 50%;
  bottom: 0.15rem;
  width: 28px;
  height: 14px;
  margin-left: -14px;
  z-index: 1;
}
.page-climber__legs .leg {
  position: absolute;
  top: 0;
  width: 5px;
  height: 12px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.85);
}
.page-climber__legs .leg.left { left: 5px; }
.page-climber__legs .leg.right { right: 5px; }
.page-climber.is-moving .leg.left {
  animation: walk-leg 0.28s ease-in-out infinite;
}
.page-climber.is-moving .leg.right {
  animation: walk-leg 0.28s ease-in-out infinite reverse;
}
.page-climber.is-climbing .page-climber__text {
  filter: brightness(1.15);
}
.page-climber.is-dancing {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35)) drop-shadow(0 0 12px rgba(155, 231, 239, 0.35));
}
.page-climber.is-dancing .page-climber__halo {
  animation: halo-breathe 0.9s ease-in-out infinite;
  box-shadow: 0 0 14px rgba(155, 231, 239, 0.85);
  border-color: rgba(155, 231, 239, 0.95);
}
.page-climber__arms {
  position: absolute;
  left: 50%;
  top: 0.55rem;
  width: 0;
  height: 0;
  z-index: 3;
  pointer-events: none;
}
.page-climber__arms .arm {
  position: absolute;
  top: 0.2rem;
  width: 4px;
  height: 1.55rem;
  border-radius: 999px;
  transform-origin: top center;
  background: linear-gradient(180deg, #9be7ef, #7CFFB2 55%, #FFE08A);
  box-shadow:
    0 0 8px rgba(155, 231, 239, 0.95),
    0 0 16px rgba(124, 255, 178, 0.55);
}
.page-climber__arms .arm b {
  position: absolute;
  left: 50%;
  bottom: -0.28rem;
  width: 0.55rem;
  height: 0.55rem;
  margin-left: -0.275rem;
  border-radius: 50%;
  background: #fff7c8;
  box-shadow:
    0 0 8px rgba(255, 247, 200, 0.95),
    0 0 14px rgba(155, 231, 239, 0.8);
}
.page-climber__arms .arm.left {
  right: 0.85rem;
  animation: glowstick-left 0.42s ease-in-out infinite;
}
.page-climber__arms .arm.right {
  left: 0.85rem;
  animation: glowstick-right 0.42s ease-in-out infinite;
}
.page-climber.face-left .page-climber__arms {
  transform: scaleX(-1);
}
@keyframes glowstick-left {
  0%, 100% { transform: rotate(-38deg); }
  50% { transform: rotate(-78deg); }
}
@keyframes glowstick-right {
  0%, 100% { transform: rotate(38deg); }
  50% { transform: rotate(78deg); }
}
.page-climber__fire {
  position: absolute;
  left: 50%;
  top: -0.4rem;
  width: 40px;
  height: 18px;
  margin-left: -20px;
  z-index: 0;
}
.page-climber__fire i {
  position: absolute;
  bottom: 0;
  width: 8px;
  height: 14px;
  border-radius: 50% 50% 20% 20%;
  background: linear-gradient(#ffe566, #ff6a00);
  opacity: 0.85;
  animation: fire-flick 0.3s ease-in-out infinite alternate;
}
.page-climber__fire i:nth-child(1) { left: 6px; }
.page-climber__fire i:nth-child(2) { left: 16px; height: 18px; animation-delay: 0.1s; }
.page-climber__fire i:nth-child(3) { left: 26px; animation-delay: 0.05s; }
.page-climber__bubble {
  position: absolute;
  right: -0.2rem;
  top: -0.55rem;
  font-size: 0.72rem;
  padding: 0.12rem 0.35rem;
  border-radius: 8px;
  background: rgba(255, 80, 60, 0.9);
  color: #fff;
  z-index: 3;
}
.page-climber.is-angry .page-climber__text {
  background: linear-gradient(90deg, #ffb4a2, #fff, #ff6a00, #ffb4a2);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
}
.page-climber.is-exploding {
  animation: climber-fade 0.8s ease forwards;
  filter: brightness(2) saturate(1.6);
}
.page-climber-boom {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
  display: grid;
  place-items: center;
}
.page-climber-boom__flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 220, 120, 0.55), transparent 55%);
  animation: boom-flash 0.9s ease-out forwards;
}
.page-climber-boom__text {
  position: relative;
  font-family: "myfont", sans-serif;
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 800;
  color: #fff;
  text-shadow: 0 0 24px #ff6a00, 0 4px 12px rgba(0, 0, 0, 0.5);
  animation: boom-pop 0.9s ease-out forwards;
}
.page-climber-revive {
  position: fixed;
  left: 50%;
  bottom: 1.4rem;
  z-index: 45;
  transform: translateX(-50%);
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: rgba(12, 16, 22, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 0.86rem;
  letter-spacing: 0.04em;
  pointer-events: none;
  backdrop-filter: blur(8px);
}

@keyframes walk-leg {
  from { transform: rotate(18deg); }
  to { transform: rotate(-18deg); }
}
@keyframes fire-flick {
  from { transform: scaleY(0.85); opacity: 0.7; }
  to { transform: scaleY(1.15); opacity: 1; }
}
@keyframes climber-fade {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes boom-flash {
  0% { opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes boom-pop {
  0% { transform: scale(0.6); opacity: 0; }
  35% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}
@keyframes title-shine {
  0% { background-position: 0% center; }
  100% { background-position: 220% center; }
}
@keyframes halo-breathe {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.08); opacity: 1; }
}
</style>
