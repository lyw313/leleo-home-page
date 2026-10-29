<template>
  <div class="blog-panel building-solid">
    <div class="blog-panel__head">
      <div>
        <div class="blog-panel__title">
          <v-icon icon="mdi-school-outline" size="22"></v-icon>
          学习博客
        </div>
        <div class="blog-panel__sub">笔记 · 项目分享 · 学习记录</div>
      </div>
    </div>

    <button type="button" class="blog-panel__enter" @click="$emit('open-blog-home')">
      <span>
        <strong>进入博客空间</strong>
        <small>独立页面阅读 / 管理</small>
      </span>
      <v-icon icon="mdi-arrow-right" size="22"></v-icon>
    </button>

    <div class="blog-panel__list">
      <div v-if="!posts.length" class="blog-panel__empty">还没有学习记录</div>
      <button
        v-for="post in recentPosts"
        :key="post.id"
        type="button"
        class="blog-panel__row"
        @click="$emit('open-blog', post.id)"
      >
        <span class="blog-panel__kind">{{ post.kind === 'project' ? '项目' : '笔记' }}</span>
        <span class="blog-panel__row-main">
          <span class="blog-panel__row-title">{{ post.title }}</span>
          <span class="blog-panel__row-meta">{{ post.summary || excerpt(post.content, 36) }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import { loadBlogPosts, excerpt, hydrateBlogFromServer } from '../utils/blogStore.js';

export default {
  name: 'BlogPanel',
  props: {
    config: { type: Object, default: () => ({}) },
  },
  emits: ['open-blog-home', 'open-blog'],
  data() {
    return { posts: [] };
  },
  computed: {
    recentPosts() {
      return this.posts.slice(0, 6);
    },
  },
  mounted() {
    this.reloadFromCache();
    this.hydrateFromServer();
    window.addEventListener('storage', this.reloadFromCache);
    window.addEventListener('leleo-blog-updated', this.reloadFromCache);
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.reloadFromCache);
    window.removeEventListener('leleo-blog-updated', this.reloadFromCache);
  },
  methods: {
    excerpt,
    reloadFromCache() {
      this.posts = loadBlogPosts(this.config.blogAdmin?.seedPosts || []);
    },
    async hydrateFromServer() {
      try {
        const state = await hydrateBlogFromServer(this.config.blogAdmin?.seedPosts || []);
        if (state?.posts) this.posts = state.posts;
      } catch (_) {}
    },
    reload() {
      this.reloadFromCache();
      this.hydrateFromServer();
    },
  },
};
</script>

<style scoped>
.blog-panel {
  width: 100%;
  max-width: none;
  margin: 0.45rem 0 0.55rem;
  padding: 1rem 1rem 0.9rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(var(--leleo-blur));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  color: #fff;
  text-align: left;
  box-sizing: border-box;
}
.blog-panel__head { margin-bottom: 0.7rem; }
.blog-panel__title {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.08rem;
  font-weight: 750;
  letter-spacing: 0.06em;
}
.blog-panel__sub {
  margin-top: 0.28rem;
  font-size: 0.78rem;
  opacity: 0.78;
}
.blog-panel__enter {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: none;
  border-radius: 16px;
  padding: 0.9rem 1rem;
  margin-bottom: 0.7rem;
  cursor: pointer;
  text-align: left;
  color: #1a1f28;
  background: linear-gradient(135deg, #ffe8a0, #b8f0ff);
}
.blog-panel__enter strong {
  display: block;
  font-size: 1rem;
}
.blog-panel__enter small {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.74rem;
  opacity: 0.75;
}
.blog-panel__list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 280px;
  overflow-y: auto;
}
.blog-panel__empty {
  font-size: 0.82rem;
  opacity: 0.65;
  padding: 0.45rem 0.1rem;
}
.blog-panel__row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border: none;
  background: rgba(0, 0, 0, 0.18);
  color: inherit;
  border-radius: 14px;
  padding: 0.6rem 0.65rem;
  cursor: pointer;
  text-align: left;
}
.blog-panel__row:hover { background: rgba(0, 0, 0, 0.28); }
.blog-panel__kind {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.18rem 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  margin-top: 0.12rem;
}
.blog-panel__row-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}
.blog-panel__row-title {
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.blog-panel__row-meta {
  font-size: 0.74rem;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 960px) {
  .blog-panel {
    width: min(100%, 480px);
    margin: 0.5rem auto;
  }
}
</style>
