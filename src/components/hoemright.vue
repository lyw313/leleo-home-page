<template>
      <div class="home-right-root">
        <div class="home-right-shell">
          <v-row align="start" class="home-right-top">
            <v-col cols="12" md="8" class="home-right-main">
              <typewriter class="quote-block building-solid"></typewriter>
              <div class="mail-box v-card building-solid" :class="{ 'mail-box--compact': xs || sm }">
                <div class="mail-box__label">
                  <v-icon icon="mdi-email-fast-outline" size="18"></v-icon>
                  给我发消息
                </div>
                <input
                  v-model="mailName"
                  class="mail-box__input"
                  type="text"
                  maxlength="30"
                  placeholder="你的名字 / 昵称"
                />
                <input
                  v-model="mailEmail"
                  class="mail-box__input"
                  type="email"
                  maxlength="60"
                  placeholder="你的邮箱（方便我回复，可选）"
                />
                <textarea
                  v-model="mailMessage"
                  class="mail-box__textarea"
                  rows="2"
                  maxlength="400"
                  placeholder="想对我说点什么…"
                  @keydown.ctrl.enter="sendMail"
                ></textarea>
                <div class="mail-box__foot">
                  <span class="mail-box__hint">{{ mailHint }}</span>
                  <button type="button" class="mail-box__btn" :disabled="!canSendMail || mailSending" @click="sendMail">
                    <v-icon :icon="mailSending ? 'mdi-progress-clock' : 'mdi-send'" size="16"></v-icon>
                    {{ mailSending ? '发送中' : '发送' }}
                  </button>
                </div>
              </div>

              <life-modules class="home-right-world" :modules="configdata.lifeModules || []" />
            </v-col>
            <v-col cols="12" md="4" align="center">
              <v-card class="clock-card building-solid" hover
                >
                  <template v-slot:title >
                    <span class="leleo-card-title clock-font">{{formattedTime}}</span>
                  </template>
                  <template v-slot:subtitle>
                    <span class="clock-date">{{formattedDate}}</span>
                  </template>
                  <turntable :color1="configdata.color.turntablecolor1" :color2="configdata.color.turntablecolor2" />
              </v-card>
              <blog-panel
                :config="configdata"
                @open-blog-home="$emit('open-blog-home')"
                @open-blog="$emit('open-blog', $event)"
              />
            </v-col>
          </v-row>
        </div>       
      </div>
</template> 

<script>
import typewriter from '../components/typewriter.vue';
import turntable from '../components/turntable.vue';
import LifeModules from '../components/lifemodules.vue';
import BlogPanel from '../components/blogpanel.vue';
import emailjs from '@emailjs/browser';
import { useDisplay } from 'vuetify'

export default {
    components: {
        typewriter,turntable,LifeModules,BlogPanel
    },
    emits: ['open-blog-home', 'open-blog'],
    props: ['configdata','formattedTime','formattedDate','projectcards'],
	data() {
		return {
			mailName: '',
			mailEmail: '',
			mailMessage: '',
			mailSending: false,
			mailStatus: '',
		}
	},
    setup() {
      const { xs,sm,md } = useDisplay();
      return {xs,sm,md};
    },
	computed: {
		contactEmail() {
			return this.configdata.contactEmail || '2075435029@qq.com';
		},
		emailjsCfg() {
			return this.configdata.emailjs || {};
		},
		canSendMail() {
			return this.mailName.trim().length > 0 && this.mailMessage.trim().length > 1;
		},
		mailHint() {
			if (this.mailStatus) return this.mailStatus;
			return `发送到 ${this.contactEmail}`;
		},
	},
    methods:{
	  parseEmailjsError(err) {
		const raw = String(err?.text || err?.message || err || '');
		if (/wrong version number|SSL routines|tls_validate/i.test(raw)) {
			return 'QQ 邮箱 SMTP/SSL 配错了，请到 EmailJS 服务里改成 smtp.qq.com:465';
		}
		if (/Invalid grant|reconnect|535|534|authentication|auth/i.test(raw)) {
			return '邮箱授权失败，请检查 QQ 授权码并重新连接服务';
		}
		if (/blocked|origin|domain|not allowed/i.test(raw)) {
			return '域名未授权，请在 EmailJS 个人设置里允许本地域名';
		}
		if (/template|Template/i.test(raw)) {
			return '模板配置有误，请检查 Template ID';
		}
		if (/service|Service/i.test(raw) && !/SMTP/i.test(raw)) {
			return '服务配置有误，请检查 Service ID';
		}
		if (/SMTP/i.test(raw)) {
			return 'QQ 邮件服务发送失败，请在 EmailJS 里点「试一下」排查';
		}
		if (/network|Failed to fetch|NetworkError/i.test(raw)) {
			return '网络异常，请检查网络后重试';
		}
		const short = raw.replace(/\s+/g, ' ').slice(0, 80);
		return short ? `发送失败：${short}` : '发送失败，请稍后再试';
	  },
	  async sendMail() {
		if (!this.canSendMail || this.mailSending) return;
		const name = this.mailName.trim();
		const email = this.mailEmail.trim();
		const message = this.mailMessage.trim();
		const { publicKey, serviceId, templateId } = this.emailjsCfg;

		if (!publicKey || !serviceId || !templateId) {
			this.mailStatus = 'EmailJS 配置不完整';
			return;
		}

		this.mailSending = true;
		this.mailStatus = '正在发送…';
		try {
			emailjs.init({ publicKey });
			await emailjs.send(serviceId, templateId, {
				title: `主页留言 - ${name}`,
				name,
				email: email || '未填写',
				message,
				reply_to: email || '',
			});
			this.mailName = '';
			this.mailEmail = '';
			this.mailMessage = '';
			this.mailStatus = '发送成功，谢谢你的留言！';
			setTimeout(() => {
				if (this.mailStatus.includes('成功')) this.mailStatus = '';
			}, 3200);
		} catch (err) {
			console.error('EmailJS error:', err);
			this.mailStatus = this.parseEmailjsError(err);
		} finally {
			this.mailSending = false;
		}
	  },
    }
};
</script>

