<template>
  <Teleport to="body">
    <button
      v-if="!visible"
      type="button"
      class="mini-player-fab"
      :class="{ 'is-playing': isPlaying }"
      title="打开播放器"
      @click="visible = true"
    >
      <v-icon icon="mdi-music" size="22"></v-icon>
    </button>

    <div
      v-else
      class="mini-player"
      :class="{ 'is-playing': isPlaying, 'is-loading': loading, 'has-list': listOpen }"
      :style="panelBgStyle"
    >
      <div v-if="listOpen" class="mini-player__panel">
        <div class="mini-player__head">
          <span class="mini-player__label">我的歌单 · {{ songs.length }}</span>
          <div class="mini-player__head-actions">
            <button
              v-if="isAdmin"
              type="button"
              class="mini-player__icon-btn"
              title="添加歌曲"
              @click="showForm = !showForm"
            >
              <v-icon icon="mdi-plus" size="18"></v-icon>
            </button>
            <button type="button" class="mini-player__icon-btn" title="收起歌单" @click="listOpen = false">
              <v-icon icon="mdi-chevron-down" size="18"></v-icon>
            </button>
          </div>
        </div>

        <div v-if="isAdmin && showForm" class="mini-player__form">
          <input v-model="draft.title" class="mini-player__input" type="text" maxlength="80" placeholder="歌名" />
          <input v-model="draft.author" class="mini-player__input" type="text" maxlength="60" placeholder="歌手" />
          <input
            v-model="draft.url"
            class="mini-player__input"
            type="text"
            maxlength="400"
            placeholder="音频地址（可选，如 /music/xxx.mp3）"
          />
          <label class="mini-player__file">
            <span>{{ draft.fileName || '或选择本地 mp3 / m4a' }}</span>
            <input type="file" accept="audio/mpeg,audio/mp4,audio/*,.mp3,.m4a,.ogg" @change="onPickFile" />
          </label>
          <div v-if="formError" class="mini-player__error">{{ formError }}</div>
          <button type="button" class="mini-player__save" :disabled="!canAdd || adding" @click="submitAdd">
            {{ adding ? '添加中…' : '添加到歌单' }}
          </button>
        </div>

        <div class="mini-player__list">
          <div v-if="!songs.length" class="mini-player__empty">
            歌单还是空的{{ isAdmin ? '，点 + 添加歌曲' : '' }}
          </div>
          <div
            v-for="(song, index) in songs"
            :key="song.id || index"
            class="mini-player__row"
            :class="{ 'is-active': index === currentIndex }"
          >
            <button type="button" class="mini-player__row-btn" @click="$emit('select', index)">
              <span class="mini-player__idx">{{ index + 1 }}</span>
              <span class="mini-player__row-main">
                <span class="mini-player__row-title">{{ song.title || '未知歌曲' }}</span>
                <span class="mini-player__row-artist">{{ song.author || '未知歌手' }}</span>
              </span>
              <v-icon v-if="index === currentIndex && isPlaying" icon="mdi-equalizer" size="16" class="mini-player__eq"></v-icon>
            </button>
            <button
              v-if="isAdmin"
              type="button"
              class="mini-player__del"
              title="删除歌曲"
              @click.stop="$emit('remove-song', song.id || index)"
            >
              <v-icon icon="mdi-delete-outline" size="16"></v-icon>
            </button>
          </div>
        </div>
      </div>

      <div class="mini-player__bar">
        <div class="mini-player__now">
          <div class="mini-player__cover" :style="coverStyle">
            <v-icon v-if="!cover" icon="mdi-music" size="22"></v-icon>
          </div>
          <div class="mini-player__meta">
            <div class="mini-player__title">{{ title }}</div>
            <div class="mini-player__artist">{{ artist }}</div>
          </div>
          <button type="button" class="mini-player__icon-btn" title="关闭播放器" @click="visible = false">
            <v-icon icon="mdi-close" size="16"></v-icon>
          </button>
        </div>

        <div class="mini-player__progress">
          <span class="mini-player__time">{{ formatTime(currentTime) }}</span>
          <input
            class="mini-player__seek"
            type="range"
            min="0"
            :max="seekMax"
            step="0.1"
            :value="currentTime"
            @input="onSeekInput"
          />
          <span class="mini-player__time">{{ formatTime(duration) }}</span>
        </div>

        <div class="mini-player__bottom">
          <button
            type="button"
            class="mini-player__list-btn"
            :class="{ 'is-on': listOpen }"
            title="歌单"
            @click="listOpen = !listOpen"
          >
            <v-icon icon="mdi-playlist-music" size="18"></v-icon>
          </button>

          <div class="mini-player__controls">
            <button type="button" class="mini-player__btn" title="上一首" @click="$emit('prev')">
              <v-icon icon="mdi-skip-previous" size="20"></v-icon>
            </button>
            <button type="button" class="mini-player__btn mini-player__btn--main" title="播放/暂停" @click="$emit('toggle')">
              <v-icon :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="22"></v-icon>
            </button>
            <button type="button" class="mini-player__btn" title="下一首" @click="$emit('next')">
              <v-icon icon="mdi-skip-next" size="20"></v-icon>
            </button>
          </div>

          <div class="mini-player__volume">
            <button type="button" class="mini-player__btn" title="静音切换" @click="toggleMute">
              <v-icon :icon="volumeIcon" size="18"></v-icon>
            </button>
            <input
              class="mini-player__vol"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="volume"
              @input="onVolInput"
            />
          </div>
        </div>

        <div class="mini-player__lyric-stage">
          <Transition name="lyric-fade" mode="out-in">
            <p :key="currentLyricKey" class="mini-player__lyric-one">
              {{ currentLyricText }}
            </p>
          </Transition>
        </div>

        <div v-if="loading" class="mini-player__loading">
          <v-progress-circular indeterminate size="18" width="2" color="white"></v-progress-circular>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { saveMusicBlob } from '../utils/musicStore.js';
