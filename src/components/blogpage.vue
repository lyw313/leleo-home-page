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
        <button type="button" class="blog-page__ghost" @click="onTopBack">
          <v-icon icon="mdi-arrow-left" size="18"></v-icon>
          {{ topBackLabel }}
        </button>

        <div class="blog-page__brand">
          <h1>学习博客</h1>
          <p>{{ mode === 'list' ? '用收藏夹分区管理笔记与项目' : '记录学习笔记 · 分享项目与实践' }}</p>
        </div>

        <div class="blog-page__top-actions">
          <template v-if="mode === 'list'">
            <template v-if="unlocked">
              <button type="button" class="blog-page__ghost" @click="promptNewFolder">
                <v-icon icon="mdi-folder-plus-outline" size="18"></v-icon>
                新建收藏夹
              </button>
              <button type="button" class="blog-page__primary" @click="goWrite">
                <v-icon icon="mdi-pencil-plus-outline" size="18"></v-icon>
                写记录
              </button>
            </template>
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

      <div v-if="syncHint" class="blog-page__sync-warn">{{ syncHint }}</div>

      <div v-if="unlocked && mode === 'list'" class="blog-page__session">
        管理中 · {{ remainText }}
      </div>

      <!-- 列表页 -->
      <section v-if="mode === 'list'" class="blog-page__list-view">
        <nav class="blog-page__breadcrumb" aria-label="收藏夹路径">
          <button
            type="button"
            class="blog-page__crumb"
            @click="openFolder(null)"
          >全部收藏</button>
          <template v-for="crumb in breadcrumbItems" :key="crumb.id">
            <span class="blog-page__crumb-sep">›</span>
            <button
              type="button"
              class="blog-page__crumb"
              :class="{ 'is-drop': dropTargetId === crumb.id }"
              @click="openFolder(crumb.id)"
              @dragover.prevent="onDragOverFolder(crumb.id)"
              @dragleave="onDragLeaveFolder(crumb.id)"
              @drop.prevent="onDropToFolder(crumb.id)"
            >{{ crumb.name }}</button>
          </template>
        </nav>

        <div v-if="showNewFolderInput" class="blog-page__newfolder">
          <input
            v-model="newFolderName"
            class="blog-page__input blog-page__input--inline"
            type="text"
            maxlength="40"
            placeholder="收藏夹名称"
            @keydown.enter="confirmNewFolder"
          />
          <button type="button" class="blog-page__primary" :disabled="!newFolderName.trim()" @click="confirmNewFolder">创建</button>
          <button type="button" class="blog-page__ghost" @click="cancelNewFolder">取消</button>
          <span v-if="folderHint" class="blog-page__error">{{ folderHint }}</span>
        </div>

        <div class="blog-page__filters">
          <label class="blog-page__filter-label">
            <span>类型查找</span>
            <select v-model="filter" class="blog-page__select blog-page__select--filter">
              <option value="all">全部</option>
              <option value="note">学习笔记</option>
              <option value="project">项目分享</option>
            </select>
          </label>
          <input
            v-model="keyword"
            class="blog-page__search"
            type="search"
            placeholder="搜索标题 / 标签 / 内容"
          />
          <span v-if="unlocked && draggingPostId" class="blog-page__drag-tip">拖到收藏夹卡片即可移动</span>
        </div>

        <div v-if="childFolders.length" class="blog-page__folder-grid">
          <article
            v-for="folder in childFolders"
            :key="folder.id"
            class="blog-folder-card"
            :class="{ 'is-drop': dropTargetId === folder.id }"
            @click="openFolder(folder.id)"
            @dragover.prevent="onDragOverFolder(folder.id)"
            @dragleave="onDragLeaveFolder(folder.id)"
            @drop.prevent="onDropToFolder(folder.id)"
          >
            <div class="blog-folder-card__icon">
              <v-icon icon="mdi-folder-outline" size="40"></v-icon>
            </div>
            <div class="blog-folder-card__body">
              <h3 class="blog-folder-card__name">{{ folder.name }}</h3>
              <p class="blog-folder-card__meta">
                {{ folderSubCount(folder.id) }} 个子收藏 · {{ folderPostCount(folder.id) }} 篇记录
              </p>
            </div>
            <div v-if="unlocked" class="blog-folder-card__ops" @click.stop>
              <button type="button" title="重命名" @click="promptRenameFolder(folder)">
                <v-icon icon="mdi-pencil-outline" size="18"></v-icon>
              </button>
              <button type="button" title="删除" @click="deleteFolder(folder.id)">
                <v-icon icon="mdi-delete-outline" size="18"></v-icon>
              </button>
            </div>
          </article>
        </div>

        <div v-if="!childFolders.length && !filteredPosts.length" class="blog-page__empty">
          {{ unlocked
            ? (currentFolderId
              ? '这个收藏夹还没有记录，点右上角「写记录」添加。'
              : '先新建收藏夹，再写记录；每条记录都必须放在某个收藏夹里。')
            : '等作者更新学习笔记和项目分享。' }}
        </div>

        <div class="blog-page__cards">
          <article
            v-for="item in filteredPosts"
            :key="item.id"
            class="blog-card"
            :class="{ 'is-dragging': draggingPostId === item.id }"
            :draggable="unlocked"
            @click="onCardClick(item.id)"
            @dragstart="onDragStart($event, item)"
            @dragend="onDragEnd"
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
        <div
          class="blog-page__body blog-body-content"
          v-html="renderedContent"
          @click="onBodyClick"
        ></div>
      </article>

      <!-- 写作 / 编辑 -->
      <section v-else-if="mode === 'write' || mode === 'edit'" class="blog-page__editor">
        <h2 class="blog-page__editor-title">{{ mode === 'edit' ? '编辑记录' : '写一篇学习记录' }}</h2>
        <p class="blog-page__editor-desc">
          先把光标放到想插入的位置，再点「上传文档」——会作为可点击附件插入该处；也支持粘贴表格，以及大/小序号。
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

          <label class="blog-page__label">所属收藏夹（必选）</label>
          <select v-model="draft.folderId" class="blog-page__select" required>
            <option disabled :value="null">请选择收藏夹</option>
            <option v-for="opt in folderOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
          </select>
          <p v-if="!folderOptions.length" class="blog-page__error">请先新建至少一个收藏夹</p>

          <label class="blog-page__label">正文</label>
          <blog-editor
            ref="editor"
            v-model="draft.content"
          />

          <div class="blog-page__editor-foot">
            <span>富文本正文 · 自动清洗粘贴内容</span>
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
  loadBlogFolders,
  getBlogPost,
  addBlogPost,
  updateBlogPost,
  removeBlogPost,
  addBlogFolder,
  removeBlogFolder,
  listChildFolders,
  listPostsInFolder,
  getFolderPath,
  renameBlogFolder,
  formatBlogTime,
  excerpt,
  notifyBlogUpdated,
  ensurePostsHaveFolders,
  resolveValidFolderId,
  hydrateBlogFromServer,
} from '../utils/blogStore.js';
import {
  getSiteAuth,
  loginSite,
  logoutSite,
  authTtlFromConfig,
} from '../utils/authStore.js';
import { syncLocalToServer } from '../utils/serverSync.js';
import { renderBlogHtml, stripHtml, openBlogAttachment } from '../utils/blogHtml.js';
import { assetUrl } from '../utils/assetUrl.js';
import BlogEditor from './blogeditor.vue';

