<template>
  <div class="m-site">
    <!-- 顶部栏 -->
    <header class="m-topbar">
      <button type="button" class="m-back" @click="$emit('back')">
        <v-icon icon="mdi-arrow-left" size="20"></v-icon>
      </button>
      <span class="m-topbar__title">{{ page === 'blog' ? '学习博客' : '学习计划' }}</span>
    </header>

    <!-- ===== 计划页（从首页「学习计划本」进入） ===== -->
    <div v-if="page === 'planner'" class="m-body">
      <div class="m-week-card">
        <div class="m-week-head">
          <div>
            <b>第 {{ weekIndex + 1 }} 周</b>
            <small>{{ weekRangeLabel }}</small>
          </div>
          <div class="m-week-nav">
            <v-btn icon size="28" variant="text" @click="shiftWeek(-1)"><v-icon icon="mdi-chevron-left" size="22"></v-icon></v-btn>
            <v-btn icon size="28" variant="text" @click="goThisWeek()"><v-icon icon="mdi-calendar-today" size="18"></v-icon></v-btn>
            <v-btn icon size="28" variant="text" @click="shiftWeek(1)"><v-icon icon="mdi-chevron-right" size="22"></v-icon></v-btn>
          </div>
        </div>

        <div class="m-grid">
          <div class="m-grid__corner">节次</div>
          <div
            v-for="(d, i) in weekDays"
            :key="d.key"
            class="m-grid__dayhead"
            :class="{ today: d.key === todayKey, sel: d.key === selKey }"
            @click="selKey = d.key"
          >{{ WEEK[i] }}<small>{{ shortDate(d.key) }}</small></div>

          <template v-for="(slot, r) in SLOTS" :key="r">
            <div class="m-grid__slot">{{ slot.label }}<small>{{ slot.time }}</small></div>
            <div
              v-for="d in weekDays"
              :key="`${d.key}-${r}`"
              class="m-grid__cell"
              :class="{ sel: d.key === selKey }"
              @click="pickCell(d.key)"
            >
              <span
                v-for="t in cellTopics(d.key, r)"
                :key="t.id"
                class="m-chip"
                :style="{ background: t.color }"
              >{{ t.name }}</span>
              <i v-if="r === LUNCH_ROW" class="m-lunch">午休</i>
            </div>
          </template>
        </div>
      </div>

      <!-- 当日编辑面板 -->
      <div class="m-daycard">
        <div class="m-daycard__head">
          <b>{{ selLabel }}</b>
          <span class="m-pill" :class="{ none: !hasContentSel }">{{ hasContentSel ? '已安排' : '无安排' }}</span>
        </div>

        <p class="m-daycard__hint">点知识点加入/移出当天</p>
        <div class="m-topicwrap">
          <button
            v-for="t in state.topics"
            :key="t.id"
            type="button"
            class="m-topic"
            :class="{ on: draft.topicIds.includes(t.id) }"
            :style="topicStyle(t)"
            @click="toggleTopic(t.id)"
          >{{ t.name }}</button>
          <span v-if="!state.topics.length" class="m-emptytip">还没有知识点，先在下面添加。</span>
        </div>

        <label class="m-field"><span>今日计划</span>
          <textarea v-model="draft.plan" rows="3" maxlength="5000" placeholder="今天要学什么…" @input="scheduleSave"></textarea>
        </label>

        <!-- 快速添加知识点 -->
        <form class="m-addform" @submit.prevent="addTopicQuick">
          <input v-model="newTopicName" maxlength="24" placeholder="新知识点名称" />
          <input v-model="newTopicEnd" type="date" title="学到哪天（含今天起）" />
          <button type="submit" :disabled="!newTopicName.trim()">添加</button>
        </form>
      </div>
    </div>

    <!-- ===== 博客页（从首页「学习博客」进入，只读） ===== -->
    <div v-if="page === 'blog'" class="m-body">
      <p v-if="hydrating && !folderList.length" class="m-emptytip big">正在从服务器同步…</p>
      <!-- 文章阅读（覆盖展示，看完返回列表） -->
      <article v-if="reading" class="m-article">
        <button type="button" class="m-linkbtn" @click="closeRead()">← 返回列表</button>
        <h1>{{ readPost?.title }}</h1>
        <p class="m-article__meta">{{ formatTime(readPost?.updatedAt) }} · {{ (readPost?.tags || []).join(' / ') || '未分类' }}</p>
        <a v-if="readPost?.projectUrl" :href="readPost.projectUrl" target="_blank" rel="noopener" class="m-linkbtn">项目地址 ↗</a>
        <div class="m-article__content" v-html="renderedContent"></div>
      </article>

      <!-- 列表 -->
      <template v-else>
        <div
          v-for="folder in folderList"
          :key="folder.id"
          class="m-folder"
        >
          <div class="m-folder__name"><v-icon icon="mdi-folder-outline" size="16"></v-icon>{{ folder.name }}</div>
          <button
            v-for="p in postsIn(folder.id)"
            :key="p.id"
            type="button"
            class="m-post"
            @click="read(p.id)"
          >
            <b>{{ p.title }}</b>
            <small>{{ p.summary || excerptOf(p.content) }}</small>
          </button>
          <p v-if="!postsIn(folder.id).length" class="m-emptytip">这个文件夹还没有文章</p>
        </div>
        <p v-if="!folderList.length" class="m-emptytip big">暂无博客内容</p>
      </template>
    </div>
  </div>