import { formatTime } from '../utils/lyricsUtils.js';

function emptyDraft() {
  return { title: '', author: '', url: '', file: null, fileName: '' };
}

export default {
  name: 'MiniMusic',
  props: {
    title: { type: String, default: '暂无歌曲' },
    artist: { type: String, default: '—' },
    cover: { type: String, default: '' },
    background: { type: String, default: '/img/world/life/moon-town.png' },
    isPlaying: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    songs: { type: Array, default: () => [] },
    currentIndex: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    currentTime: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    volume: { type: Number, default: 0.8 },
    lyricLines: { type: Array, default: () => [] },
    lyricIndex: { type: Number, default: -1 },
    loadingLyrics: { type: Boolean, default: false },
  },
  emits: ['toggle', 'prev', 'next', 'select', 'add-song', 'remove-song', 'seek', 'volume'],
  data() {
    return {
      visible: true,
      listOpen: true,
      showForm: false,
      draft: emptyDraft(),
      formError: '',
      adding: false,
      mutedVolume: 0.8,
    };
  },
  computed: {
    coverStyle() {
      if (!this.cover) return {};
      return {
        backgroundImage: `url(${this.cover})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    },
    panelBgStyle() {
      if (!this.background) return {};
      return { '--music-bg': `url(${this.background})` };
    },
    canAdd() {
      return !!(this.draft.title.trim() && (this.draft.url.trim() || this.draft.file));
    },
    seekMax() {
      return Math.max(this.duration || 0, 0.1);
    },
    volumeIcon() {
      if (this.volume <= 0.001) return 'mdi-volume-off';
      if (this.volume < 0.4) return 'mdi-volume-low';
      if (this.volume < 0.75) return 'mdi-volume-medium';
      return 'mdi-volume-high';
    },
    currentLyricText() {
      if (this.loadingLyrics) return '正在匹配歌词…';
      if (!this.lyricLines.length) return '♪ 暂无歌词';
      if (this.lyricIndex < 0) return '♪';
      return this.lyricLines[this.lyricIndex]?.text || '♪';
    },
    currentLyricKey() {
      return `${this.currentIndex}-${this.lyricIndex}-${this.currentLyricText}`;
    },
  },
  watch: {
    isAdmin(v) {
      if (!v) {
        this.showForm = false;
        this.draft = emptyDraft();
        this.formError = '';
      }
    },
    listOpen(v) {
      if (!v) this.showForm = false;
    },
  },
  methods: {
    formatTime,
    onSeekInput(e) {
      this.$emit('seek', Number(e.target.value));
    },
    onVolInput(e) {
      this.$emit('volume', Number(e.target.value));
    },
    toggleMute() {
      if (this.volume > 0.001) {
        this.mutedVolume = this.volume;
        this.$emit('volume', 0);
      } else {
        this.$emit('volume', this.mutedVolume || 0.8);
      }
    },
    onPickFile(e) {
      const file = e.target.files?.[0] || null;
      this.draft.file = file;
      this.draft.fileName = file ? file.name : '';
      if (file && !this.draft.title.trim()) {
        this.draft.title = file.name.replace(/\.[^.]+$/, '');
      }
      this.formError = '';
    },
    async submitAdd() {
      if (!this.isAdmin || !this.canAdd || this.adding) return;
      this.formError = '';
      this.adding = true;
      try {
        const payload = {
          title: this.draft.title.trim(),
          author: this.draft.author.trim() || '未知歌手',
          url: this.draft.url.trim(),
          pic: '',
          blobKey: '',
        };
        if (this.draft.file) {
          const blobKey = `blob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          await saveMusicBlob(blobKey, this.draft.file);
          payload.blobKey = blobKey;
          payload.url = URL.createObjectURL(this.draft.file);
        }
        this.$emit('add-song', payload);
        this.draft = emptyDraft();
        this.showForm = false;
      } catch (e) {
        console.warn(e);
        this.formError = '添加失败，请重试';
      } finally {
        this.adding = false;
      }
    },
  },
};
</script>

