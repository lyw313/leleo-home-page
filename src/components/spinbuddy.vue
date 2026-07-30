<template>
  <div
    class="muscle-buddy"
    :class="{ 'is-flex': flexing || musicPlaying, 'is-hyped': musicPlaying }"
    title="点我秀肌肉"
    @click="flexPose"
  >
    <div class="muscle-buddy__stage" aria-hidden="true">
      <svg class="muscle-buddy__svg" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mb-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffd4a8"/>
            <stop offset="100%" stop-color="#e0a06a"/>
          </linearGradient>
          <linearGradient id="mb-muscle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ff9a72"/>
            <stop offset="100%" stop-color="#d1543c"/>
          </linearGradient>
          <linearGradient id="mb-hair" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#3a2f28"/>
            <stop offset="100%" stop-color="#1a1410"/>
          </linearGradient>
        </defs>

        <!-- idle -->
        <g v-show="activePose === 'idle'">
          <path fill="url(#mb-muscle)" d="M48 98 L42 138 L50 138 L54 102 Z"/>
          <path fill="url(#mb-muscle)" d="M72 98 L70 102 L74 138 L82 138 Z"/>
          <path fill="url(#mb-muscle)" d="M38 48 L82 48 L74 98 L46 98 Z"/>
          <path fill="rgba(255,220,190,.28)" d="M48 56h10v10H48zM62 56h10v10H62z"/>
          <path stroke="rgba(0,0,0,.18)" stroke-width="1.2" fill="none" d="M54 72h12M54 78h12M54 84h12M60 72v18"/>
          <path fill="url(#mb-muscle)" d="M38 50 L28 54 L24 78 L32 80 L38 58 Z"/>
          <path fill="url(#mb-muscle)" d="M82 50 L92 54 L96 78 L88 80 L82 58 Z"/>
          <ellipse cx="24" cy="82" rx="5" ry="4.5" fill="url(#mb-skin)"/>
          <ellipse cx="96" cy="82" rx="5" ry="4.5" fill="url(#mb-skin)"/>
        </g>

        <!-- 1 正面双二头 -->
        <g v-show="activePose === 'double'">
          <path fill="url(#mb-muscle)" d="M46 100 L40 138 L48 138 L54 104 Z"/>
          <path fill="url(#mb-muscle)" d="M74 100 L70 104 L76 138 L84 138 Z"/>
          <path fill="url(#mb-muscle)" d="M34 52 L86 52 L76 100 L44 100 Z"/>
          <path fill="rgba(255,220,190,.3)" d="M46 60h14v11H46zM64 60h14v11H64z"/>
          <path stroke="rgba(0,0,0,.2)" stroke-width="1.2" fill="none" d="M52 76h16M52 82h16M52 88h16M60 76v18"/>
          <path fill="url(#mb-muscle)" d="M34 54 L18 48 L12 34 L22 30 L34 48 Z"/>
          <path fill="url(#mb-muscle)" d="M18 48 L8 42 L6 28 L16 26 L22 42 Z"/>
          <ellipse cx="10" cy="24" rx="6" ry="5.5" fill="url(#mb-skin)"/>
          <path fill="url(#mb-muscle)" d="M86 54 L102 48 L108 34 L98 30 L86 48 Z"/>
          <path fill="url(#mb-muscle)" d="M102 48 L112 42 L114 28 L104 26 L98 42 Z"/>
          <ellipse cx="110" cy="24" rx="6" ry="5.5" fill="url(#mb-skin)"/>
        </g>

        <!-- 2 正面展背 -->
        <g v-show="activePose === 'frontLat'">
          <path fill="url(#mb-muscle)" d="M50 102 L46 138 L54 138 L56 106 Z"/>
          <path fill="url(#mb-muscle)" d="M70 102 L68 106 L70 138 L78 138 Z"/>
          <path fill="url(#mb-muscle)" d="M22 58 L98 58 L74 102 L46 102 Z"/>
          <path fill="rgba(255,220,190,.26)" d="M48 66h10v10H48zM62 66h10v10H62z"/>
          <path stroke="rgba(0,0,0,.18)" stroke-width="1.2" fill="none" d="M54 80h12M54 86h12M60 80v16"/>
          <path fill="url(#mb-muscle)" d="M28 62 L18 78 L24 88 L36 72 Z"/>
          <path fill="url(#mb-muscle)" d="M92 62 L102 78 L96 88 L84 72 Z"/>
          <ellipse cx="22" cy="90" rx="5" ry="4.5" fill="url(#mb-skin)"/>
          <ellipse cx="98" cy="90" rx="5" ry="4.5" fill="url(#mb-skin)"/>
        </g>

        <!-- 3 侧胸 -->
        <g v-show="activePose === 'sideChest'">
          <path fill="url(#mb-muscle)" d="M52 100 L46 138 L54 138 L58 104 Z"/>
          <path fill="url(#mb-muscle)" d="M64 100 L62 104 L68 132 L74 130 L70 100 Z"/>
          <path fill="url(#mb-muscle)" d="M42 50 L78 48 L72 100 L48 100 Z"/>
          <ellipse cx="62" cy="68" rx="14" ry="16" fill="rgba(255,210,180,.28)"/>
          <path fill="url(#mb-muscle)" d="M78 54 L98 62 L104 86 L94 90 L80 66 Z"/>
          <path fill="url(#mb-muscle)" d="M98 62 L110 48 L104 40 L92 52 Z"/>
          <ellipse cx="108" cy="38" rx="5.5" ry="5" fill="url(#mb-skin)"/>
          <path fill="url(#mb-muscle)" d="M42 54 L30 70 L34 92 L44 88 L46 66 Z"/>
          <ellipse cx="32" cy="96" rx="5" ry="4.5" fill="url(#mb-skin)"/>
        </g>

        <!-- 4 背面双二头 -->
        <g v-show="activePose === 'backDouble'">
          <path fill="url(#mb-muscle)" d="M46 100 L40 138 L48 138 L54 104 Z"/>
          <path fill="url(#mb-muscle)" d="M74 100 L70 104 L76 138 L84 138 Z"/>
          <path fill="url(#mb-muscle)" d="M34 52 L86 52 L76 100 L44 100 Z"/>
          <path stroke="rgba(0,0,0,.22)" stroke-width="1.4" fill="none" d="M60 56v40M48 64 Q60 72 72 64M46 78 Q60 88 74 78"/>
          <path fill="url(#mb-muscle)" d="M34 54 L18 48 L12 34 L22 30 L34 48 Z"/>
          <path fill="url(#mb-muscle)" d="M18 48 L8 42 L6 28 L16 26 L22 42 Z"/>
          <ellipse cx="10" cy="24" rx="6" ry="5.5" fill="url(#mb-skin)"/>
          <path fill="url(#mb-muscle)" d="M86 54 L102 48 L108 34 L98 30 L86 48 Z"/>
          <path fill="url(#mb-muscle)" d="M102 48 L112 42 L114 28 L104 26 L98 42 Z"/>
          <ellipse cx="110" cy="24" rx="6" ry="5.5" fill="url(#mb-skin)"/>
        </g>

        <!-- 5 背面展背 -->
        <g v-show="activePose === 'backLat'">
          <path fill="url(#mb-muscle)" d="M50 102 L46 138 L54 138 L56 106 Z"/>
          <path fill="url(#mb-muscle)" d="M70 102 L68 106 L70 138 L78 138 Z"/>
          <path fill="url(#mb-muscle)" d="M20 58 L100 58 L74 102 L46 102 Z"/>
          <path stroke="rgba(0,0,0,.22)" stroke-width="1.4" fill="none" d="M60 60v36M44 70 Q60 80 76 70M42 84 Q60 96 78 84"/>
          <path fill="url(#mb-muscle)" d="M26 62 L16 80 L24 90 L38 72 Z"/>
          <path fill="url(#mb-muscle)" d="M94 62 L104 80 L96 90 L82 72 Z"/>
          <ellipse cx="20" cy="92" rx="5" ry="4.5" fill="url(#mb-skin)"/>
          <ellipse cx="100" cy="92" rx="5" ry="4.5" fill="url(#mb-skin)"/>
        </g>

        <!-- 6 侧三头 -->
        <g v-show="activePose === 'sideTri'">
          <path fill="url(#mb-muscle)" d="M52 100 L48 138 L56 138 L58 104 Z"/>
          <path fill="url(#mb-muscle)" d="M64 100 L62 104 L70 134 L76 130 L70 100 Z"/>
          <path fill="url(#mb-muscle)" d="M44 50 L76 50 L72 100 L48 100 Z"/>
          <path fill="url(#mb-muscle)" d="M76 54 L94 70 L90 96 L78 92 L74 68 Z"/>
          <path fill="url(#mb-muscle)" d="M90 72 L100 64 L96 56 L86 66 Z"/>
          <ellipse cx="98" cy="58" rx="5" ry="4.5" fill="url(#mb-skin)"/>
          <path fill="url(#mb-muscle)" d="M44 54 L32 72 L36 94 L46 88 L48 66 Z"/>
          <ellipse cx="34" cy="98" rx="5" ry="4.5" fill="url(#mb-skin)"/>
        </g>

        <!-- 7 腹肌与大腿 -->
        <g v-show="activePose === 'abs'">
          <path fill="url(#mb-muscle)" d="M44 100 L36 138 L46 138 L54 104 Z"/>
          <path fill="url(#mb-muscle)" d="M70 102 L66 106 L78 136 L86 132 L76 100 Z"/>
          <path fill="url(#mb-muscle)" d="M38 50 L82 50 L74 100 L46 100 Z"/>
          <path stroke="rgba(0,0,0,.28)" stroke-width="1.4" fill="none" d="M52 68h16M52 74h16M52 80h16M52 86h16M60 68v24"/>
          <path fill="url(#mb-muscle)" d="M38 52 L24 40 L18 28 L28 26 L40 44 Z"/>
          <path fill="url(#mb-muscle)" d="M82 52 L96 40 L102 28 L92 26 L80 44 Z"/>
          <ellipse cx="20" cy="22" rx="5.5" ry="5" fill="url(#mb-skin)"/>
          <ellipse cx="100" cy="22" rx="5.5" ry="5" fill="url(#mb-skin)"/>
        </g>

        <!-- 8 最伟大展 -->
        <g v-show="activePose === 'most'">
          <path fill="url(#mb-muscle)" d="M46 102 L40 138 L48 138 L54 106 Z"/>
          <path fill="url(#mb-muscle)" d="M74 102 L70 106 L76 138 L84 138 Z"/>
          <path fill="url(#mb-muscle)" d="M30 54 L90 54 L78 102 L42 102 Z"/>
          <path fill="rgba(255,220,190,.32)" d="M44 62h16v12H44zM64 62h16v12H64z"/>
          <path stroke="rgba(0,0,0,.22)" stroke-width="1.3" fill="none" d="M50 80h20M50 86h20M50 92h20M60 80v20"/>
          <path fill="url(#mb-muscle)" d="M30 56 L14 62 L10 84 L22 88 L32 68 Z"/>
          <path fill="url(#mb-muscle)" d="M14 62 L4 70 L8 88 L18 84 Z"/>
          <ellipse cx="6" cy="92" rx="5.5" ry="5" fill="url(#mb-skin)"/>
          <path fill="url(#mb-muscle)" d="M90 56 L106 62 L110 84 L98 88 L88 68 Z"/>
          <path fill="url(#mb-muscle)" d="M106 62 L116 70 L112 88 L102 84 Z"/>
          <ellipse cx="114" cy="92" rx="5.5" ry="5" fill="url(#mb-skin)"/>
        </g>

        <!-- 9 经典姿势 -->
        <g v-show="activePose === 'classic'">
          <path fill="url(#mb-muscle)" d="M48 100 L42 138 L50 138 L56 104 Z"/>
          <path fill="url(#mb-muscle)" d="M70 100 L66 104 L74 134 L82 130 L76 100 Z"/>
          <path fill="url(#mb-muscle)" d="M36 50 L84 50 L74 100 L46 100 Z"/>
          <path fill="rgba(255,220,190,.28)" d="M48 58h10v10H48zM62 58h10v10H62z"/>
          <path stroke="rgba(0,0,0,.18)" stroke-width="1.2" fill="none" d="M54 74h12M54 80h12M60 74v16"/>
          <path fill="url(#mb-muscle)" d="M36 54 L28 70 L48 84 L54 76 L40 62 Z"/>
          <path fill="url(#mb-muscle)" d="M84 54 L92 70 L72 84 L66 76 L80 62 Z"/>
          <ellipse cx="54" cy="86" rx="6" ry="5" fill="url(#mb-skin)"/>
          <ellipse cx="66" cy="86" rx="6" ry="5" fill="url(#mb-skin)"/>
        </g>

        <!-- 10 胜利姿势 -->
        <g v-show="activePose === 'victory'">
          <path fill="url(#mb-muscle)" d="M48 100 L44 138 L52 138 L56 104 Z"/>
          <path fill="url(#mb-muscle)" d="M72 100 L68 104 L72 138 L80 138 Z"/>
          <path fill="url(#mb-muscle)" d="M40 52 L80 52 L74 100 L46 100 Z"/>
          <path fill="rgba(255,220,190,.28)" d="M50 60h8v9H50zM62 60h8v9H62z"/>
          <path stroke="rgba(0,0,0,.18)" stroke-width="1.1" fill="none" d="M54 74h12M54 80h12M60 74v16"/>
          <path fill="url(#mb-muscle)" d="M40 52 L28 34 L22 16 L32 14 L42 36 Z"/>
          <path fill="url(#mb-muscle)" d="M28 34 L20 18 L24 8 L34 14 Z"/>
          <ellipse cx="24" cy="6" rx="5.5" ry="5" fill="url(#mb-skin)"/>
          <path fill="url(#mb-muscle)" d="M80 52 L92 34 L98 16 L88 14 L78 36 Z"/>
          <path fill="url(#mb-muscle)" d="M92 34 L100 18 L96 8 L86 14 Z"/>
          <ellipse cx="96" cy="6" rx="5.5" ry="5" fill="url(#mb-skin)"/>
        </g>

        <!-- 共用头+美式前刺（叠在身体上层） -->
        <g>
          <rect x="55" y="38" width="10" height="14" rx="3" fill="url(#mb-skin)"/>
          <circle cx="60" cy="30" r="14" fill="url(#mb-skin)"/>
          <g fill="url(#mb-hair)">
            <ellipse cx="60" cy="24" rx="15" ry="10"/>
            <path d="M46 26 Q48 16 54 12 L52 26 Z"/>
            <path d="M50 24 Q54 10 60 8 L58 26 Z"/>
            <path d="M56 22 Q62 7 66 8 L64 26 Z"/>
            <path d="M62 22 Q70 9 74 12 L70 26 Z"/>
            <path d="M68 24 Q76 14 78 20 L72 28 Z"/>
            <path d="M45 28 Q42 30 44 34 Q50 30 54 28 Z"/>
            <path d="M75 28 Q78 30 76 34 Q70 30 66 28 Z"/>
          </g>
        </g>
      </svg>
    </div>
    <div class="muscle-buddy__label">{{ poseLabel }}</div>
  </div>