</template>

<script>
import {
  loadPlanner,
  hydratePlannerFromServer,
  upsertPlannerEntry,
  getPlannerEntry,
  addPlannerTopic,
  toDateKey,
} from '../utils/plannerStore.js';
import {
  loadBlogPosts,
  loadBlogFolders,
  hydrateBlogFromServer,
  excerpt,
  getBlogPost,
  formatBlogTime,
} from '../utils/blogStore.js';
import { renderBlogHtml } from '../utils/blogHtml.js';

const SLOT_COUNT = 12;
const LUNCH_ROW = 5; // 第 6 节后是午休水印

export default {
  name: 'MobilePage',
  props: {
    // 由首页入口决定显示哪个页面：'planner' | 'blog'
    page: { type: String, default: 'planner' },
  },
  emits: ['back'],
  data() {
    const now = new Date();
    return {
      state: loadPlanner(),
      blog: { posts: [], folders: [] },
      weekAnchor: toDateKey(now),
      selKey: toDateKey(now),
      draft: { topicIds: [], plan: '', diary: '' },
      newTopicName: '',
      newTopicEnd: '',
      saveTimer: null,
      reading: false,
      readId: '',
      hydrating: false,
      WEEK: ['一', '二', '三', '四', '五', '六', '日'],
      SLOTS: Array.from({ length: SLOT_COUNT }, (_, i) => ({
        label: `${i + 1}`,
        time: `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
      })),
      LUNCH_ROW,
    };
  },
  computed: {
    todayKey() { return toDateKey(); },
    weekDays() {
      // 周一为一周开始
      const anchor = new Date(`${this.weekAnchor}T00:00:00`);
      const dow = (anchor.getDay() + 6) % 7;
      const monday = new Date(anchor);
      monday.setDate(anchor.getDate() - dow);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return { key: toDateKey(d), date: d };
      });
    },
    weekIndex() {
      return this.weekDays.findIndex((d) => d.key === this.todayKey);
    },
    weekRangeLabel() {
      const a = this.weekDays[0];
      const b = this.weekDays[6];
      return `${a.date.getMonth() + 1}月${a.date.getDate()}日 - ${b.date.getMonth() + 1}月${b.date.getDate()}日`;
    },
    selLabel() {
      const d = new Date(`${this.selKey}T00:00:00`);
      const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      return `${d.getMonth() + 1}月${d.getDate()}日 · 周${w}`;
    },
    hasContentSel() {
      return !!(this.draft.plan.trim() || this.draft.topicIds.length);
    },
    folderList() {
      return this.blog.folders.filter((f) => !f.parentId)
        .concat(this.blog.folders.filter((f) => f.parentId));
    },
    readPost() {
      return getBlogPost(this.blog.posts, this.readId);
    },
    renderedContent() {
      return this.readPost ? renderBlogHtml(this.readPost.content) : '';
    },
  },
  watch: {
    page: {
      immediate: true,
      handler() {
        this.hydrateAll();
      },
    },
  },
  created() {
    window.addEventListener('leleo-planner-updated', this.reloadPlannerFromCache);
    window.addEventListener('leleo-blog-updated', this.reloadBlogFromCache);
    this.loadDraft();
    this.reloadBlogFromCache();
    this.hydrateAll();
  },
  beforeUnmount() {
    this.flushSave();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    window.removeEventListener('leleo-planner-updated', this.reloadPlannerFromCache);
    window.removeEventListener('leleo-blog-updated', this.reloadBlogFromCache);
  },
  methods: {
    formatTime: formatBlogTime,
    reloadPlannerFromCache() {
      this.state = loadPlanner();
      this.loadDraft();
    },
    reloadBlogFromCache() {
      this.blog = {
        posts: loadBlogPosts(),
        folders: loadBlogFolders(),
      };
    },
    async hydrateAll() {
      if (this.hydrating) return;
      this.hydrating = true;
      try {
        const [planner, blog] = await Promise.all([
          hydratePlannerFromServer(),
          hydrateBlogFromServer(),
        ]);
        if (planner) {
          this.state = planner;
          this.loadDraft();
        }
        if (blog) {
          this.blog = {
            posts: blog.posts || [],
            folders: blog.folders || [],
          };
        }
      } catch (e) {
        console.warn('[mobile] hydrate failed', e);
      } finally {
        this.hydrating = false;
      }
    },
    reloadPlanner() {
      this.reloadPlannerFromCache();
      hydratePlannerFromServer().then((s) => {
        if (s) {
          this.state = s;
          this.loadDraft();
        }
      }).catch(() => {});
    },
    reloadBlog() {
      this.reloadBlogFromCache();
      hydrateBlogFromServer().then((s) => {
        if (s) this.blog = { posts: s.posts || [], folders: s.folders || [] };
      }).catch(() => {});
    },
    loadDraft() {
      const entry = getPlannerEntry(this.state, this.selKey);
      this.draft = { topicIds: [...(entry.topicIds || [])], plan: entry.plan || '', diary: entry.diary || '' };
    },
    flushSave() {
      this.state = upsertPlannerEntry(this.state, this.selKey, {
        topicIds: this.draft.topicIds,
        plan: this.draft.plan,
        diary: this.draft.diary,
      });
    },
    scheduleSave() {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.flushSave(), 450);
    },
    pickCell(key) {
      if (key === this.selKey) return;
      this.flushSave();
      this.selKey = key;
      this.loadDraft();
    },
    toggleTopic(id) {
      const set = new Set(this.draft.topicIds);
      if (set.has(id)) set.delete(id); else set.add(id);
      this.draft.topicIds = [...set];
      this.scheduleSave();
    },
    topicStyle(t) {
      const on = this.draft.topicIds.includes(t.id);
      return { borderColor: t.color, background: on ? t.color : 'transparent', color: on ? '#10151f' : '#eef2f6' };
    },
    addTopicQuick() {
      const name = this.newTopicName.trim();
      if (!name) return;
      const start = this.todayKey;
      const end = /^\d{4}-\d{2}-\d{2}$/.test(this.newTopicEnd) && this.newTopicEnd >= start ? this.newTopicEnd : start;
      this.state = addPlannerTopic(this.state, name, start, end);
      this.newTopicName = '';
      this.newTopicEnd = '';
    },
    cellTopics(dateKey, row) {
      const ids = this.state.days?.[dateKey]?.topicIds || [];
      return ids.map((id) => this.state.topics.find((t) => t.id === id)).filter(Boolean)
        .filter((_, i) => i % SLOT_COUNT === row);
    },
    shortDate(key) {
      const d = new Date(`${key}T00:00:00`);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    },
    shiftWeek(delta) {
      const d = new Date(`${this.weekAnchor}T00:00:00`);
      d.setDate(d.getDate() + delta * 7);
      this.weekAnchor = toDateKey(d);
    },
    goThisWeek() {
      this.weekAnchor = this.todayKey;
      this.selKey = this.todayKey;
      this.flushSave();
      this.loadDraft();
    },
    openBlogTab() {
      this.reading = false;
      this.reloadBlog();
    },
    postsIn(folderId) {
      return this.blog.posts
        .filter((p) => (p.folderId || null) === folderId)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    },
    read(id) {
      this.readId = id;
      this.reading = true;
      try { localStorage.setItem('leleo-mobile-blog-scroll', String(window.scrollY)); } catch (_) {}
    },
    closeRead() {
      this.reading = false;
      this.readId = '';
    },
    excerptOf(content) {
      return excerpt(content, 60);
    },
  },
};
</script>

<style scoped>
.m-site {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(160deg, rgba(10, 14, 22, 0.88), rgba(10, 14, 22, 0.78)),
    var(--page-bg, none) center / cover no-repeat;
  color: #eef2f6;
}
.m-topbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.9rem;
  background: rgba(14, 18, 26, 0.95);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.m-back {
  width: 34px; height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.1);
  color: inherit;
  display: grid; place-items: center;
}
.m-topbar__title { font-weight: 750; font-size: 1rem; }

.m-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.8rem 0.8rem 4.6rem;
}

/* 周课表 */
.m-week-card, .m-daycard, .m-folder, .m-article {
  border-radius: 16px;
  background: rgba(20, 25, 34, 0.9);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 0.85rem;
  margin-bottom: 0.75rem;
}
.m-week-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; }
.m-week-head b { font-size: 0.92rem; }
.m-week-head small { display: block; opacity: 0.55; font-size: 0.68rem; }
.m-week-nav { display: flex; }

.m-grid {
  display: grid;
  grid-template-columns: 44px repeat(7, 1fr);
  font-size: 0.66rem;
  overflow-x: auto;
}
.m-grid__corner, .m-grid__slot { opacity: 0.6; }
.m-grid__corner, .m-grid__dayhead {
  text-align: center;
  padding: 0.3rem 0;
  background: rgba(94, 200, 255, 0.1);
  border-radius: 6px 6px 0 0;
}
.m-grid__dayhead { cursor: pointer; display: flex; flex-direction: column; }
.m-grid__dayhead small { opacity: 0.55; font-size: 0.58rem; }
.m-grid__dayhead.today { background: rgba(154, 230, 180, 0.35); color: #c8f4d8; font-weight: 700; }
.m-grid__dayhead.sel { outline: 1.5px solid #5ec8ff; }
.m-grid__slot { display: flex; flex-direction: column; justify-content: center; text-align: center; padding: 0.15rem 0; }
.m-grid__slot small { opacity: 0.45; font-size: 0.52rem; }
.m-grid__cell {
  min-height: 40px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px;
  margin: 1px;
  padding: 2px;
  display: flex; flex-wrap: wrap; gap: 2px;
  align-content: flex-start;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.m-grid__cell.sel { border-color: rgba(94,200,255,0.6); }
.m-chip {
  font-size: 0.52rem;
  color: #10151f;
  border-radius: 4px;
  padding: 1px 3px;
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.m-lunch {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  font-style: normal;
  font-size: 0.72rem;
  letter-spacing: 0.5em;
  color: rgba(154, 230, 180, 0.28);
  pointer-events: none;
}

/* 当日编辑 */
.m-daycard__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.m-daycard__head b { font-size: 0.95rem; }
.m-pill {
  font-size: 0.64rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: rgba(94, 200, 255, 0.25);
  color: #a8e2ff;
}
.m-pill.none { background: rgba(255,255,255,0.1); opacity: 0.7; }
.m-daycard__hint { margin: 0 0 0.4rem; font-size: 0.7rem; opacity: 0.55; }
.m-topicwrap { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.7rem; }
.m-topic {
  border: 1px solid rgba(255,255,255,0.2);
  background: transparent;
  color: inherit;
  border-radius: 999px;
  font-size: 0.76rem;
  padding: 0.32rem 0.7rem;
}
.m-field { display: block; margin-bottom: 0.6rem; }
.m-field span { display: block; font-size: 0.72rem; opacity: 0.65; margin-bottom: 0.25rem; }
.m-field textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.07);
  color: inherit;
  padding: 0.5rem;
  font-size: 0.82rem;
  resize: vertical;
}
.m-addform { display: grid; grid-template-columns: 1fr auto auto; gap: 0.4rem; }
.m-addform input, .m-addform button {
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.07);
  color: inherit;
  padding: 0.42rem 0.5rem;
  font-size: 0.78rem;
  min-width: 0;
}
.m-addform input[type='date'] { max-width: 120px; color-scheme: dark; }
.m-addform button { background: rgba(94,200,255,0.24); border-color: rgba(94,200,255,0.5); font-weight: 700; }
.m-addform button:disabled { opacity: 0.4; }

/* 博客 */
.m-folder__name {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.82rem; font-weight: 700;
  color: #ffd56a;
  margin-bottom: 0.45rem;
}
.m-post {
  display: block; width: 100%; text-align: left;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 12px;
  color: inherit;
  padding: 0.55rem 0.7rem;
  margin-bottom: 0.4rem;
}
.m-post b { display: block; font-size: 0.86rem; margin-bottom: 0.15rem; }
.m-post small { font-size: 0.7rem; opacity: 0.6; display: block; line-height: 1.4; }
.m-emptytip { font-size: 0.74rem; opacity: 0.45; }
.m-emptytip.big { text-align: center; padding: 2rem 0; }
.m-linkbtn {
  display: inline-block;
  background: none; border: none;
  color: #5ec8ff;
  font-size: 0.8rem;
  padding: 0; margin-bottom: 0.5rem;
  text-decoration: none;
}
.m-article h1 { font-size: 1.2rem; margin: 0.2rem 0; line-height: 1.4; }
.m-article__meta { font-size: 0.7rem; opacity: 0.55; margin: 0.2rem 0 0.6rem; }
.m-article__content { font-size: 0.85rem; line-height: 1.7; word-break: break-word; overflow-wrap: anywhere; }
.m-article__content :deep(img) { max-width: 100%; height: auto; }
.m-article__content :deep(pre) { overflow-x: auto; background: rgba(0,0,0,0.35); padding: 0.6rem; border-radius: 8px; font-size: 0.74rem; }
.m-article__content :deep(code) { background: rgba(0,0,0,0.3); border-radius: 4px; padding: 0.05rem 0.3rem; font-size: 0.78em; }
</style>
