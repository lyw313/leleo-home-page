<template>
  <div class="planner-page">
    <div class="planner-page__scrim" :style="scrimStyle" aria-hidden="true"></div>
    <div class="planner-page__inner">
      <header class="planner-page__header">
        <button type="button" class="planner-page__back" @click="$emit('back')">
          <v-icon icon="mdi-arrow-left" size="18"></v-icon>
          返回主页
        </button>
        <div class="planner-page__hero">
          <p class="planner-page__eyebrow">Learning Planner</p>
          <h1 class="planner-page__title">学习计划本</h1>
          <p class="planner-page__subtitle">把知识点排到日历上：这几天学什么、那几天学什么，一目了然。</p>
        </div>
      </header>

      <div class="planner-page__layout">
        <!-- 今日推进序列（Flight Plan） -->
        <section class="planner-flight">
          <div class="planner-flight__head">
            <div>
              <p class="planner-flight__eyebrow">FLIGHT PLAN</p>
              <h2 class="planner-flight__title">今日推进序列</h2>
            </div>
            <span class="planner-flight__legend">NOW → NEXT → LATER</span>
          </div>

          <div
            v-for="bucket in flightBuckets"
            :key="bucket.key"
            class="planner-flight__bucket"
          >
            <div class="planner-flight__bucket-label">
              <i :class="`dot dot--${bucket.key}`"></i>{{ bucket.label }}
              <span class="planner-flight__bucket-count">{{ flightTasks(bucket.key).length }}</span>
            </div>

            <transition-group name="flight" tag="div" class="planner-flight__cards" :data-bucket="bucket.key">
              <article
                v-for="task in flightTasks(bucket.key)"
                :key="task.id"
                class="flight-card"
                :class="{ 'is-now': bucket.key === 'now', 'is-done': task.done }"
              >
                <div class="flight-card__meta">
                  <span class="flight-card__topic" v-if="topicOf(task.topicId)" :style="{ color: topicOf(task.topicId).color }">{{ topicOf(task.topicId).name }}</span>
                  <span class="flight-card__date">{{ task.date }}</span>
                </div>
                <h3 class="flight-card__title">{{ task.title }}</h3>
                <p v-if="task.note" class="flight-card__note">{{ task.note }}</p>
                <div class="flight-card__actions">
                  <button type="button" class="fbtn fbtn--check" :title="task.done ? '取消完成' : '完成'" @click="toggleTaskDone(task)">
                    <v-icon :icon="task.done ? 'mdi-check-circle' : 'mdi-check'" size="16"></v-icon>
                  </button>
                  <button v-if="bucket.key !== 'now' && !task.done" type="button" class="fbtn" title="设为 Now" @click="promoteTask(task)">
                    <v-icon icon="mdi-arrow-up-bold" size="15"></v-icon>
                  </button>
                  <button v-if="bucket.key === 'now'" type="button" class="fbtn" title="退回 Next" @click="demoteTask(task)">
                    <v-icon icon="mdi-arrow-down-bold" size="15"></v-icon>
                  </button>
                  <span v-if="bucket.key === 'now' && !task.done" class="flight-card__lock">已锁定为 Now</span>
                  <span class="flight-card__spacer"></span>
                  <button type="button" class="fbtn fbtn--del" title="删除" @click="deleteTask(task)">
                    <v-icon icon="mdi-trash-can-outline" size="15"></v-icon>
                  </button>
                </div>
              </article>
            </transition-group>

            <p v-if="!flightTasks(bucket.key).length" class="planner-flight__empty">暂无任务</p>
          </div>

          <form class="planner-flight__form" @submit.prevent="submitTask">
            <input v-model="taskForm.title" maxlength="80" placeholder="新任务：今天的主线是什么？" />
            <select v-model="taskForm.bucket">
              <option value="now">现在</option>
              <option value="next">接下来</option>
              <option value="later">稍后</option>
            </select>
            <select v-model="taskForm.topicId">
              <option value="">无分类</option>
              <option v-for="t in state.topics" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <input v-model="taskForm.date" type="date" />
            <button type="submit" :disabled="!taskForm.title.trim()">添加</button>
          </form>
        </section>

        <section class="planner-cal">
          <div class="planner-cal__toolbar">
            <button type="button" class="planner-cal__nav" title="上一月" @click="shiftMonth(-1)">
              <v-icon icon="mdi-chevron-left" size="22"></v-icon>
            </button>
            <h2 class="planner-cal__month">{{ monthTitle }}</h2>
            <button type="button" class="planner-cal__nav" title="下一月" @click="shiftMonth(1)">
              <v-icon icon="mdi-chevron-right" size="22"></v-icon>
            </button>
            <button type="button" class="planner-cal__today" @click="goToday">今天</button>
          </div>

          <div class="planner-cal__weekdays">
            <span v-for="w in weekLabels" :key="w">{{ w }}</span>
          </div>

          <div class="planner-cal__grid">
            <button
              v-for="day in flatDays"
              :key="day.key"
              type="button"
              class="planner-day"
              :class="{
                'is-out': !day.inMonth,
                'is-today': day.isToday,
                'is-active': day.key === selectedKey,
                'has-content': dayHasContent(day.key),
              }"
              @click="onDayClick(day.key)"
            >
              <span v-if="day.isToday" class="planner-day__badge">今</span>
              <span class="planner-day__num">{{ day.date.getDate() }}</span>
              <span class="planner-day__tags">
                <i
                  v-for="t in dayTopics(day.key).slice(0, 3)"
                  :key="t.id"
                  class="planner-day__tag"
                  :style="{ background: t.color }"
                  :title="t.name"
                ></i>
              </span>
            </button>
          </div>

          <div class="planner-cal__stats">已安排 {{ dayCount }} 天 · 知识点 {{ state.topics.length }} 个</div>
        </section>

        <section class="planner-editor">
          <!-- 添加知识点（主流程） -->
          <div class="planner-add-topic">
            <div class="planner-editor__head">
              <h2>添加知识点</h2>
              <p>填写名称与日期区间，一次性创建并排进日历。</p>
            </div>
            <label class="planner-field planner-field--compact">
              <span>名称</span>
              <input
                v-model="newTopicForm.name"
                maxlength="24"
                placeholder="如：操作系统、Vue3 组合式 API"
                @keydown.enter.prevent="addTopicWithRange"
              />
            </label>
            <div class="planner-add-topic__dates">
              <label class="planner-field planner-field--compact">
                <span>起始日期</span>
                <input v-model="newTopicForm.startDate" type="date" />
              </label>
              <label class="planner-field planner-field--compact">
                <span>结束日期</span>
                <input v-model="newTopicForm.endDate" type="date" />
              </label>
            </div>
            <button
              type="button"
              class="planner-editor__save planner-add-topic__btn"
              :disabled="!canAddTopicWithRange"
              @click="addTopicWithRange"
            >添加并排到这些天</button>
          </div>

          <!-- 知识点列表 -->
          <div class="planner-manage">
            <div class="planner-topics__title">知识点库（{{ state.topics.length }}）</div>
            <p v-if="!state.topics.length" class="planner-empty-tip">还没有知识点，请先用上方表单添加。</p>
            <div v-else class="planner-manage__list">
              <div v-for="t in state.topics" :key="`m-${t.id}`" class="planner-manage__item">
                <i :style="{ background: t.color }"></i>
                <div class="planner-manage__info">
                  <span class="planner-manage__name">{{ t.name }}</span>
                  <span class="planner-manage__range">
                    {{ t.startDate && t.endDate ? `${t.startDate} ~ ${t.endDate}` : '尚未排课' }}
                  </span>
                </div>
                <template v-if="editingTopicId === t.id">
                  <input v-model="editStartDate" type="date" class="planner-manage__date" />
                  <input v-model="editEndDate" type="date" class="planner-manage__date" />
                  <button type="button" class="planner-manage__ok" @click="saveTopicRange(t.id)">确定</button>
                  <button type="button" class="planner-manage__cancel" @click="cancelEditRange">取消</button>
                </template>
                <template v-else>
                  <button type="button" class="planner-manage__edit" @click="startEditRange(t)">改日期</button>
                  <button type="button" class="planner-manage__del" @click="removeTopic(t.id)">删除</button>
                </template>
              </div>
            </div>
          </div>

          <div class="planner-editor__head planner-editor__head--sep">
            <h2>{{ selectedLabel }}</h2>
            <p>勾选今天要学的知识点，也可写详细计划与日记。</p>
          </div>

          <div class="planner-topics">
            <div class="planner-topics__title">今日知识点</div>
            <p v-if="!state.topics.length" class="planner-empty-tip">
              还没有知识点，请先在上方「添加知识点」创建后再勾选。
            </p>
            <div v-else class="planner-topics__list">
              <button
                v-for="t in state.topics"
                :key="t.id"
                type="button"
                class="topic-chip"
                :class="{ active: draft.topicIds.includes(t.id) }"
                :style="chipStyle(t, draft.topicIds.includes(t.id))"
                @click="toggleTopic(t.id)"
              >{{ t.name }}</button>
            </div>
          </div>

          <label class="planner-field">
            <span>详细计划（可选）</span>
            <textarea
              v-model="draft.plan"
              rows="4"
              maxlength="5000"
              placeholder="今天具体要做什么…"
              @input="scheduleSave"
            ></textarea>
          </label>

          <label class="planner-field">
            <span>学习日记（可选）</span>
            <textarea
              v-model="draft.diary"
              rows="5"
              maxlength="20000"
              placeholder="写下收获、踩坑、心情…"
              @input="scheduleSave"
            ></textarea>
          </label>

          <div class="planner-editor__foot">
            <span v-if="saveHint" class="planner-editor__hint">{{ saveHint }}</span>
            <span v-else class="planner-editor__hint muted">修改后自动保存</span>
            <button type="button" class="planner-editor__clear" :disabled="!hasContent" @click="clearDay">清空本日</button>
            <button type="button" class="planner-editor__save" @click="saveNow">保存</button>
          </div>
        </section>
      </div>
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
  updateTopicRange,
  removePlannerTopic,
  addTask,
  updateTask,
  removeTask,
  moveTaskBucket,
  toDateKey,
  formatDateLabel,
  monthMatrix,
  countPlannerDays,
} from '../utils/plannerStore.js';
import { assetUrl } from '../utils/assetUrl.js';

