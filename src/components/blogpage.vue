<template>
  <div class="blog-page">
    <div class="blog-page__scrim" :style="scrimStyle" aria-hidden="true"></div>
    <div class="blog-page__floats" aria-hidden="true">
      <span
        v-for="(item, idx) in floatItems"
        :key="idx"
        class="blog-page__float"
        :style="item.style"
      >{{ item.text }}</span>
    </div>
    <div class="blog-page__shell">
      <header class="blog-page__top">
        <button type="button" class="blog-page__ghost" @click="$emit('back')">
          <v-icon icon="mdi-arrow-left" size="18"></v-icon>
          返回主页
        </button>

        <div class="blog-page__brand">
          <h1>学习博客</h1>
          <p>记录学习笔记 · 分享项目与实践</p>
        </div>

        <div class="blog-page__top-actions">
          <template v-if="mode === 'list'">
            <button v-if="unlocked" type="button" class="blog-page__primary" @click="goWrite">
              <v-icon icon="mdi-pencil-plus-outline" size="18"></v-icon>
              写记录
            </button>
            <button v-else type="button" class="blog-page__ghost" @click="showLogin = !showLogin">
              <v-icon icon="mdi-lock-outline" size="18"></v-icon>
              管理
            </button>
            <button v-if="unlocked" type="button" class="blog-page__ghost" @click="logout">退出管理</button>
          </template>
          <template v-else-if="mode === 'read' && post">
            <button type="button" class="blog-page__ghost" @click="goList">全部记录</button>
            <template v-if="unlocked">
              <button type="button" class="blog-page__ghost" @click="goEdit(post.id)">编辑</button>
              <button type="button" class="blog-page__danger" @click="removeCurrent">删除</button>
            </template>
          </template>
          <template v-else>
            <button type="button" class="blog-page__ghost" @click="goList">取消</button>
          </template>
        </div>
      </header>

      <div v-if="showLogin && !unlocked" class="blog-page__login">
        <input
          v-model="password"
          class="blog-page__input"
          type="password"
          maxlength="64"
          placeholder="管理密码（写 / 删 / 改）"
          @keydown.enter="login"
        />
        <button type="button" class="blog-page__primary" :disabled="!password" @click="login">解锁</button>
        <span v-if="loginError" class="blog-page__error">{{ loginError }}</span>
        <span v-else class="blog-page__tip">与全站管理员同一密码，约 2 小时有效</span>
      </div>

      <div v-if="unlocked && mode === 'list'" class="blog-page__session">
        管理中 · {{ remainText }}
      </div>

      <!-- 列表页 -->
      <section v-if="mode === 'list'" class="blog-page__list-view">
        <div class="blog-page__filters">
          <button
            type="button"
            class="blog-page__chip"
            :class="{ active: filter === 'all' }"
            @click="filter = 'all'"
          >全部</button>
          <button
            type="button"
            class="blog-page__chip"
            :class="{ active: filter === 'note' }"
            @click="filter = 'note'"
          >学习笔记</button>
          <button
            type="button"
            class="blog-page__chip"
            :class="{ active: filter === 'project' }"
            @click="filter = 'project'"
          >项目分享</button>
          <input
            v-model="keyword"
            class="blog-page__search"
            type="search"
            placeholder="搜索标题 / 标签 / 内容"
          />
        </div>

        <div v-if="!filteredPosts.length" class="blog-page__empty">
          暂无记录。{{ unlocked ? '点右上角「写记录」开始第一篇。' : '等作者更新学习笔记和项目分享。' }}
        </div>

        <div class="blog-page__cards">
          <article
            v-for="item in filteredPosts"
            :key="item.id"
            class="blog-card"
            @click="goRead(item.id)"
          >
            <div class="blog-card__head">
              <span class="blog-card__kind" :class="item.kind">
                {{ item.kind === 'project' ? '项目分享' : '学习笔记' }}
              </span>
              <span class="blog-card__time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <h2 class="blog-card__title">{{ item.title }}</h2>
            <p class="blog-card__summary">{{ item.summary || excerpt(item.content, 110) }}</p>
            <div class="blog-card__foot">
              <div class="blog-card__tags">
                <span v-for="tag in item.tags" :key="tag" class="blog-card__tag">{{ tag }}</span>
              </div>
              <div class="blog-card__ops" @click.stop>
                <a
                  v-if="item.projectUrl"
                  class="blog-card__link"
                  :href="item.projectUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <v-icon icon="mdi-github" size="16"></v-icon>
                  项目
                </a>
                <button
                  v-if="unlocked"
                  type="button"
                  class="blog-card__del"
                  title="删除"
                  @click="removePost(item.id)"
                >
                  <v-icon icon="mdi-delete-outline" size="16"></v-icon>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- 阅读页 -->
      <article v-else-if="mode === 'read' && post" class="blog-page__article">
        <div class="blog-page__article-meta">
          <span class="blog-card__kind" :class="post.kind">
            {{ post.kind === 'project' ? '项目分享' : '学习笔记' }}
          </span>
          <span>{{ formatTime(post.createdAt) }}</span>
        </div>
        <h1 class="blog-page__article-title">{{ post.title }}</h1>
        <div v-if="post.tags.length" class="blog-page__article-tags">
          <span v-for="tag in post.tags" :key="tag" class="blog-card__tag">{{ tag }}</span>
        </div>
        <a
          v-if="post.projectUrl"
          class="blog-page__project"
          :href="post.projectUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon icon="mdi-source-repository" size="18"></v-icon>
          打开项目 / 仓库
          <span>{{ post.projectUrl }}</span>
        </a>
        <div class="blog-page__body">{{ post.content }}</div>
      </article>

      <!-- 写作 / 编辑 -->
      <section v-else-if="mode === 'write' || mode === 'edit'" class="blog-page__editor">
        <h2 class="blog-page__editor-title">{{ mode === 'edit' ? '编辑记录' : '写一篇学习记录' }}</h2>
        <p class="blog-page__editor-desc">
          可以写学习笔记，也可以附上 GitHub / 演示链接做项目分享（类似 CSDN 博文 + 开源项目介绍）。
        </p>

        <div v-if="!unlocked" class="blog-page__login blog-page__login--block">
          <p>写文章需要管理密码</p>
          <input
            v-model="password"
            class="blog-page__input"
            type="password"
            maxlength="64"
            placeholder="输入密码"
            @keydown.enter="login"
          />
          <button type="button" class="blog-page__primary" :disabled="!password" @click="login">解锁</button>
          <span v-if="loginError" class="blog-page__error">{{ loginError }}</span>
        </div>

        <template v-else>
          <div class="blog-page__kind-switch">
            <button
              type="button"
              class="blog-page__chip"
              :class="{ active: draft.kind === 'note' }"
              @click="draft.kind = 'note'"
            >学习笔记</button>
            <button
              type="button"
              class="blog-page__chip"
              :class="{ active: draft.kind === 'project' }"
              @click="draft.kind = 'project'"
            >项目分享</button>
          </div>

          <label class="blog-page__label">标题</label>
          <input v-model="draft.title" class="blog-page__input" type="text" maxlength="120" placeholder="例如：Vue3 组合式 API 学习笔记" />

          <label class="blog-page__label">摘要（列表里展示）</label>
          <input v-model="draft.summary" class="blog-page__input" type="text" maxlength="200" placeholder="一句话概括这篇记录" />

          <label class="blog-page__label">标签（逗号分隔）</label>
          <input v-model="draft.tagsText" class="blog-page__input" type="text" maxlength="120" placeholder="Vue, 前端, 算法" />

          <label class="blog-page__label">项目链接（可选，GitHub / 演示站）</label>
          <input v-model="draft.projectUrl" class="blog-page__input" type="url" maxlength="300" placeholder="https://github.com/xxx/yyy" />

          <label class="blog-page__label">正文</label>
          <textarea
            v-model="draft.content"
            class="blog-page__textarea"
            maxlength="50000"
            placeholder="写学习过程、踩坑、项目介绍、使用方式……"
          ></textarea>

          <div class="blog-page__editor-foot">
            <span>{{ draft.content.length }} / 50000</span>
            <button type="button" class="blog-page__primary" :disabled="!canSave" @click="saveDraft">
              {{ mode === 'edit' ? '保存修改' : '发布记录' }}
            </button>
          </div>
        </template>
      </section>

      <div v-else class="blog-page__empty">找不到这篇记录</div>
    </div>
  </div>
