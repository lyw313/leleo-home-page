<template>
  <Teleport to="body">
    <div class="auth-wrap">
      <button
        v-if="isAdmin"
        type="button"
        class="auth-renew building-solid"
        :class="{ 'is-disabled': !canRenew }"
        :disabled="!canRenew"
        :title="renewTitle"
        @click="renew"
      >
        <v-icon icon="mdi-timer-plus-outline" size="16"></v-icon>
        <span>{{ renewLabel }}</span>
      </button>

      <div class="auth-chip building-solid" :class="{ 'is-admin': isAdmin }">
        <template v-if="isAdmin">
          <span class="auth-chip__tag">管理员</span>
          <span class="auth-chip__remain">{{ remainText }}</span>
          <button type="button" class="auth-chip__btn" @click="logout">退出</button>
        </template>
        <template v-else>
          <span class="auth-chip__tag">游客模式</span>
          <button type="button" class="auth-chip__btn auth-chip__btn--main" @click="showLogin = !showLogin">
            管理员登录
          </button>
        </template>
      </div>
    </div>

    <div v-if="showLogin && !isAdmin" class="auth-modal">
      <div class="auth-modal__card">
        <h3>管理员登录</h3>
        <p>登录后可添加 / 删除「我的世界」内容、管理博客、编辑主页资料等。游客只能观看、发邮件和写评论。</p>
        <input
          v-model="password"
          class="auth-modal__input"
          type="password"
          maxlength="64"
          placeholder="输入管理密码"
          @keydown.enter="login"
        />
        <div v-if="error" class="auth-modal__error">{{ error }}</div>
        <div class="auth-modal__actions">
          <button type="button" class="auth-modal__ghost" @click="showLogin = false">取消</button>
          <button type="button" class="auth-modal__primary" :disabled="!password" @click="login">进入管理</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import {
  getSiteAuth,
  setSiteAuth,
  clearSiteAuth,
  verifySitePassword,
  authTtlFromConfig,
  extendSiteAuth,
  canRenewAuth,
  renewCooldownLeft,
  DEFAULT_TTL_MS,
} from '../utils/authStore.js';

export default {
  name: 'AuthChip',
  props: {
    config: { type: Object, default: () => ({}) },
  },
  emits: ['change'],
  data() {
    return {
      isAdmin: false,
      expiresAt: 0,
      showLogin: false,
      password: '',
      error: '',
      tick: Date.now(),
      timer: null,
    };
  },
  computed: {
    adminCfg() {
      return this.config.siteAdmin || this.config.blogAdmin || {};
    },
    expectedPassword() {
      return this.adminCfg.password || '0313';
    },
    ttlMs() {
      return authTtlFromConfig(this.adminCfg);
    },
    remainText() {
      const left = Math.max(0, this.expiresAt - this.tick);
      if (!left) return '即将过期';
      const m = Math.floor(left / 60000);
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return h > 0 ? `${h}h ${mm}m` : `${Math.max(1, mm)}m`;
    },
    canRenew() {
      this.tick;
      return canRenewAuth(this.ttlMs || DEFAULT_TTL_MS);
    },
    renewLabel() {
      if (this.canRenew) return '续费 2h';
      const left = renewCooldownLeft(this.ttlMs || DEFAULT_TTL_MS);
      const m = Math.ceil(left / 60000);
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return h > 0 ? `${h}h${mm}m 后可续` : `${Math.max(1, mm)}m 后可续`;
    },
    renewTitle() {
      return this.canRenew
        ? '延长管理员时长 2 小时（每 2 小时只能点一次）'
        : '续费冷却中，每 2 小时只能续费一次';
    },
  },
  mounted() {
    this.refresh();
    this.timer = setInterval(() => {
      this.tick = Date.now();
      this.refresh();
    }, 15000);
    window.addEventListener('leleo-auth-changed', this.refresh);
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer);
    window.removeEventListener('leleo-auth-changed', this.refresh);
  },
  methods: {
    refresh() {
      const auth = getSiteAuth();
      this.isAdmin = !!auth.ok;
      this.expiresAt = auth.expiresAt || 0;
      this.$emit('change', this.isAdmin);
    },
    login() {
      this.error = '';
      if (!verifySitePassword(this.password, this.expectedPassword)) {
        this.error = '密码不对';
        return;
      }
      const auth = setSiteAuth(this.ttlMs);
      this.isAdmin = true;
      this.expiresAt = auth.expiresAt;
      this.password = '';
      this.showLogin = false;
      this.tick = Date.now();
      this.$emit('change', true);
    },
    renew() {
      if (!this.isAdmin || !this.canRenew) return;
      const auth = extendSiteAuth(this.ttlMs || DEFAULT_TTL_MS);
      if (!auth.ok) return;
      this.expiresAt = auth.expiresAt;
      this.tick = Date.now();
    },
    logout() {
      clearSiteAuth();
      this.isAdmin = false;
      this.expiresAt = 0;
      this.$emit('change', false);
    },
  },
};
</script>

<style scoped>
.auth-wrap {
  position: fixed;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.auth-renew {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  background: rgba(255, 232, 160, 0.92);
  color: #2a2416;
  font-size: 0.74rem;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
  white-space: nowrap;
}
.auth-renew:hover:not(.is-disabled) {
  filter: brightness(1.05);
}
.auth-renew.is-disabled {
  opacity: 0.62;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.72);
  color: rgba(31, 41, 51, 0.7);
}
.auth-chip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.55rem 0.4rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  color: #1f2933;
  font-size: 0.78rem;
}
.auth-chip.is-admin {
  background: rgba(42, 111, 118, 0.92);
  color: #f4fbfb;
  border-color: rgba(255, 255, 255, 0.2);
}
.auth-chip__tag {
  font-weight: 750;
}
.auth-chip__remain {
  opacity: 0.8;
  font-size: 0.72rem;
}
.auth-chip__btn {
  border: none;
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.08);
  color: inherit;
}
.auth-chip.is-admin .auth-chip__btn {
  background: rgba(255, 255, 255, 0.16);
}
.auth-chip__btn--main {
  background: #2a6f76;
  color: #f4fbfb;
}
.auth-modal {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  background: rgba(8, 10, 14, 0.55);
  backdrop-filter: blur(6px);
  padding: 1rem;
}
.auth-modal__card {
  width: min(400px, 100%);
  border-radius: 18px;
  padding: 1.2rem 1.15rem;
  background: rgba(255, 255, 255, 0.94);
  color: #1f2933;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
}
.auth-modal__card h3 {
  margin: 0 0 0.45rem;
  font-size: 1.15rem;
}
.auth-modal__card p {
  margin: 0 0 0.85rem;
  font-size: 0.84rem;
  line-height: 1.55;
  opacity: 0.78;
}
.auth-modal__input {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid rgba(20, 28, 36, 0.18);
  padding: 0.65rem 0.8rem;
  font: inherit;
  margin-bottom: 0.55rem;
}
.auth-modal__error {
  color: #c0392b;
  font-size: 0.78rem;
  margin-bottom: 0.45rem;
}
.auth-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}
.auth-modal__ghost,
.auth-modal__primary {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  font-weight: 700;
  cursor: pointer;
}
.auth-modal__ghost {
  background: rgba(0, 0, 0, 0.06);
}
.auth-modal__primary {
  background: #2a6f76;
  color: #fff;
}
.auth-modal__primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .auth-wrap {
    top: 0.55rem;
    right: 0.55rem;
    max-width: calc(100vw - 1.1rem);
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