export default {
  name: 'PlannerPage',
  props: {
    background: { type: String, default: () => assetUrl('/img/world/life/sunset.png') },
  },
  emits: ['back'],
  data() {
    const now = new Date();
    const key = toDateKey(now);
    return {
      state: loadPlanner(),
      viewYear: now.getFullYear(),
      viewMonth: now.getMonth(),
      selectedKey: key,
      draft: { topicIds: [], plan: '', diary: '' },
      newTopicForm: { name: '', startDate: '', endDate: '' },
      editingTopicId: '',
      editStartDate: '',
      editEndDate: '',
      saveHint: '',
      saveTimer: null,
      weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
      taskForm: { title: '', bucket: 'now', topicId: '', date: toDateKey() },
    };
  },
  computed: {
    scrimStyle() {
      return { '--page-bg': `url(${this.background})` };
    },
    monthTitle() {
      return `${this.viewYear} 年 ${this.viewMonth + 1} 月`;
    },
    flatDays() {
      return monthMatrix(this.viewYear, this.viewMonth).flat();
    },
    selectedLabel() {
      return formatDateLabel(this.selectedKey);
    },
    dayCount() {
      return countPlannerDays(this.state);
    },
    hasContent() {
      return !!(this.draft.plan.trim() || this.draft.diary.trim() || this.draft.topicIds.length);
    },
    canAddTopicWithRange() {
      const name = this.newTopicForm.name.trim();
      return !!(name && this.newTopicForm.startDate && this.newTopicForm.endDate);
    },
    flightBuckets() {
      return [
        { key: 'now', label: '现在' },
        { key: 'next', label: '接下来' },
        { key: 'later', label: '稍后关注' },
      ];
    },
  },
  created() {
    this.loadDraft(this.selectedKey);
    window.addEventListener('leleo-planner-updated', this.reloadFromCache);
    this.hydrateFromServer();
  },
  beforeUnmount() {
    this.flushSave();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    window.removeEventListener('leleo-planner-updated', this.reloadFromCache);
  },
  methods: {
    reloadFromCache() {
      this.state = loadPlanner();
      this.loadDraft(this.selectedKey);
    },
    async hydrateFromServer() {
      try {
        const state = await hydratePlannerFromServer();
        if (state) {
          this.state = state;
          this.loadDraft(this.selectedKey);
        }
      } catch (_) {}
    },
    reload() {
      this.reloadFromCache();
      this.hydrateFromServer();
    },
    chipStyle(topic, active) {
      return {
        borderColor: topic.color,
        background: active ? topic.color : 'transparent',
        color: active ? '#1a1f28' : '#f4f6f8',
      };
    },
    dayTopics(key) {
      const ids = this.state.days?.[key]?.topicIds || [];
      return ids.map((id) => this.state.topics.find((t) => t.id === id)).filter(Boolean);
    },
    dayHasContent(key) {
      const e = this.state.days?.[key];
      return !!(e && (e.plan || e.diary || (e.topicIds || []).length));
    },
    loadDraft(key) {
      const entry = getPlannerEntry(this.state, key);
      this.draft = {
        topicIds: [...(entry.topicIds || [])],
        plan: entry.plan || '',
        diary: entry.diary || '',
      };
    },
    flushSave() {
      this.state = upsertPlannerEntry(this.state, this.selectedKey, {
        topicIds: this.draft.topicIds,
        plan: this.draft.plan,
        diary: this.draft.diary,
      });
    },
    scheduleSave() {
      this.saveHint = '编辑中…';
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveNow(false), 450);
    },
    saveNow(showTip = true) {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
      this.flushSave();
      this.saveHint = showTip ? '已保存' : '已自动保存';
      setTimeout(() => {
        if (this.saveHint === '已保存' || this.saveHint === '已自动保存') this.saveHint = '';
      }, 1400);
    },
    toggleTopic(id) {
      const set = new Set(this.draft.topicIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      this.draft.topicIds = [...set];
      this.scheduleSave();
    },
    onDayClick(key) {
      if (key === this.selectedKey) return;
      this.flushSave();
      this.selectedKey = key;
      const d = new Date(key.replace(/-/g, '/'));
      if (!Number.isNaN(d.getTime())) {
        this.viewYear = d.getFullYear();
        this.viewMonth = d.getMonth();
      }
      this.loadDraft(key);
      this.saveHint = '';
    },
    addTopicWithRange() {
      if (!this.canAddTopicWithRange) return;
      const { name, startDate, endDate } = this.newTopicForm;
      this.state = addPlannerTopic(this.state, name.trim(), startDate, endDate);
      this.newTopicForm = { name: '', startDate: '', endDate: '' };
      this.saveHint = `已添加「${name.trim()}」并排进 ${startDate} ~ ${endDate}`;
      setTimeout(() => { this.saveHint = ''; }, 2200);
    },
    startEditRange(topic) {
      this.editingTopicId = topic.id;
      this.editStartDate = topic.startDate || this.selectedKey;
      this.editEndDate = topic.endDate || this.selectedKey;
    },
    cancelEditRange() {
      this.editingTopicId = '';
      this.editStartDate = '';
      this.editEndDate = '';
    },
    saveTopicRange(topicId) {
      if (!this.editStartDate || !this.editEndDate) return;
      this.state = updateTopicRange(this.state, topicId, this.editStartDate, this.editEndDate);
      this.cancelEditRange();
      this.saveHint = '日期已更新';
      setTimeout(() => { this.saveHint = ''; }, 1800);
    },
    removeTopic(id) {
      if (!confirm('删除该知识点？已安排的日期也会去掉它。')) return;
      this.state = removePlannerTopic(this.state, id);
      this.draft.topicIds = this.draft.topicIds.filter((x) => x !== id);
      if (this.editingTopicId === id) this.cancelEditRange();
    },
    shiftMonth(delta) {
      this.flushSave();
      const d = new Date(this.viewYear, this.viewMonth + delta, 1);
      this.viewYear = d.getFullYear();
      this.viewMonth = d.getMonth();
    },
    goToday() {
      const key = toDateKey(new Date());
      const now = new Date();
      this.viewYear = now.getFullYear();
      this.viewMonth = now.getMonth();
      this.onDayClick(key);
    },
    clearDay() {
      if (!confirm('确定清空这一天的安排与日记？')) return;
      this.draft = { topicIds: [], plan: '', diary: '' };
      this.saveNow(true);
    },

    /* ---- 今日推进序列 ---- */
    flightTasks(bucket) {
      const today = toDateKey();
      return (this.state.tasks || [])
        .filter((t) => t.bucket === bucket && (bucket === 'later' || t.date === today))
        .sort((a, b) => (a.done - b.done) || ((a.order || 0) - (b.order || 0)));
    },
    topicOf(id) {
      if (!id) return null;
      return this.state.topics.find((t) => t.id === id) || null;
    },
    submitTask() {
      const title = this.taskForm.title.trim();
      if (!title) return;
      this.state = addTask(this.state, { ...this.taskForm, title });
      this.taskForm.title = '';
    },
    toggleTaskDone(task) {
      this.state = updateTask(this.state, task.id, { done: !task.done });
    },
    promoteTask(task) {
      this.state = moveTaskBucket(this.state, task.id, 'now');
    },
    demoteTask(task) {
      this.state = moveTaskBucket(this.state, task.id, 'next');
    },
    deleteTask(task) {
      if (!confirm(`删除任务「${task.title}」？`)) return;
      this.state = removeTask(this.state, task.id);
    },
  },
};
</script>