</template>

<script>
import {
  loadBlogPosts,
  getBlogPost,
  addBlogPost,
  updateBlogPost,
  removeBlogPost,
  formatBlogTime,
  excerpt,
  notifyBlogUpdated,
} from '../utils/blogStore.js';
import {
  getSiteAuth,
  setSiteAuth,
  clearSiteAuth,
  verifySitePassword,
  authTtlFromConfig,
} from '../utils/authStore.js';

function emptyDraft() {
  return {
    kind: 'note',
    title: '',
    summary: '',
    tagsText: '',
    projectUrl: '',
    content: '',
  };
}

export default {
  name: 'BlogPage',
  props: {
    mode: { type: String, default: 'list' }, // list | read | write | edit
    postId: { type: String, default: '' },
    config: { type: Object, default: () => ({}) },
    isAdmin: { type: Boolean, default: false },
  },
  emits: ['back', 'go-list', 'go-read', 'go-write', 'go-edit', 'published'],
  data() {
    return {
      posts: [],
      unlocked: false,
      expiresAt: 0,
      showLogin: false,
      password: '',
      loginError: '',
      filter: 'all',
      keyword: '',
      draft: emptyDraft(),
      tick: Date.now(),
      timer: null,
    };
  },
  computed: {
    adminCfg() {
      return this.config.siteAdmin || this.config.blogAdmin || {};
    },
    pageBg() {
      return this.config.pageBackgrounds?.blog || '/img/wallpaper/static/书房夜晚/image.png';
    },
    scrimStyle() {
      return {
        '--page-bg': `url(${this.pageBg})`,
      };
    },
    floatQuotes() {
      const list = (this.config.blogAdmin || {}).floatQuotes;
      if (Array.isArray(list) && list.length) return list;
      return [
        'Talk is cheap. Show me the code.',
        '先跑通，再优雅。',
        '今天的报错，是明天的经验值。',
        'Commit early, commit often.',
        'Debug 的尽头是理解。',
      ];
    },
    floatItems() {
      return this.floatQuotes.slice(0, 14).map((text, idx) => {
        const top = 6 + ((idx * 7) % 82);
        const duration = 10 + (idx % 4) * 2;
        const delay = -idx * 1.1;
        const size = 1.15 + (idx % 3) * 0.18;
        const opacity = 0.2 + (idx % 4) * 0.05;
        const dir = idx % 2 === 0 ? 'normal' : 'reverse';
        return {
          text,
          style: {
            top: `${top}%`,
            fontSize: `${size}rem`,
            opacity: String(opacity),
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            animationDirection: dir,
          },
        };
      });
    },
    ttlMs() {
      return authTtlFromConfig(this.adminCfg);
    },
    expectedPassword() {
      return this.adminCfg.password || '0313';
    },
    post() {
      if ((this.mode !== 'read' && this.mode !== 'edit') || !this.postId) return null;
      return getBlogPost(this.posts, this.postId);
    },
    filteredPosts() {
      const kw = this.keyword.trim().toLowerCase();
      return this.posts.filter((p) => {
        if (this.filter !== 'all' && p.kind !== this.filter) return false;
        if (!kw) return true;
        const blob = `${p.title} ${p.summary} ${p.content} ${(p.tags || []).join(' ')}`.toLowerCase();
        return blob.includes(kw);
      });
    },
    canSave() {
      return this.draft.title.trim() && this.draft.content.trim();
    },
    remainText() {
      const left = Math.max(0, this.expiresAt - this.tick);
      if (!left) return '已过期';
      const m = Math.floor(left / 60000);
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return h > 0 ? `${h}小时${mm}分后需重新验证` : `${Math.max(1, mm)}分后需重新验证`;
    },
  },
  watch: {
    mode: { immediate: true, handler: 'onRouteChange' },
    postId: 'onRouteChange',
    isAdmin: {
      immediate: true,
      handler(v) {
        if (v) {
          this.refreshAuth();
        } else {
          this.unlocked = false;
          this.expiresAt = 0;
        }
      },
    },
  },
  mounted() {
    this.reload();
    this.refreshAuth();
    this.timer = setInterval(() => {
      this.tick = Date.now();
      this.refreshAuth();
    }, 15000);
    window.addEventListener('leleo-auth-changed', this.refreshAuth);
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer);
    window.removeEventListener('leleo-auth-changed', this.refreshAuth);
  },
  methods: {
    formatTime: formatBlogTime,
    excerpt,
    reload() {
      this.posts = loadBlogPosts((this.config.blogAdmin || {}).seedPosts || []);
    },
    refreshAuth() {
      const auth = getSiteAuth();
      this.unlocked = !!auth.ok;
      this.expiresAt = auth.expiresAt || 0;
      if (!auth.ok) this.showLogin = false;
    },
    onRouteChange() {
      this.reload();
      this.refreshAuth();
      if (this.mode === 'edit' && this.post) {
        this.draft = {
          kind: this.post.kind || 'note',
          title: this.post.title,
          summary: this.post.summary,
          tagsText: (this.post.tags || []).join(', '),
          projectUrl: this.post.projectUrl || '',
          content: this.post.content,
        };
      } else if (this.mode === 'write') {
        this.draft = emptyDraft();
      }
    },
    login() {
      this.loginError = '';
      if (!verifySitePassword(this.password, this.expectedPassword)) {
        this.loginError = '密码不对';
        return;
      }
      const auth = setSiteAuth(this.ttlMs);
      this.unlocked = true;
      this.expiresAt = auth.expiresAt;
      this.password = '';
      this.showLogin = false;
      this.tick = Date.now();
    },
    logout() {
      clearSiteAuth();
      this.unlocked = false;
      this.expiresAt = 0;
      this.showLogin = false;
    },
    goList() { this.$emit('go-list'); },
    goRead(id) { this.$emit('go-read', id); },
    goWrite() {
      this.refreshAuth();
      if (!this.unlocked) {
        this.showLogin = true;
        return;
      }
      this.$emit('go-write');
    },
    goEdit(id) {
      this.refreshAuth();
      if (!this.unlocked) {
        this.showLogin = true;
        return;
      }
      this.$emit('go-edit', id);
    },
    saveDraft() {
      this.refreshAuth();
      if (!this.unlocked) {
        this.loginError = '会话已过期，请重新输入密码';
        this.showLogin = true;
        return;
      }
      if (!this.canSave) return;
      const payload = {
        kind: this.draft.kind,
        title: this.draft.title,
        summary: this.draft.summary,
        tags: this.draft.tagsText,
        projectUrl: this.draft.projectUrl,
        content: this.draft.content,
      };
      if (this.mode === 'edit' && this.postId) {
        this.posts = updateBlogPost(this.posts, this.postId, payload);
        notifyBlogUpdated();
        this.$emit('published', this.postId);
        return;
      }
      this.posts = addBlogPost(this.posts, payload);
      notifyBlogUpdated();
      this.$emit('published', this.posts[0]?.id || '');
    },
    removePost(id) {
      this.refreshAuth();
      if (!this.unlocked) {
        this.showLogin = true;
        return;
      }
      if (!confirm('确定删除这条学习记录？')) return;
      this.posts = removeBlogPost(this.posts, id);
      notifyBlogUpdated();
    },
    removeCurrent() {
      if (!this.post) return;
      this.removePost(this.post.id);
      this.goList();
    },
  },
};
</script>