</template>

<script>
/** IFBB 八大强制姿势 + 经典 / 胜利 两个自由展示 */
const POSES = [
  { id: 'double', label: '正面双二头' },
  { id: 'frontLat', label: '正面展背' },
  { id: 'sideChest', label: '侧胸展' },
  { id: 'backDouble', label: '背面双二头' },
  { id: 'backLat', label: '背面展背' },
  { id: 'sideTri', label: '侧三头' },
  { id: 'abs', label: '腹肌与大腿' },
  { id: 'most', label: '最伟大展' },
  { id: 'classic', label: '经典姿势' },
  { id: 'victory', label: '胜利姿势' },
];

export default {
  name: 'SpinBuddy',
  props: {
    musicPlaying: { type: Boolean, default: false },
  },
  data() {
    return {
      pose: 'double',
      flexing: false,
      flexTimer: null,
      hypeTimer: null,
      poseIndex: 0,
    };
  },
  computed: {
    activePose() {
      return this.flexing || this.musicPlaying ? this.pose : 'idle';
    },
    poseLabel() {
      if (this.musicPlaying) return '听到歌了！兴奋ing';
      return this.flexing
        ? (POSES.find((p) => p.id === this.pose)?.label || '秀肌肉')
        : '点我秀肌肉';
    },
  },
  watch: {
    musicPlaying: {
      immediate: true,
      handler(on) {
        if (on) this.startHype();
        else this.stopHype();
      },
    },
  },
  beforeUnmount() {
    if (this.flexTimer) clearTimeout(this.flexTimer);
    this.stopHype();
  },
  methods: {
    flexPose() {
      if (this.musicPlaying) return;
      const pool = POSES.filter((p) => !(this.flexing && p.id === this.pose));
      this.pose = pool[Math.floor(Math.random() * pool.length)].id;
      this.flexing = true;
      if (this.flexTimer) clearTimeout(this.flexTimer);
      this.flexTimer = setTimeout(() => {
        this.flexing = false;
      }, 2800);
    },
    startHype() {
      this.stopHype();
      this.flexing = true;
      this.poseIndex = 0;
      this.pose = POSES[0].id;
      this.hypeTimer = setInterval(() => {
        this.poseIndex = (this.poseIndex + 1) % POSES.length;
        this.pose = POSES[this.poseIndex].id;
      }, 700);
    },
    stopHype() {
      if (this.hypeTimer) {
        clearInterval(this.hypeTimer);
        this.hypeTimer = null;
      }
      if (!this.flexTimer) this.flexing = false;
    },
  },
};
</script>

