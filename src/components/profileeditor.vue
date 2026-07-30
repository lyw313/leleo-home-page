<template>
  <Teleport to="body">
    <button
      v-if="isAdmin && page === 'home'"
      type="button"
      class="profile-edit-fab building-solid"
      title="编辑关于我 / 自我介绍 / 技能"
      @click="open"
    >
      <v-icon icon="mdi-account-edit-outline" size="20"></v-icon>
      <span>编辑资料</span>
    </button>

    <div v-if="show" class="profile-modal" @click.self="close">
      <div class="profile-modal__card">
        <header class="profile-modal__head">
          <div>
            <h3>编辑主页资料</h3>
            <p>仅管理员可见，保存后立刻生效（存在本机）。</p>
          </div>
          <button type="button" class="profile-modal__x" @click="close">
            <v-icon icon="mdi-close" size="18"></v-icon>
          </button>
        </header>

        <section class="profile-modal__section">
          <h4>关于我</h4>
          <label class="profile-modal__label">标题</label>
          <input v-model="draft.about.title" class="profile-modal__input" type="text" maxlength="40" />
          <label class="profile-modal__label">简介</label>
          <textarea
            v-model="draft.about.summary"
            class="profile-modal__textarea"
            rows="3"
            maxlength="500"
            placeholder="介绍一下自己…"
          ></textarea>
        </section>

        <section class="profile-modal__section">
          <h4>自我介绍</h4>
          <p class="profile-modal__hint">用逗号或换行分隔多个标签</p>
          <textarea
            v-model="draft.tagsText"
            class="profile-modal__textarea"
            rows="3"
            maxlength="300"
            placeholder="热爱前端, Vue 爱好者, 认真生活"
          ></textarea>
        </section>

        <section class="profile-modal__section">
          <div class="profile-modal__skills-head">
            <h4>技能</h4>
            <button type="button" class="profile-modal__ghost" @click="addSkill">添加技能</button>
          </div>
          <div v-if="!draft.skills.length" class="profile-modal__empty">还没有技能，点「添加技能」</div>
          <div v-for="(skill, idx) in draft.skills" :key="idx" class="profile-modal__skill">
            <input
              v-model="skill.name"
              class="profile-modal__input"
              type="text"
              maxlength="40"
              placeholder="技能名"
            />
            <input
              v-model.number="skill.point"
              class="profile-modal__input profile-modal__input--num"
              type="number"
              min="0"
              max="100"
              placeholder="%"
            />
            <input
              v-model="skill.icon"
              class="profile-modal__input"
              type="text"
              maxlength="48"
              placeholder="图标 mdi-xxx"
            />
            <button type="button" class="profile-modal__del" title="删除" @click="removeSkill(idx)">
              <v-icon icon="mdi-delete-outline" size="16"></v-icon>
            </button>
          </div>
        </section>

        <footer class="profile-modal__foot">
          <button type="button" class="profile-modal__ghost" @click="close">取消</button>
          <button type="button" class="profile-modal__primary" @click="save">保存</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { loadProfile, saveProfile, normalizeTags } from '../utils/profileStore.js';

export default {
  name: 'ProfileEditor',
  props: {
    isAdmin: { type: Boolean, default: false },
    page: { type: String, default: 'home' },
    seed: { type: Object, default: () => ({}) },
  },
  emits: ['saved'],
  data() {
    return {
      show: false,
      draft: {
        about: { title: '关于我', summary: '' },
        tagsText: '',
        skills: [],
      },
    };
  },
  methods: {
    open() {
      const profile = loadProfile(this.seed);
      this.draft = {
        about: { ...profile.about },
        tagsText: (profile.tags || []).join(', '),
        skills: (profile.skills || []).map((s) => ({ ...s })),
      };
      this.show = true;
    },
    close() {
      this.show = false;
    },
    addSkill() {
      this.draft.skills.push({ name: '', point: 80, icon: 'mdi-star-outline' });
    },
    removeSkill(idx) {
      this.draft.skills.splice(idx, 1);
    },
    save() {
      const next = saveProfile({
        about: this.draft.about,
        tags: normalizeTags(this.draft.tagsText),
        skills: this.draft.skills,
      });
      this.$emit('saved', next);
      this.show = false;
    },
  },
};
</script>

<style scoped>
.profile-edit-fab {
  position: fixed;
  left: 0.9rem;
  bottom: 1rem;
  z-index: 55;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  padding: 0.55rem 0.95rem;
  background: rgba(42, 111, 118, 0.92);
  color: #f4fbfb;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22);
}
.profile-edit-fab:hover {
  filter: brightness(1.06);
}
@media (max-width: 600px) {
  .profile-edit-fab {
    left: 0.55rem;
    bottom: 0.7rem;
  }
}
.profile-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(8, 10, 14, 0.58);
  backdrop-filter: blur(6px);
}
.profile-modal__card {
  width: min(560px, 100%);
  max-height: min(88vh, 760px);
  overflow: auto;
  border-radius: 20px;
  padding: 1.15rem 1.15rem 1rem;
  background: rgba(255, 255, 255, 0.96);
  color: #1f2933;
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.3);
}
.profile-modal__head {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.9rem;
}
.profile-modal__head h3 {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
}
.profile-modal__head p {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.7;
}
.profile-modal__x {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.profile-modal__section {
  margin-bottom: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(20, 28, 36, 0.08);
}
.profile-modal__section h4 {
  margin: 0 0 0.55rem;
  font-size: 0.95rem;
}
.profile-modal__label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
  margin: 0.35rem 0 0.25rem;
}
.profile-modal__hint {
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  opacity: 0.65;
}
.profile-modal__input,
.profile-modal__textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid rgba(20, 28, 36, 0.16);
  padding: 0.55rem 0.7rem;
  font: inherit;
  margin-bottom: 0.35rem;
}
.profile-modal__textarea {
  resize: vertical;
  min-height: 4.5rem;
}
.profile-modal__skills-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}
.profile-modal__skills-head h4 {
  margin: 0;
}
.profile-modal__skill {
  display: grid;
  grid-template-columns: 1.4fr 0.55fr 1.1fr auto;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}
.profile-modal__input--num {
  text-align: center;
}
.profile-modal__empty {
  font-size: 0.8rem;
  opacity: 0.6;
  padding: 0.4rem 0;
}
.profile-modal__del {
  width: 2.1rem;
  height: 2.1rem;
  border: none;
  border-radius: 10px;
  background: rgba(192, 57, 43, 0.12);
  color: #c0392b;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.profile-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  padding-top: 0.2rem;
}
.profile-modal__ghost,
.profile-modal__primary {
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  cursor: pointer;
}
.profile-modal__ghost {
  background: rgba(0, 0, 0, 0.06);
}
.profile-modal__primary {
  background: #2a6f76;
  color: #fff;
}

@media (max-width: 600px) {
  .profile-edit-fab {
    left: 0.55rem;
    bottom: 0.7rem;
  }
  .profile-modal__skill {
    grid-template-columns: 1fr 4.5rem;
  }
  .profile-modal__skill .profile-modal__input:nth-child(3) {
    grid-column: 1 / -2;
  }
}
</style>
