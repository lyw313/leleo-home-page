<template>
  <div v-if="modules.length" class="world-dial building-solid">
    <div class="world-dial__wrap">
      <div class="world-dial__head">
        <h2 class="world-dial__title">我的世界</h2>
        <p class="world-dial__desc">悬停放大高亮，点击进入</p>
      </div>

      <div class="world-dial__stage">
        <div class="world-dial__ring" aria-hidden="true"></div>
        <div class="world-dial__aura" aria-hidden="true"></div>

        <div class="world-dial__board">
          <svg
            class="world-dial__svg"
            viewBox="0 0 320 320"
            role="list"
            aria-label="我的世界选择盘"
          >
            <defs>
              <radialGradient id="wd-center-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(255,232,160,0.3)"/>
                <stop offset="100%" stop-color="rgba(255,232,160,0)"/>
              </radialGradient>
              <clipPath
                v-for="seg in segments"
                :id="'wd-clip-' + seg.key"
                :key="'clip-' + seg.key"
              >
                <path :d="seg.path"/>
              </clipPath>
            </defs>

            <circle cx="160" cy="160" r="152" fill="rgba(8,12,18,0.35)" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>
            <circle cx="160" cy="160" r="88" fill="url(#wd-center-glow)"/>

            <g
              v-for="seg in segments"
              :key="seg.key"
              class="world-dial__seg"
              :class="{ 'is-hot': hoverKey === seg.key }"
              role="listitem"
              @mouseenter="hoverKey = seg.key"
              @mouseleave="hoverKey = ''"
              @click="openModule(seg.key)"
            >
              <g :clip-path="`url(#wd-clip-${seg.key})`">
                <image
                  v-if="seg.cover"
                  class="world-dial__photo"
                  :href="seg.cover"
                  :x="seg.imgX"
                  :y="seg.imgY"
                  :width="seg.imgSize"
                  :height="seg.imgSize"
                  preserveAspectRatio="xMidYMid slice"
                />
                <path
                  :d="seg.path"
                  :fill="hoverKey === seg.key ? seg.tintHot : seg.tint"
                />
              </g>
              <path
                :d="seg.path"
                fill="none"
                :stroke="seg.stroke"
                stroke-width="2.4"
              />
            </g>
          </svg>

          <button
            v-for="seg in segments"
            :key="'btn-' + seg.key"
            type="button"
            class="world-dial__hit"
            :class="{ 'is-hot': hoverKey === seg.key }"
            :style="hitStyle(seg)"
            :title="seg.title"
            @mouseenter="hoverKey = seg.key"
            @mouseleave="hoverKey = ''"
            @click="openModule(seg.key)"
          >
            <span class="world-dial__hit-glow" aria-hidden="true"></span>
            <v-icon v-if="seg.icon" :icon="seg.icon" size="22"></v-icon>
            <span>{{ seg.title }}</span>
          </button>
        </div>

        <div class="world-dial__hub" aria-hidden="true">
          <div class="world-dial__hub-inner">
            <div class="world-dial__hub-title">我的世界</div>
            <div class="world-dial__hub-sub">{{ hubHint }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const ACCENTS = {
  sport: {
    tint: 'rgba(8,28,18,0.42)',
    tintHot: 'rgba(8,28,18,0.18)',
    stroke: 'rgba(124,255,178,0.95)',
    fill: 'rgba(124,255,178,0.46)',
    fillHot: 'rgba(124,255,178,0.78)',
  },
  game: {
    tint: 'rgba(8,18,32,0.42)',
    tintHot: 'rgba(8,18,32,0.18)',
    stroke: 'rgba(154,215,255,0.95)',
    fill: 'rgba(154,215,255,0.46)',
    fillHot: 'rgba(154,215,255,0.78)',
  },
  project: {
    tint: 'rgba(32,24,8,0.42)',
    tintHot: 'rgba(32,24,8,0.18)',
    stroke: 'rgba(255,224,138,0.95)',
    fill: 'rgba(255,224,138,0.46)',
    fillHot: 'rgba(255,224,138,0.78)',
  },
  life: {
    tint: 'rgba(32,14,12,0.42)',
    tintHot: 'rgba(32,14,12,0.18)',
    stroke: 'rgba(255,180,162,0.95)',
    fill: 'rgba(255,180,162,0.46)',
    fillHot: 'rgba(255,180,162,0.78)',
  },
};

const ACCENT_CSS = {
  sport: '#7CFFB2',
  game: '#9AD7FF',
  project: '#FFE08A',
  life: '#FFB4A2',
};

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function donutSlice(cx, cy, rIn, rOut, start, end) {
  const large = end - start > 180 ? 1 : 0;
  const [x0, y0] = polar(cx, cy, rOut, start);
  const [x1, y1] = polar(cx, cy, rOut, end);
  const [x2, y2] = polar(cx, cy, rIn, end);
  const [x3, y3] = polar(cx, cy, rIn, start);
  return [
    `M ${x0} ${y0}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3}`,
    'Z',
  ].join(' ');
}

function resolveCover(mod) {
  if (mod?.cover) return mod.cover;
  const hit = (mod?.items || []).find((item) => item?.image);
  return hit?.image || '';
}

export default {
  name: 'LifeModules',
  props: {
    modules: { type: Array, default: () => [] },
  },
  emits: ['open-world'],
  data() {
    return { hoverKey: '' };
  },
  computed: {
    hubHint() {
      const m = this.modules.find((x) => x.key === this.hoverKey);
      return m ? `进入「${m.title}」` : '点扇区进入';
    },
    segments() {
      const n = this.modules.length || 1;
      const step = 360 / n;
      const gap = 2.2;
      const imgSize = 168;
      return this.modules.map((mod, i) => {
        const start = i * step + gap;
        const end = (i + 1) * step - gap;
        const mid = (start + end) / 2;
        const [labelX, labelY] = polar(160, 160, 104, mid);
        const [imgCx, imgCy] = polar(160, 160, 102, mid);
        const colors = ACCENTS[mod.key] || {
          tint: 'rgba(0,0,0,0.35)',
          tintHot: 'rgba(0,0,0,0.15)',
          stroke: 'rgba(255,255,255,0.85)',
          fill: 'rgba(255,255,255,0.32)',
          fillHot: 'rgba(255,255,255,0.55)',
        };
        const cover = resolveCover(mod);
        return {
          ...mod,
          cover,
          path: donutSlice(160, 160, 56, 146, start, end),
          labelX,
          labelY,
          imgX: imgCx - imgSize / 2,
          imgY: imgCy - imgSize / 2,
          imgSize,
          ...colors,
          // 无封面时回退纯色
          tint: cover ? colors.tint : colors.fill,
          tintHot: cover ? colors.tintHot : colors.fillHot,
        };
      });
    },
  },
  methods: {
    hitStyle(seg) {
      const hot = this.hoverKey === seg.key;
      return {
        left: `${(seg.labelX / 320) * 100}%`,
        top: `${(seg.labelY / 320) * 100}%`,
        '--accent': ACCENT_CSS[seg.key] || '#fff',
        transform: `translate(-50%, -50%) scale(${hot ? 1.16 : 1})`,
      };
    },
    openModule(key) {
      location.hash = `world/${key}`;
      this.$emit('open-world', key);
    },
  },
};
</script>

<style scoped>
.world-dial {
  width: 100%;
  flex: 1 1 auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0.1rem 0.2rem 0.7rem;
  box-sizing: border-box;
  color: var(--leleo-vcard-color);
}
.world-dial__wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
}
.world-dial__head { text-align: center; }
.world-dial__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  color: #fff;
}
.world-dial__desc {
  margin: 0.12rem 0 0;
  font-size: 0.74rem;
  opacity: 0.78;
}
.world-dial__stage {
  position: relative;
  width: min(100%, 560px);
  aspect-ratio: 1;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.38));
}
.world-dial__aura {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  background:
    conic-gradient(
      from 0deg,
      rgba(124, 255, 178, 0.14),
      rgba(154, 215, 255, 0.14),
      rgba(255, 224, 138, 0.14),
      rgba(255, 180, 162, 0.14),
      rgba(124, 255, 178, 0.14)
    );
  filter: blur(16px);
  pointer-events: none;
  z-index: 0;
}
.world-dial__ring {
  position: absolute;
  inset: -1%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  pointer-events: none;
  z-index: 1;
}
.world-dial__board {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 2;
}
.world-dial__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
.world-dial__seg {
  cursor: pointer;
  transform-origin: 160px 160px;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.world-dial__seg.is-hot {
  transform: scale(1.08);
  filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.4));
}
.world-dial__photo {
  transition: opacity 0.22s ease;
}
.world-dial__seg path {
  transition: fill 0.22s ease, stroke 0.22s ease;
}
.world-dial__hub {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 32%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.14), transparent 45%),
    rgba(12, 16, 22, 0.88);
  border: 1.5px solid rgba(255, 255, 255, 0.32);
  box-shadow: 0 0 0 1px rgba(255, 232, 160, 0.22);
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 4;
}
.world-dial__hub-inner { text-align: center; padding: 0.45rem; }
.world-dial__hub-title {
  color: #fff;
  font-size: clamp(0.88rem, 2.2vw, 1.08rem);
  font-weight: 700;
  letter-spacing: 0.12em;
}
.world-dial__hub-sub {
  margin-top: 0.26rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: clamp(0.6rem, 1.45vw, 0.72rem);
}
.world-dial__hit {
  position: absolute;
  width: 4.8rem;
  height: 4.8rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 60%, rgba(255, 255, 255, 0.28));
  background: rgba(10, 14, 20, 0.68);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.14rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.32);
  z-index: 3;
  overflow: hidden;
  transition: box-shadow 0.22s ease, background 0.22s ease;
}
.world-dial__hit-glow {
  position: absolute;
  inset: -30%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent), transparent 65%);
  opacity: 0.45;
  pointer-events: none;
  transition: opacity 0.22s ease;
}
.world-dial__hit.is-hot {
  background: color-mix(in srgb, var(--accent) 38%, rgba(10, 14, 20, 0.55));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--accent) 60%, transparent),
    0 0 26px color-mix(in srgb, var(--accent) 50%, transparent);
}
.world-dial__hit.is-hot .world-dial__hit-glow { opacity: 0.9; }
.world-dial__hit span {
  position: relative;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

@media (max-width: 960px) {
  .world-dial { padding: 0.25rem 0.4rem 1rem; }
  .world-dial__stage { width: min(86vw, 440px); }
  .world-dial__hit { width: 4rem; height: 4rem; }
}
</style>
