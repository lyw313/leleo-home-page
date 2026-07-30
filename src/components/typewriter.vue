<template>
  <div class="leleo-typewriter">
    <div class="leleo-typewriter__line">
      <span class="qm">“ </span><span ref="text" class="msg"></span><span class="qm"> ”</span>
    </div>
    <span class="leleo-typewriter__underline" aria-hidden="true"></span>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import TypeIt from 'typeit'
import config from '../config.js';

const text = ref(null)
let instance = null
let replayTimer = null
let destroyed = false

const getConfig = () => {
    try {
        if (import.meta.env.VITE_CONFIG) {
            return JSON.parse(import.meta.env.VITE_CONFIG);
        }
    } catch (_) {}
    return config;
}

const clearReplay = () => {
    if (replayTimer) {
        clearTimeout(replayTimer);
        replayTimer = null;
    }
}

const destroyInstance = () => {
    if (!instance) return;
    try { instance.destroy(); } catch (_) {}
    instance = null;
}

const play = () => {
    if (destroyed || !text.value) return;
    clearReplay();
    destroyInstance();
    text.value.innerHTML = '';

    const configdata = getConfig();
    const strings = configdata.typeWriterStrings || ['活着！'];

    try {
        instance = new TypeIt(text.value, {
            strings,
            speed: 85,
            deleteSpeed: 40,
            startDelay: 400,
            lifeLike: false,
            cursor: false,
            breakLines: false,
            loop: false,
            afterComplete: () => {
                if (destroyed) return;
                clearReplay();
                replayTimer = setTimeout(() => {
                    play();
                }, 13000);
            },
        });
        instance.go();
    } catch (e) {
        console.warn('打字机启动失败:', e);
        text.value.textContent = strings[0] || '';
    }
}

onMounted(() => {
    play();
})

onBeforeUnmount(() => {
    destroyed = true;
    clearReplay();
    destroyInstance();
})
</script>
 
<style scoped>
.leleo-typewriter {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 100%;
  padding-bottom: 0.55rem;
}

.leleo-typewriter__line {
  position: relative;
  z-index: 1;
}

.msg, .qm{
    color: var(--leleo-vcard-color);
    letter-spacing: 2px;
    font-family: Arial, sans-serif;
    font-size: 25px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.leleo-typewriter__underline {
  display: block;
  width: min(92%, 520px);
  height: 3px;
  margin-top: 0.55rem;
  border-radius: 999px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 236, 160, 0.25) 18%,
    rgba(255, 255, 255, 0.85) 50%,
    rgba(170, 240, 255, 0.35) 82%,
    transparent 100%
  );
  box-shadow:
    0 0 10px rgba(255, 236, 160, 0.45),
    0 0 18px rgba(170, 240, 255, 0.3);
  animation: underline-breathe 2.4s ease-in-out infinite;
}

.leleo-typewriter__underline::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.95),
    transparent
  );
  transform: translateX(-120%);
  animation: underline-sweep 2.2s ease-in-out infinite;
}

.leleo-typewriter__underline::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, #fff 0%, rgba(255, 236, 160, 0.8) 45%, transparent 70%);
  box-shadow: 0 0 12px rgba(255, 236, 160, 0.9);
  animation: underline-dot 2.2s ease-in-out infinite;
}

@keyframes underline-breathe {
  0%, 100% {
    opacity: 0.7;
    transform: scaleX(0.96);
  }
  50% {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes underline-sweep {
  0% { transform: translateX(-120%); }
  55%, 100% { transform: translateX(120%); }
}

@keyframes underline-dot {
  0%, 100% {
    left: 18%;
    opacity: 0.35;
  }
  50% {
    left: 82%;
    opacity: 1;
  }
}

.msg ::v-deep.cursorChar {
    display: inline-block;
    margin-left: 2px;
}
@media screen and (min-width: 960px) and (max-width: 1200px)  {
    .msg, .qm{
        font-size: 20px;
    }
}
@media (max-width: 960px){
    .leleo-typewriter{
        min-height: 76px;   
    }
    .msg, .qm{
        font-size: 16px;
    }
    .leleo-typewriter__underline {
      width: min(88%, 360px);
      margin-top: 0.4rem;
    }
}
</style>