<style scoped>
@import url(/css/app.less);
@import url(/css/mobile.less);
.glass-list {
	background: transparent !important;
	backdrop-filter: blur(var(--leleo-blur));
	border-radius: 5%;
	color: var(--leleo-vcard-color);
	overflow: hidden;
}
.clock-card {
	user-select: none;
	-webkit-user-select: none;
	margin: 0.15rem 0.75rem 0.35rem;
}
.clock-date {
	font-weight: bold;
	user-select: none;
	-webkit-user-select: none;
}
.home-right-root {
	height: 100%;
	min-height: 100vh;
}
.home-right-shell {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 100vh;
	gap: 0.15rem;
	padding-bottom: 0.5rem;
	box-sizing: border-box;
}
.home-right-top {
	flex: 1 1 auto;
	min-height: 0;
}
.home-right-main {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.55rem;
	padding-top: 0.1rem;
	height: 100%;
}
:deep(.home-right-world) {
	width: 100%;
	flex: 1 1 auto;
	min-height: 0;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding-top: 0.35rem;
}
.quote-block {
	width: min(100%, 560px);
	margin: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}
.mail-box {
	width: min(100%, 560px);
	margin: 0;
	padding: 0.75rem 0.9rem 0.8rem;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.18);
	backdrop-filter: blur(var(--leleo-blur));
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
	color: #ffffff;
	box-sizing: border-box;
}
.mail-box--compact {
	width: min(100%, 420px);
}
.mail-box__label {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	font-size: 0.86rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	margin-bottom: 0.55rem;
	color: #ffffff;
	text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);
}
.mail-box__input,
.mail-box__textarea {
	width: 100%;
	box-sizing: border-box;
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.2);
	background: rgba(0, 0, 0, 0.22);
	color: #ffffff;
	padding: 0.55rem 0.75rem;
	font: inherit;
	outline: none;
	margin-bottom: 0.45rem;
	caret-color: #ffe8a0;
	text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.mail-box__input::placeholder,
.mail-box__textarea::placeholder {
	color: rgba(255, 255, 255, 0.72);
}
.mail-box__textarea {
	resize: vertical;
	min-height: 64px;
}
.mail-box__input:focus,
.mail-box__textarea:focus {
	border-color: rgba(255, 236, 160, 0.55);
	background: rgba(0, 0, 0, 0.3);
}
.mail-box__foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
}
.mail-box__hint {
	font-size: 0.72rem;
	color: rgba(255, 255, 255, 0.88);
	text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.mail-box__btn {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	border: none;
	border-radius: 999px;
	padding: 0.45rem 0.95rem;
	font-weight: 700;
	cursor: pointer;
	color: #1a1f28;
	background: linear-gradient(135deg, #ffe8a0, #b8f0ff);
	flex-shrink: 0;
}
.mail-box__btn:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
</style>