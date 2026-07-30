<template>
  <div class="skill-panel">
    <div class="skill-panel__title">技能</div>
    <div
      v-for="(item, index) in skillList"
      :key="item.name"
      class="skill-row"
      :style="{ '--delay': `${index * 0.08}s`, '--level': item.point + '%' }"
    >
      <div class="skill-row__meta">
        <span class="skill-row__name">
          <v-icon v-if="item.icon" :icon="item.icon" size="16" class="skill-row__icon"></v-icon>
          {{ item.name }}
        </span>
        <span class="skill-row__point">{{ item.point }}%</span>
      </div>
      <div class="skill-row__track">
        <div class="skill-row__fill" :class="{ 'is-ready': animated }"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'polarChart',
  props: {
    skills: { type: Array, default: () => [] },
  },
  data() {
    return {
      skillList: [],
      animated: false,
    };
  },
  watch: {
    skills: {
      immediate: true,
      deep: true,
      handler(list) {
        this.skillList = Array.isArray(list) ? list.map((s) => ({ ...s })) : [];
        this.animated = false;
        requestAnimationFrame(() => {
          this.animated = true;
        });
      },
    },
  },
};
</script>

<style scoped>
.skill-panel {
  width: 100%;
  height: 100%;
  padding: 0.7rem 0.85rem 0.8rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.28rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(var(--leleo-blur));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  position: relative;
  z-index: 1;
  overflow: visible;
}

.skill-panel__title {
  color: var(--leleo-vcard-color);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  opacity: 0.85;
  margin-bottom: 0.2rem;
  text-align: left;
}

.skill-row {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  padding: 0.22rem 0.3rem;
  border-radius: 10px;
  transform-origin: left center;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), background 0.22s ease, box-shadow 0.22s ease;
  position: relative;
  z-index: 1;
}

.skill-row:hover {
  transform: scale(1.12);
  z-index: 5;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}

.skill-row__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--leleo-vcard-color);
  font-size: 0.78rem;
  line-height: 1.2;
}

.skill-row__name {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.skill-row__icon {
  opacity: 0.9;
}

.skill-row__point {
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
  font-size: 0.72rem;
}

.skill-row__track {
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.skill-row__fill {
  height: 100%;
  width: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(255, 236, 160, 0.95), rgba(255, 255, 255, 0.95), rgba(170, 240, 255, 0.95));
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.35);
  transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--delay);
}

.skill-row__fill.is-ready {
  width: var(--level);
}

.skill-row:hover .skill-row__fill {
  filter: brightness(1.1);
}

@media (max-width: 960px) {
  .skill-panel {
    padding: 0.6rem 0.7rem;
    gap: 0.22rem;
  }

  .skill-row:hover {
    transform: scale(1.08);
  }

  .skill-row__meta {
    font-size: 0.72rem;
  }

  .skill-row__track {
    height: 6px;
  }
}
</style>