<style scoped>
.blog-page {
  position: absolute;
  inset: 0;
  z-index: 20;
  overflow: auto;
  color: #f4f6f8;
}
.blog-page__scrim {
  position: fixed;
  inset: 0;
  background:
    linear-gradient(160deg, rgba(8, 12, 20, 0.78), rgba(10, 14, 22, 0.62)),
    var(--page-bg, none) center / cover no-repeat;
  backdrop-filter: blur(6px);
  pointer-events: none;
}
.blog-page__floats {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
.blog-page__float {
  position: absolute;
  left: 0;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.06em;
  font-weight: 650;
  text-shadow: 0 0 22px rgba(255, 255, 255, 0.16);
  animation-name: blog-float-drift;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}
@keyframes blog-float-drift {
  from { transform: translateX(-35vw); }
  to { transform: translateX(110vw); }
}
.blog-page__shell {
  position: relative;
  z-index: 1;
  width: min(980px, calc(100% - 2rem));
  margin: 1rem auto 2.5rem;
}
.blog-page__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}
.blog-page__brand h1 {
  margin: 0;
  font-size: clamp(1.35rem, 2.6vw, 1.85rem);
  font-weight: 760;
}
.blog-page__brand p {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  opacity: 0.72;
}
.blog-page__top-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: flex-end;
}
.blog-page__ghost,
.blog-page__primary,
.blog-page__danger {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}
.blog-page__ghost {
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.blog-page__primary {
  color: #1a1f28;
  background: linear-gradient(135deg, #ffe8a0, #b8f0ff);
}
.blog-page__primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.blog-page__danger {
  background: rgba(255, 90, 90, 0.18);
  color: #ffc9c9;
}
.blog-page__login {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.9rem;
  padding: 0.75rem;
  border-radius: 16px;
  background: rgba(18, 22, 30, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.blog-page__login--block {
  flex-direction: column;
  align-items: stretch;
  max-width: 420px;
}
.blog-page__session,
.blog-page__tip,
.blog-page__error {
  font-size: 0.75rem;
}
.blog-page__session { opacity: 0.7; margin-bottom: 0.8rem; }
.blog-page__tip { opacity: 0.65; }
.blog-page__error { color: #ffb4b4; }
.blog-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.9rem;
  align-items: center;
}
.blog-page__chip {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  cursor: pointer;
}
.blog-page__chip.active {
  background: rgba(184, 240, 255, 0.2);
  border-color: rgba(184, 240, 255, 0.45);
}
.blog-page__search {
  flex: 1 1 180px;
  min-width: 160px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  padding: 0.45rem 0.85rem;
  font: inherit;
  outline: none;
}
.blog-page__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.85rem;
}
.blog-card {
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: rgba(18, 22, 30, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;
}
.blog-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 232, 160, 0.35);
}
.blog-card__head {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}
.blog-card__kind {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}
.blog-card__kind.project {
  background: rgba(184, 240, 255, 0.18);
  color: #c8f4ff;
}
.blog-card__kind.note {
  background: rgba(255, 232, 160, 0.16);
  color: #ffe9b0;
}
.blog-card__time {
  font-size: 0.68rem;
  opacity: 0.55;
}
.blog-card__title {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
  line-height: 1.35;
}
.blog-card__summary {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  opacity: 0.78;
  min-height: 2.6em;
}
.blog-card__foot {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
}
.blog-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-width: 0;
}
.blog-card__tag {
  font-size: 0.66rem;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  opacity: 0.85;
}
.blog-card__ops {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
.blog-card__link {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: #b8f0ff;
  text-decoration: none;
  font-size: 0.72rem;
  font-weight: 700;
}
.blog-card__del {
  border: none;
  background: transparent;
  color: #ffb4b4;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.blog-page__empty {
  padding: 2.2rem 1rem;
  text-align: center;
  opacity: 0.75;
  border-radius: 18px;
  background: rgba(18, 22, 30, 0.55);
  border: 1px dashed rgba(255, 255, 255, 0.16);
}
.blog-page__article,
.blog-page__editor {
  border-radius: 22px;
  padding: 1.25rem 1.35rem 1.6rem;
  background: rgba(18, 22, 30, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.blog-page__article-meta {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  font-size: 0.78rem;
  opacity: 0.75;
  margin-bottom: 0.7rem;
}
.blog-page__article-title {
  margin: 0 0 0.7rem;
  font-size: clamp(1.5rem, 3vw, 2.1rem);
  line-height: 1.25;
}
.blog-page__article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
}
.blog-page__project {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 1.1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  text-decoration: none;
  color: #dff7ff;
  background: rgba(184, 240, 255, 0.1);
  border: 1px solid rgba(184, 240, 255, 0.22);
  font-weight: 700;
}
.blog-page__project span {
  font-size: 0.72rem;
  font-weight: 500;
  opacity: 0.75;
  word-break: break-all;
}
.blog-page__body {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.9;
  font-size: 1.02rem;
}
.blog-page__editor-title {
  margin: 0;
  font-size: 1.35rem;
}
.blog-page__editor-desc {
  margin: 0.4rem 0 1rem;
  opacity: 0.72;
  font-size: 0.85rem;
}
.blog-page__kind-switch {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
}
.blog-page__label {
  display: block;
  margin: 0.35rem 0 0.35rem;
  font-size: 0.78rem;
  opacity: 0.75;
}
.blog-page__input,
.blog-page__textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  padding: 0.7rem 0.85rem;
  font: inherit;
  outline: none;
  caret-color: #ffe8a0;
  margin-bottom: 0.55rem;
}
.blog-page__textarea {
  min-height: min(48vh, 420px);
  resize: vertical;
  line-height: 1.7;
}
.blog-page__editor-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.4rem;
  font-size: 0.75rem;
  opacity: 0.75;
}

@media (max-width: 800px) {
  .blog-page__top {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }
  .blog-page__top-actions { justify-content: flex-start; }
  .blog-page__shell { width: calc(100% - 1rem); }
}
</style>