<style scoped>
.mini-player-fab {
  position: fixed;
  right: 1rem;
  left: auto;
  bottom: 1rem;
  z-index: 45;
  width: 3.1rem;
  height: 3.1rem;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #f4fbfb;
  background: #2a6f76;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
  display: grid;
  place-items: center;
}
.mini-player-fab.is-playing {
  animation: mini-fab-pulse 1.6s ease-in-out infinite;
}
.mini-player-fab:hover { filter: brightness(1.08); }
@keyframes mini-fab-pulse {
  0%, 100% { box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22); }
  50% { box-shadow: 0 10px 28px rgba(42, 111, 118, 0.45); }
}

.mini-player {
  position: fixed;
  right: 1rem;
  left: auto;
  bottom: 1rem;
  z-index: 45;
  width: min(400px, calc(100vw - 2rem));
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  color: #f2f5f8;
  user-select: none;
}
.mini-player__panel,
.mini-player__bar {
  border-radius: 18px;
  background:
    linear-gradient(165deg, rgba(10, 14, 22, 0.78), rgba(12, 16, 24, 0.84)),
    var(--music-bg, none) center / cover no-repeat;
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
}
.mini-player__panel {
  padding: 0.7rem 0.7rem 0.55rem;
  height: min(38vh, 320px);
  display: flex;
  flex-direction: column;
}
.mini-player__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.1rem 0.25rem 0.45rem;
}
.mini-player__head-actions {
  display: flex;
  align-items: center;
  gap: 0.1rem;
}
.mini-player__label {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.mini-player__icon-btn {
  border: none;
  background: transparent;
  color: inherit;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.mini-player__icon-btn:hover { background: rgba(255, 255, 255, 0.1); }

.mini-player__form {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
  padding: 0.45rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.28);
}
.mini-player__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font: inherit;
  font-size: 0.82rem;
}
.mini-player__input::placeholder { color: rgba(255, 255, 255, 0.45); }
.mini-player__file {
  position: relative;
  display: block;
  border: 1px dashed rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  overflow: hidden;
}
.mini-player__file input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.mini-player__error { color: #ffb4a8; font-size: 0.74rem; }
.mini-player__save {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: #2a6f76;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.mini-player__save:disabled { opacity: 0.45; cursor: not-allowed; }

.mini-player__list {
  overflow-y: auto;
  min-height: 0;
  flex: 1 1 auto;
}
.mini-player__list::-webkit-scrollbar { width: 5px; }
.mini-player__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.28);
  border-radius: 4px;
}
.mini-player__empty {
  padding: 1rem 0.5rem;
  text-align: center;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.62);
}
.mini-player__row {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  border-radius: 10px;
}
.mini-player__row:hover { background: rgba(255, 255, 255, 0.08); }
.mini-player__row.is-active { background: rgba(124, 210, 220, 0.2); }
.mini-player__row-btn {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 0.5rem 0.4rem;
  border-radius: 10px;
  cursor: pointer;
}
.mini-player__idx {
  width: 1.3rem;
  flex-shrink: 0;
  font-size: 0.76rem;
  opacity: 0.5;
  text-align: center;
}
.mini-player__row.is-active .mini-player__idx { color: #9be7ef; opacity: 1; }
.mini-player__row-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.mini-player__row-title,
.mini-player__row-artist,
.mini-player__title,
.mini-player__artist {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini-player__row-title { font-size: 0.86rem; font-weight: 650; }
.mini-player__row-artist { font-size: 0.72rem; opacity: 0.62; }
.mini-player__eq { color: #9be7ef; flex-shrink: 0; }
.mini-player__del {
  width: 1.8rem;
  height: 1.8rem;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: rgba(255, 90, 90, 0.16);
  color: #ffb4a8;
  display: grid;
  place-items: center;
  cursor: pointer;
  margin-right: 0.15rem;
}

.mini-player__bar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.7rem 0.8rem 0.65rem;
}
.mini-player__now {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.mini-player__cover {
  width: 3.1rem;
  height: 3.1rem;
  border-radius: 12px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: rgba(155, 231, 239, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  overflow: hidden;
  color: #9be7ef;
}
.mini-player.is-playing .mini-player__cover {
  animation: mini-spin 8s linear infinite;
}
.mini-player__meta { min-width: 0; flex: 1; }
.mini-player__title { font-size: 0.95rem; font-weight: 700; }
.mini-player__artist { margin-top: 0.12rem; font-size: 0.76rem; opacity: 0.65; }

.mini-player__progress {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.4rem;
  align-items: center;
}
.mini-player__time {
  font-size: 0.72rem;
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
  min-width: 2.1rem;
}
.mini-player__seek,
.mini-player__vol {
  width: 100%;
  accent-color: #7cd6df;
  cursor: pointer;
}
.mini-player__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}
.mini-player__list-btn {
  border: none;
  border-radius: 10px;
  width: 2.15rem;
  height: 2.15rem;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.mini-player__list-btn.is-on,
.mini-player__list-btn:hover {
  background: rgba(155, 231, 239, 0.22);
  color: #9be7ef;
}
.mini-player__controls {
  display: flex;
  align-items: center;
  gap: 0.12rem;
}
.mini-player__volume {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
  max-width: 8.5rem;
  justify-content: flex-end;
}
.mini-player__btn {
  width: 2.1rem;
  height: 2.1rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.mini-player__btn:hover { background: rgba(255, 255, 255, 0.1); }
.mini-player__btn--main {
  width: 2.5rem;
  height: 2.5rem;
  background: #2a6f76;
  color: #f4fbfb;
}
.mini-player__lyric-stage {
  min-height: 1.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.05rem 0.2rem;
}
.mini-player__lyric-one {
  margin: 0;
  width: 100%;
  font-size: 0.9rem;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: 0.04em;
  color: #9be7ef;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lyric-fade-enter-active,
.lyric-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.lyric-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.lyric-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
.mini-player__loading {
  position: absolute;
  right: 0.5rem;
  top: 0.45rem;
}
@keyframes mini-spin { to { transform: rotate(360deg); } }

@media (max-width: 960px) {
  .mini-player,
  .mini-player-fab {
    right: 0.55rem;
    left: auto;
    bottom: 0.55rem;
  }
  .mini-player { width: min(380px, calc(100vw - 1.1rem)); }
  .mini-player__panel { height: min(32vh, 280px); }
}
</style>
