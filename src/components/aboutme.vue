<template>
  <div v-if="about" class="about-panel" :style="{ maxWidth: maxWidth + 'px' }">
    <div class="about-panel__title">{{ about.title || '关于我' }}</div>
    <p v-if="about.summary" class="about-panel__summary">{{ about.summary }}</p>

    <button type="button" class="about-panel__cta" @click="$emit('open-reviews')">
      <span class="about-panel__cta-icon" aria-hidden="true">
        <v-icon icon="mdi-message-text-outline" size="18"></v-icon>
      </span>
      <span class="about-panel__cta-copy">
        <span class="about-panel__cta-main">大家的评价</span>
        <span class="about-panel__cta-sub">点击查看 / 写下你的评论</span>
      </span>
      <span class="about-panel__cta-arrow" aria-hidden="true">
        <v-icon icon="mdi-chevron-right" size="20"></v-icon>
      </span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'AboutMe',
  props: {
    about: { type: Object, default: null },
    maxWidth: { type: [Number, String], default: 300 },
  },
  emits: ['open-reviews'],
};
</script>

<style scoped>
.about-panel {
  width: 100%;
  padding: 0.85rem 0.9rem 0.95rem;
  box-sizing: border-box;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(var(--leleo-blur));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
  color: var(--leleo-vcard-color);
  text-align: left;
}

.about-panel__title {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  opacity: 0.95;
  margin-bottom: 0.45rem;
}

.about-panel__summary {
  margin: 0 0 0.85rem;
  font-size: 0.88rem;
  line-height: 1.65;
  opacity: 0.96;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
}

.about-panel__cta {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-align: left;
  padding: 0.7rem 0.75rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(135deg, rgba(255, 236, 160, 0.22), rgba(170, 240, 255, 0.16));
  color: inherit;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.about-panel__cta:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, rgba(255, 236, 160, 0.3), rgba(170, 240, 255, 0.22));
}

.about-panel__cta-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.14);
}

.about-panel__cta-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.about-panel__cta-main {
  font-weight: 700;
  font-size: 0.92rem;
}

.about-panel__cta-sub {
  font-size: 0.72rem;
  opacity: 0.8;
}

.about-panel__cta-arrow {
  flex-shrink: 0;
  opacity: 0.85;
  display: grid;
  place-items: center;
}
</style>