function emptyDraft() {
  return {
    kind: 'note',
    title: '',
    summary: '',
    tagsText: '',
    projectUrl: '',
    content: '',
    folderId: null,
  };
}

export default {
  name: 'BlogPage',
  components: { BlogEditor },
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
      folders: [],
      currentFolderId: null,
      newFolderName: '',
      folderHint: '',
      showNewFolderInput: false,
      unlocked: false,
      expiresAt: 0,
      showLogin: false,
      password: '',
      loginError: '',
      filter: 'all',
      keyword: '',
      syncHint: '',
      draft: emptyDraft(),
      tick: Date.now(),
      timer: null,
      draggingPostId: '',
      dropTargetId: '',
      suppressClick: false,
    };
  },
  computed: {
    adminCfg() {
      return this.config.siteAdmin || this.config.blogAdmin || {};
    },
    pageBg() {
      const raw = this.config.pageBackgrounds?.blog || '/img/wallpaper/static/书房夜晚/image.png';
      return assetUrl(raw);
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
    breadcrumbItems() {
      return getFolderPath(this.folders, this.currentFolderId);
    },
    childFolders() {
      return listChildFolders(this.folders, this.currentFolderId);
    },
    folderOptions() {
      return (this.folders || [])
        .map((f) => {
          const path = getFolderPath(this.folders, f.id).map((x) => x.name).join(' / ');
          return { id: f.id, label: path || f.name };
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
    },
    filteredPosts() {
      // 根目录不直接堆放记录：记录必须在某个收藏夹内
      if (!this.currentFolderId) return [];
      const kw = this.keyword.trim().toLowerCase();
      const inFolder = listPostsInFolder(this.posts, this.currentFolderId);
      return inFolder.filter((p) => {
        if (this.filter !== 'all' && p.kind !== this.filter) return false;
        if (!kw) return true;
        const blob = `${p.title} ${p.summary} ${p.content} ${(p.tags || []).join(' ')}`.toLowerCase();
        return blob.includes(kw);
      });
    },
    canSave() {
      return !!(
        this.draft.title.trim()
        && stripHtml(this.draft.content).trim()
        && this.draft.folderId
      );
    },
    renderedContent() {
      return this.post ? renderBlogHtml(this.post.content) : '';
    },
    remainText() {
      const left = Math.max(0, this.expiresAt - this.tick);
      if (!left) return '已过期';
      const m = Math.floor(left / 60000);
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return h > 0 ? `${h}小时${mm}分后需重新验证` : `${Math.max(1, mm)}分后需重新验证`;
    },
    topBackLabel() {
      if (this.mode !== 'list') return '返回博客';
      if (this.currentFolderId) return '返回上级';
      return '返回主页';
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
    this.reloadFromCache();
    this.hydrateFromServer();
    this.refreshAuth();
    this.timer = setInterval(() => {
      this.tick = Date.now();
      this.refreshAuth();
    }, 15000);
    window.addEventListener('leleo-auth-changed', this.refreshAuth);
    window.addEventListener('leleo-blog-updated', this.reloadFromCache);
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer);
    window.removeEventListener('leleo-auth-changed', this.refreshAuth);
    window.removeEventListener('leleo-blog-updated', this.reloadFromCache);
  },
  methods: {
    formatTime: formatBlogTime,
    excerpt,
    reloadFromCache() {
      const posts = loadBlogPosts((this.config.blogAdmin || {}).seedPosts || []);
      const folders = loadBlogFolders();
      const ensured = ensurePostsHaveFolders(posts, folders);
      this.posts = ensured.posts;
      this.folders = ensured.folders;
    },
    async hydrateFromServer() {
      try {
        const state = await hydrateBlogFromServer((this.config.blogAdmin || {}).seedPosts || []);
        if (!state) return;
        this.posts = state.posts || [];
        this.folders = state.folders || [];
      } catch (e) {
        console.warn('[blog] hydrate failed', e);
      }
    },
    reload() {
      this.reloadFromCache();
      this.hydrateFromServer();
    },
    openFolder(id) {
      this.currentFolderId = id || null;
    },
    folderSubCount(folderId) {
      return listChildFolders(this.folders, folderId).length;
    },
    folderPostCount(folderId) {
      return listPostsInFolder(this.posts, folderId).length;
    },
    promptNewFolder() {
      this.refreshAuth();
      if (!this.unlocked) {
        this.showLogin = true;
        return;
      }
      this.folderHint = '';
      this.newFolderName = '';
      this.showNewFolderInput = true;
    },
    async confirmNewFolder() {
      const name = this.newFolderName.trim();
      if (!name) return;
      this.folders = await addBlogFolder(this.folders, { name, parentId: this.currentFolderId });
      this.showNewFolderInput = false;
      this.newFolderName = '';
      this.folderHint = '';
    },
    cancelNewFolder() {
      this.showNewFolderInput = false;
      this.newFolderName = '';
      this.folderHint = '';
    },
    async promptRenameFolder(folder) {
      const name = prompt('重命名收藏夹', folder.name);
      if (name == null) return;
      const trimmed = name.trim();
      if (!trimmed || trimmed === folder.name) return;
      this.folders = await renameBlogFolder(this.folders, folder.id, trimmed);
    },
    async deleteFolder(id) {
      if (!confirm('删除该收藏夹？子收藏夹会一并删除，其中的记录会移到上级或其他收藏夹。')) return;
      const folder = this.folders.find((f) => f.id === id);
      const parentId = folder?.parentId || null;
      const result = await removeBlogFolder(this.folders, this.posts, id);
      this.folders = result.folders;
      this.posts = result.posts;
      if (this.currentFolderId === id || (this.currentFolderId && !this.folders.some((f) => f.id === this.currentFolderId))) {
        this.currentFolderId = parentId;
      }
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
          folderId: resolveValidFolderId(this.folders, this.post.folderId, this.currentFolderId),
        };
      } else if (this.mode === 'write') {
        this.draft = {
          ...emptyDraft(),
          folderId: resolveValidFolderId(this.folders, this.currentFolderId, this.folders[0]?.id),
        };
      }
    },
    async login() {
      this.loginError = '';
      this.syncHint = '';
      const result = await loginSite(this.password, this.expectedPassword, this.ttlMs);
      if (!result.ok) {
        this.loginError = result.error || '密码不对';
        return;
      }
      this.unlocked = true;
      this.expiresAt = result.expiresAt;
      this.password = '';
      this.showLogin = false;
      this.tick = Date.now();
      if (result.source === 'server') {
        try {
          await syncLocalToServer();
        } catch (_) {}
      } else {
        this.syncHint = '当前为本地登录（未连上后端会话）。本机可编辑，但手机/其他浏览器看不到新文章。请确认后端已启动并用左下角重新登录。';
      }
    },
    async logout() {
      await logoutSite();
      this.unlocked = false;
      this.expiresAt = 0;
      this.showLogin = false;
    },
    goList() { this.$emit('go-list'); },
    onTopBack() {
      if (this.mode !== 'list') {
        this.goList();
        return;
      }
      // 在子收藏夹里：先回到上级，不要直接回主页
      if (this.currentFolderId) {
        const folder = this.folders.find((f) => f.id === this.currentFolderId);
        this.currentFolderId = folder?.parentId || null;
        return;
      }
      this.$emit('back');
    },
    onDragStart(e, item) {
      if (!this.unlocked) {
        e.preventDefault();
        return;
      }
      this.draggingPostId = item.id;
      try {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
      } catch (_) {}
    },
    onDragEnd() {
      this.draggingPostId = '';
      this.dropTargetId = '';
      this.suppressClick = true;
      setTimeout(() => { this.suppressClick = false; }, 80);
    },
    onCardClick(id) {
      if (this.suppressClick) return;
      this.goRead(id);
    },
    onDragOverFolder(folderId) {
      if (!this.draggingPostId || !folderId) return;
      this.dropTargetId = folderId;
    },
    onDragLeaveFolder(folderId) {
      if (this.dropTargetId === folderId) this.dropTargetId = '';
    },
    async onDropToFolder(folderId) {
      const postId = this.draggingPostId;
      this.dropTargetId = '';
      this.draggingPostId = '';
      if (!postId || !this.unlocked || !folderId) return;
      const post = getBlogPost(this.posts, postId);
      if (!post) return;
      if ((post.folderId || null) === folderId) return;
      const { posts, synced } = await updateBlogPost(this.posts, postId, {
        kind: post.kind,
        title: post.title,
        summary: post.summary,
        tags: post.tags,
        projectUrl: post.projectUrl,
        content: post.content,
        folderId,
      });
      this.posts = posts;
      if (!synced) {
        this.syncHint = '已改本机，但未能同步到服务器。请先在左下角完成管理员登录。';
      }
    },
    goRead(id) { this.$emit('go-read', id); },
    goWrite() {
      this.refreshAuth();
      if (!this.unlocked) {
        this.showLogin = true;
        return;
      }
      if (!this.folders.length) {
        alert('请先新建一个收藏夹，再写记录。');
        this.promptNewFolder();
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
    async saveDraft() {
      this.refreshAuth();
      if (!this.unlocked) {
        this.loginError = '会话已过期，请重新输入密码';
        this.showLogin = true;
        return;
      }
      if (!this.draft.folderId) {
        alert('请选择所属收藏夹');
        return;
      }
      // 保存前从编辑器强制 flush，避免 v-model 落后于 DOM
      const flushed = this.$refs.editor?.flush?.();
      if (typeof flushed === 'string') this.draft.content = flushed;
      if (!this.canSave) return;
      const payload = {
        kind: this.draft.kind,
        title: this.draft.title,
        summary: this.draft.summary || excerpt(this.draft.content, 120),
        tags: this.draft.tagsText,
        projectUrl: this.draft.projectUrl,
        content: this.draft.content,
        folderId: this.draft.folderId,
      };
      let result;
      if (this.mode === 'edit' && this.postId) {
        result = await updateBlogPost(this.posts, this.postId, payload);
        this.posts = result.posts;
        notifyBlogUpdated();
        if (!result.synced) {
          this.syncHint = '已保存在本机，但未同步到服务器。手机/其他浏览器看不到。请先用左下角管理员登录后再保存。';
          return;
        }
        this.syncHint = '';
        this.$emit('published', this.postId);
        return;
      }
      result = await addBlogPost(this.posts, payload);
      this.posts = result.posts;
      notifyBlogUpdated();
      if (!result.synced) {
        this.syncHint = '已保存在本机，但未同步到服务器。手机/其他浏览器看不到。请先用左下角管理员登录后再保存。';
        return;
      }
      this.syncHint = '';
      this.$emit('published', this.posts[0]?.id || '');
    },
    onBodyClick(e) {
      const fileLink = e.target?.closest?.('a.blog-file');
      if (!fileLink) return;
      e.preventDefault();
      openBlogAttachment({
        href: fileLink.getAttribute('href'),
        name: fileLink.getAttribute('data-file-name') || 'document',
        mime: fileLink.getAttribute('data-file-mime') || '',
      });
    },
    async removePost(id) {
      this.refreshAuth();
      if (!this.unlocked) {
        this.showLogin = true;
        return;
      }
      if (!confirm('确定删除这条学习记录？')) return;
      const { posts, synced } = await removeBlogPost(this.posts, id);
      this.posts = posts;
      notifyBlogUpdated();
      if (!synced) {
        this.syncHint = '本机已删除，但服务器未同步。请先登录管理员后再删一次。';
      } else {
        this.syncHint = '';
      }
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
.blog-page__sync-warn {
  margin: 0.55rem 0 0.35rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: rgba(180, 60, 40, 0.28);
  border: 1px solid rgba(255, 160, 120, 0.35);
  color: #ffd0c0;
  font-size: 0.82rem;
  line-height: 1.45;
}
.blog-page__breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.35rem;
  margin-bottom: 0.75rem;
  font-size: 0.82rem;
}
.blog-page__crumb {
  border: none;
  background: transparent;
  color: #b8f0ff;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0.15rem 0.25rem;
}
.blog-page__crumb:hover { text-decoration: underline; }
.blog-page__crumb.is-drop {
  background: rgba(184, 240, 255, 0.22);
  outline: 1px dashed rgba(184, 240, 255, 0.7);
  border-radius: 8px;
}
.blog-page__crumb-sep {
  opacity: 0.45;
  user-select: none;
}
.blog-page__newfolder {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 14px;
  background: rgba(18, 22, 30, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.blog-page__input--inline {
  flex: 1 1 160px;
  margin-bottom: 0;
}
.blog-page__folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.85rem;
  margin-bottom: 1rem;
}
.blog-folder-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-height: 5.5rem;
  padding: 1.1rem 1.15rem;
  border-radius: 18px;
  background: rgba(18, 22, 30, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.14);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}
.blog-folder-card:hover {
  transform: translateY(-3px);
  border-color: rgba(184, 240, 255, 0.4);
  background: rgba(24, 30, 40, 0.9);
}
.blog-folder-card.is-drop {
  border-color: rgba(184, 240, 255, 0.8);
  background: rgba(184, 240, 255, 0.18);
  box-shadow: 0 0 0 2px rgba(184, 240, 255, 0.3);
}
.blog-folder-card__icon {
  color: #ffe8a0;
  opacity: 0.95;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(255, 232, 160, 0.1);
}
.blog-folder-card__body {
  flex: 1;
  min-width: 0;
}
.blog-folder-card__name {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 720;
  line-height: 1.3;
}
.blog-folder-card__meta {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  opacity: 0.62;
}
.blog-folder-card__ops {
  display: flex;
  gap: 0.2rem;
  flex-shrink: 0;
}
.blog-folder-card__ops button {
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.65;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.blog-folder-card__ops button:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}
.blog-page__select {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  padding: 0.7rem 0.85rem;
  font: inherit;
  outline: none;
  margin-bottom: 0.55rem;
  color-scheme: dark;
}
.blog-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.9rem;
  align-items: center;
}
.blog-page__filter-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  opacity: 0.85;
}
.blog-page__filter-label span {
  white-space: nowrap;
}
.blog-page__select--filter {
  width: auto;
  min-width: 7.5rem;
  margin-bottom: 0;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
}
.blog-page__drag-tip {
  font-size: 0.72rem;
  color: #b8f0ff;
  font-weight: 650;
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
  transition: transform 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
}
.blog-card.is-dragging {
  opacity: 0.45;
}
.blog-card[draggable='true'] {
  cursor: grab;
}
.blog-card[draggable='true']:active {
  cursor: grabbing;
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
.blog-page__input {
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

<style>
/* 正文 / 编辑器共享：表格、大序号、小序号 */
.blog-body-content {
  counter-reset: blog-h2;
}
.blog-body-content h1,
.blog-body-content h2,
.blog-body-content h3,
.blog-body-content h4 {
  line-height: 1.35;
  margin: 1.25em 0 0.55em;
  font-weight: 750;
}
.blog-body-content h2 {
  counter-increment: blog-h2;
  counter-reset: blog-h3;
  font-size: 1.28em;
}
.blog-body-content h2::before {
  content: counter(blog-h2) ". ";
  color: #ffe8a0;
  font-variant-numeric: tabular-nums;
}
.blog-body-content h3 {
  counter-increment: blog-h3;
  font-size: 1.1em;
  opacity: 0.95;
}
.blog-body-content h3::before {
  content: counter(blog-h2) "." counter(blog-h3) " ";
  color: #b8f0ff;
  font-variant-numeric: tabular-nums;
}
.blog-body-content p {
  margin: 0.55em 0;
}
.blog-body-content ul,
.blog-body-content ol {
  margin: 0.55em 0;
  padding-left: 1.4em;
}
.blog-body-content li {
  margin: 0.25em 0;
}
.blog-body-content ol {
  list-style: decimal;
}
.blog-body-content ol ol {
  list-style: lower-alpha;
}
.blog-body-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  padding: 0.1em 0.35em;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
}
.blog-body-content pre {
  overflow: auto;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.blog-body-content a {
  color: #b8f0ff;
}
.blog-body-content a.blog-file {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.7rem;
  margin: 0.75rem 0;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  text-decoration: none;
  color: #eef3f8;
  background: rgba(184, 240, 255, 0.1);
  border: 1px solid rgba(184, 240, 255, 0.28);
  cursor: pointer;
  max-width: 100%;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.blog-body-content a.blog-file:hover {
  background: rgba(184, 240, 255, 0.18);
  border-color: rgba(255, 232, 160, 0.45);
}
.blog-body-content .blog-file__badge {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  color: #1a1f28;
  background: linear-gradient(135deg, #ffe8a0, #b8f0ff);
}
.blog-body-content .blog-file__name {
  font-weight: 750;
  font-size: 0.92rem;
  word-break: break-all;
}
.blog-body-content .blog-file__meta {
  width: 100%;
  font-size: 0.72rem;
  font-weight: 500;
  opacity: 0.72;
}
.blog-body-content .blog-plain {
  white-space: pre-wrap;
  word-break: break-word;
}
.blog-body-content .blog-table-wrap {
  margin: 1rem 0;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(246, 247, 249, 0.98);
  border: 1px solid rgba(210, 214, 220, 0.95);
  color: #1f2430;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.blog-body-content .blog-table-wrap__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #3a4150;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  user-select: none;
}
.blog-body-content .blog-table-wrap__del {
  font-size: 0.72rem;
  font-weight: 700;
  color: #b42318;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(180, 35, 24, 0.08);
  cursor: pointer;
}
.blog-body-content .blog-table-wrap__del:hover {
  background: rgba(180, 35, 24, 0.16);
}
/* 阅读页不显示删除 */
.blog-page__body .blog-table-wrap__del {
  display: none;
}
.blog-body-content .blog-table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
  background: #fff;
}
.blog-body-content .blog-table-wrap th,
.blog-body-content .blog-table-wrap td {
  border: 1px solid #e5e7eb;
  padding: 0.7rem 0.85rem;
  text-align: left;
  vertical-align: top;
  line-height: 1.55;
  /* 白底单元格：用深色光标，否则继承编辑区浅色 caret 几乎看不见 */
  caret-color: #111827;
  min-width: 3.5rem;
  min-height: 2.4em;
}
.blog-editor__surface .blog-table-wrap th.is-editing,
.blog-editor__surface .blog-table-wrap td.is-editing {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
  background: #eff6ff !important;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.25);
}
.blog-body-content .blog-table-wrap thead th,
.blog-body-content .blog-table-wrap tr:first-child th {
  background: #f3f4f6;
  font-weight: 700;
  color: #2b3140;
}
.blog-body-content .blog-table-wrap tbody td:first-child,
.blog-body-content .blog-table-wrap tr td:first-child {
  background: #f8f9fb;
  font-weight: 600;
  width: 28%;
  min-width: 5.5rem;
}
.blog-body-content table:not(.blog-table-wrap table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  background: rgba(255, 255, 255, 0.96);
  color: #1f2430;
  border-radius: 12px;
  overflow: hidden;
}
.blog-body-content table:not(.blog-table-wrap table) th,
.blog-body-content table:not(.blog-table-wrap table) td {
  border: 1px solid #e5e7eb;
  padding: 0.65rem 0.8rem;
}
</style>