<style scoped>
.muscle-buddy {
  width: 156px;
  height: 188px;
  margin: 0.2rem auto 0.1rem;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  position: relative;
}
.muscle-buddy__stage {
  position: absolute;
  left: 50%;
  top: 0;
  width: 120px;
  height: 150px;
  margin-left: -60px;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35));
  transition: filter 0.3s ease;
}
.muscle-buddy__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
.muscle-buddy.is-flex .muscle-buddy__stage {
  filter:
    drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35))
    drop-shadow(0 0 12px rgba(255, 140, 90, 0.45));
}
.muscle-buddy.is-hyped .muscle-buddy__stage {
  animation: muscle-hype 0.55s ease-in-out infinite;
  filter:
    drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35))
    drop-shadow(0 0 18px rgba(255, 120, 70, 0.7));
}
.muscle-buddy__label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  text-align: center;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--leleo-vcard-color);
  opacity: 0.9;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
}
.muscle-buddy.is-hyped .muscle-buddy__label {
  color: #ffd7b0;
  font-weight: 700;
  animation: muscle-label-pulse 0.7s ease-in-out infinite;
}
@keyframes muscle-hype {
  0%, 100% { transform: translateY(0) scale(1); }
  25% { transform: translateY(-6px) scale(1.06) rotate(-2deg); }
  50% { transform: translateY(0) scale(1.08); }
  75% { transform: translateY(-4px) scale(1.05) rotate(2deg); }
}
@keyframes muscle-label-pulse {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}
</style>