<style scoped>
.planner-page {
  position: absolute;
  inset: 0;
  z-index: 20;
  overflow: auto;
  color: #f4f6f8;
}
.planner-page__scrim {
  position: fixed;
  inset: 0;
  background:
    linear-gradient(160deg, rgba(8, 12, 20, 0.82), rgba(10, 14, 22, 0.68)),
    var(--page-bg, none) center / cover no-repeat;
  backdrop-filter: blur(6px);
  pointer-events: none;
}
.planner-page__inner {
  position: relative;
  z-index: 1;
  width: min(1100px, calc(100% - 2rem));
  margin: 1rem auto 2.5rem;
}
.planner-page__back {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 0.85rem;
}
.planner-page__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.65;
}
.planner-page__title {
  margin: 0.25rem 0 0.35rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 760;
}
.planner-page__subtitle {
  margin: 0 0 1rem;
  opacity: 0.72;
  font-size: 0.88rem;
}
.planner-page__layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.95fr) minmax(320px, 1.05fr);
  gap: 0.9rem;
  align-items: start;
}
.planner-flight {
  grid-column: 1 / -1;
  border-radius: 22px;
  padding: 1.1rem 1.15rem 1.25rem;
  background: rgba(18, 22, 30, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.planner-flight__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.8rem;
}
.planner-flight__eyebrow {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  color: #5ec8ff;
}
.planner-flight__title {
  margin: 0.15rem 0 0;
  font-size: 1.15rem;
  font-weight: 780;
}
.planner-flight__legend {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  opacity: 0.55;
}
.planner-flight__bucket { margin-bottom: 0.85rem; }
.planner-flight__bucket-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 720;
  opacity: 0.9;
  margin-bottom: 0.45rem;
}
.planner-flight__bucket-count {
  font-size: 0.68rem;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  opacity: 0.8;
}
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot--now { background: #5ec8ff; box-shadow: 0 0 6px #5ec8ff; }
.dot--next { background: transparent; border: 2px solid #5ec8ff; width: 7px; height: 7px; }
.dot--later { background: rgba(255,255,255,0.35); }
.planner-flight__cards { display: grid; gap: 0.5rem; }
.planner-flight__cards[data-bucket='now'] .flight-card { border-color: rgba(94, 200, 255, 0.55); background: linear-gradient(135deg, rgba(94,200,255,0.16), rgba(18,22,30,0.9)); }
.planner-flight__cards[data-bucket='now'] { grid-template-columns: 1fr; }
.flight-card {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.65rem 0.8rem;
}
.flight-card.is-done { opacity: 0.5; }
.flight-card.is-done .flight-card__title { text-decoration: line-through; }
.flight-card__meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; opacity: 0.75; margin-bottom: 0.2rem; }
.flight-card__topic { font-weight: 700; }
.flight-card__title { margin: 0; font-size: 0.92rem; font-weight: 740; }
.flight-card.is-now .flight-card__title { font-size: 1.02rem; }
.flight-card__note { margin: 0.25rem 0 0; font-size: 0.76rem; opacity: 0.72; }
.flight-card__actions { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.45rem; }
.flight-card__spacer { flex: 1; }
.flight-card__lock { font-size: 0.66rem; color: #5ec8ff; letter-spacing: 0.06em; }
.fbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px; height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  cursor: pointer;
}
.fbtn--check:hover { background: rgba(154, 230, 180, 0.3); border-color: #9ae6b4; }
.fbtn--del:hover { background: rgba(252, 129, 129, 0.28); border-color: #fc8181; }
.planner-flight__empty { margin: 0; font-size: 0.74rem; opacity: 0.45; }
.planner-flight__form {
  display: grid;
  grid-template-columns: 2fr auto auto auto auto;
  gap: 0.4rem;
  margin-top: 0.4rem;
  padding-top: 0.75rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.14);
}
.planner-flight__form input,
.planner-flight__form select,
.planner-flight__form button {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.07);
  color: inherit;
  padding: 0.42rem 0.55rem;
  font-size: 0.8rem;
}
.planner-flight__form input[type='date'] { color-scheme: dark; }
.planner-flight__form button {
  background: rgba(94, 200, 255, 0.24);
  border-color: rgba(94, 200, 255, 0.5);
  font-weight: 700;
  cursor: pointer;
}
.planner-flight__form button:disabled { opacity: 0.4; cursor: default; }
.flight-enter-active, .flight-leave-active, .flight-move { transition: all 0.25s ease; }
.flight-enter-from, .flight-leave-to { opacity: 0; transform: translateY(-4px); }
.planner-cal,
.planner-editor {
  border-radius: 22px;
  padding: 1.1rem 1.15rem 1.25rem;
  background: rgba(18, 22, 30, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.planner-cal__toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
}
.planner-cal__month {
  margin: 0;
  flex: 1;
  text-align: center;
  font-size: 1.05rem;
  font-weight: 750;
}
.planner-cal__nav,
.planner-cal__today,
.planner-editor__ghost,
.planner-editor__clear,
.planner-editor__save {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
}
.planner-cal__nav {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
}
.planner-cal__today {
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
}
.planner-cal__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.35rem;
  text-align: center;
  font-size: 0.72rem;
  opacity: 0.6;
  font-weight: 700;
}
.planner-cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.3rem;
}
.planner-day {
  position: relative;
  min-height: 3.2rem;
  border-radius: 12px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.25rem 0.15rem;
  font: inherit;
}
.planner-day.is-out { opacity: 0.35; }
.planner-day.is-today {
  border-color: rgba(255, 210, 90, 0.85);
  background: rgba(255, 210, 90, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 210, 90, 0.35);
}
.planner-day.is-today .planner-day__num {
  color: #ffe8a0;
}
.planner-day.is-active {
  background: rgba(184, 240, 255, 0.2);
  border-color: rgba(184, 240, 255, 0.5);
}
.planner-day.is-today.is-active {
  background: linear-gradient(160deg, rgba(255, 210, 90, 0.22), rgba(184, 240, 255, 0.22));
  border-color: rgba(255, 210, 90, 0.9);
}
.planner-day:hover { background: rgba(255, 255, 255, 0.1); }
.planner-day__badge {
  position: absolute;
  top: 0.18rem;
  right: 0.22rem;
  font-size: 0.58rem;
  font-weight: 800;
  line-height: 1;
  padding: 0.12rem 0.28rem;
  border-radius: 999px;
  background: #ffe8a0;
  color: #1a1f28;
  letter-spacing: 0.02em;
}
.planner-day__num {
  font-size: 0.86rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.planner-day__tags {
  display: flex;
  gap: 0.15rem;
  min-height: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
}
.planner-day__tag {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  display: inline-block;
}
.planner-cal__stats {
  margin-top: 0.75rem;
  font-size: 0.72rem;
  opacity: 0.7;
}
.planner-editor__head h2 {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
}
.planner-editor__head p {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  opacity: 0.68;
}
.planner-editor__head--sep {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.planner-add-topic {
  margin-bottom: 0.5rem;
}
.planner-add-topic__dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.planner-add-topic__btn {
  width: 100%;
  margin-top: 0.35rem;
}
.planner-topics {
  margin-bottom: 0.85rem;
}
.planner-topics__title {
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.8;
  margin-bottom: 0.45rem;
}
.planner-topics__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.topic-chip {
  border-radius: 999px;
  border: 1.5px solid;
  padding: 0.32rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
}
.planner-empty-tip {
  margin: 0 0 0.55rem;
  font-size: 0.78rem;
  opacity: 0.65;
  color: #ffe8a0;
}
.planner-field {
  display: block;
  margin-bottom: 0.7rem;
}
.planner-field--compact {
  margin-bottom: 0.5rem;
}
.planner-field span {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.8;
}
.planner-field input,
.planner-field textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  padding: 0.7rem 0.85rem;
  font: inherit;
  line-height: 1.6;
  outline: none;
  caret-color: #ffe8a0;
}
.planner-field input[type="date"] {
  color-scheme: dark;
  padding: 0.55rem 0.75rem;
}
.planner-field textarea {
  resize: vertical;
}
.planner-editor__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.25rem;
}
.planner-editor__hint {
  flex: 1;
  font-size: 0.75rem;
  color: #b8f0ff;
  font-weight: 650;
}
.planner-editor__hint.muted {
  color: inherit;
  opacity: 0.55;
  font-weight: 500;
}
.planner-editor__ghost,
.planner-editor__clear {
  padding: 0.42rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 700;
}
.planner-editor__clear:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.planner-editor__save {
  padding: 0.45rem 0.95rem;
  font-size: 0.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ffe8a0, #b8f0ff);
  color: #1a1f28;
  border: none;
}
.planner-editor__save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.planner-manage {
  margin-bottom: 0.5rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.planner-manage__list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.planner-manage__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  padding: 0.45rem 0.55rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.planner-manage__item > i {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.planner-manage__info {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.planner-manage__name {
  font-weight: 700;
}
.planner-manage__range {
  font-size: 0.7rem;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
.planner-manage__date {
  width: auto;
  flex: 1 1 7rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  padding: 0.3rem 0.45rem;
  font: inherit;
  font-size: 0.72rem;
  color-scheme: dark;
}
.planner-manage__edit,
.planner-manage__del,
.planner-manage__ok,
.planner-manage__cancel {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.4rem;
}
.planner-manage__edit { color: #b8f0ff; }
.planner-manage__del { color: #ffb4b4; }
.planner-manage__ok { color: #9ae6b4; }
.planner-manage__cancel { color: inherit; opacity: 0.6; }

@media (max-width: 860px) {
  .planner-page__layout { grid-template-columns: 1fr; }
  .planner-page__inner { width: calc(100% - 1rem); }
  .planner-add-topic__dates { grid-template-columns: 1fr; }
}
</style>
