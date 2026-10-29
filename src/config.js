import { withAssetBase } from './utils/assetUrl.js';

const config = {
	//网页元数据
	metaData: {
		title: '李应旺｜我不是神的个人主页',
		description: '欢迎来到李应旺的个人主页！',
		keywords: '李应旺,我不是神,个人主页,个人网站',
		icon: '/favicon.ico'   //网页图标，支持外链
	},

	avatar: "/img/avatar.jpg", // 头像
	username: "李应旺", // 头像下方名字
	welcometitle: "我不是神", // 标题
	contactEmail: "2075435029@qq.com", // 留言发送邮箱

	// 全站权限：默认游客；输入密码后成为管理员（约 2 小时）
	siteAdmin: {
		password: '0313',
		sessionHours: 2,
	},

	// 学习博客（右侧入口 + 独立博客空间页面）
	// 写/改/删跟随 siteAdmin；游客只读
	blogAdmin: {
		password: '0313', // 兼容旧逻辑，实际以 siteAdmin 为准
		sessionHours: 2,
		seedPosts: [
			// 示例可删：{ title:'...', summary:'...', content:'...', tags:['Vue'], projectUrl:'https://github.com/xxx', kind:'project' }
		],
		// 博客页透明飘过的励志语
		floatQuotes: [
			'Talk is cheap. Show me the code.',
			'先跑通，再优雅。',
			'Bug 不是敌人，是还没写完的文档。',
			'今天的报错，是明天的经验值。',
			'Commit early, commit often.',
			'别怕重构，怕的是不敢动。',
			'读源码，比刷课更涨功力。',
			'一个清晰的命名，能省掉三行注释。',
			'Debug 的尽头是理解。',
			'Ship it. Then improve it.',
			'你删掉的代码，也是成长的一部分。',
			'保持好奇，保持能跑。',
			'文档写清楚的人，才是真正的队友。',
			'代码能跑只是及格，可读才是优秀。',
			'先复现，再修复。',
			'小步提交，大胆回滚。',
			'写测试，是给未来的自己留后路。',
			'简洁不是少写，是写对。',
			'Done is better than perfect.',
			'Keep calm and npm install.',
			'It works on my machine —— 然后去修 CI。',
			// 英语励志
			'Stay hungry. Stay foolish.',
			'The only way to do great work is to love what you do.',
			'Success is not final, failure is not fatal.',
			'Dream big. Start small. Act now.',
			'Progress, not perfection.',
			'Fall seven times, stand up eight.',
			'Make it happen.',
			'Be so good they can’t ignore you.',
			'Discipline equals freedom.',
			'You miss 100% of the shots you don’t take.',
			'Hard work beats talent when talent doesn’t work hard.',
			'The best time to plant a tree was 20 years ago. The second best time is now.',
			'Don’t watch the clock; do what it does. Keep going.',
			'Believe you can and you’re halfway there.',
			// 字母哥 Giannis
			'The only thing I can control is my effort.',
			'I always want to be better.',
			'When you focus on the process, the results will come.',
			'I’m not going to let anyone outwork me.',
			'Stay humble. Stay hungry. — Giannis',
			'Every day I try to get 1% better.',
			'Pressure is a privilege.',
			'I play for my family, my teammates, and the love of the game.',
			'Don’t skip the hard days — they make the easy days possible.',
			'字母哥：努力，是我唯一能掌控的事。',
			'字母哥：每天进步一点点。',
			'字母哥：保持谦逊，保持饥饿。',
		],
	},

	// EmailJS（网页内直接发信到 QQ）
	// Service ID 在 EmailJS 左侧「电子邮件服务」里，形如 service_xxxxxxx
	emailjs: {
		publicKey: "jxL7qETFSPQSn2LUM",
		serviceId: "service_26im0br",
		templateId: "template_sjs0sh4",
	},

	// 颜色配置
	color: {
		themecolor: "#FFFFFF", // 主题颜色，推荐趋于亮白可带有轻微色调，例： #D1FFEC
		welcometitlecolor: "#FFFFFF", // 标题颜色 例： #7BFFC9
		turntablecolor1: "#FFFF00",  // 转盘渐变色一
		turntablecolor2: "#00FFFF"   // 转盘渐变色二
	},

	brightness: 85, // 背景亮度 --%
	blur: 5, // 毛玻璃模糊效果

	// 自我介绍
	tags: ['热爱前端', 'Vue 爱好者', '认真生活'],

	// 关于我（头像下方）
	aboutMe: {
		title: '关于我',
		summary: '一个爱写代码、也爱折腾生活的人。不完美，但认真。',
	},

	// 右侧内容模块：运动 / 游戏 / 项目 / 生活
	lifeModules: [
		{
			key: 'sport',
			title: '运动',
			icon: 'mdi-run',
			desc: '流点汗，脑子会更清醒一点。',
			cover: '/img/world/sport/giannis-fear.png', // 扇区封面
			items: [
				{ title: 'Fear The Freak', text: '字母哥：努力是唯一能掌控的事', image: '/img/world/sport/giannis-fear.png' },
				{ title: '训练日', text: '热身、运球、重复，直到成为本能', image: '/img/world/sport/giannis-practice.png' },
				{ title: '持球推进', text: '球场上的节奏感', image: '/img/world/sport/giannis-dribble.png' },
				{ title: '力量训练', text: '一点点堆出来的线条', image: '/img/world/sport/gym-abs.png' },
				{ title: '舞台之上', text: '形体也是一种坚持', image: '/img/world/sport/bodybuilding-stage.png' },
			],
		},
		{
			key: 'game',
			title: '游戏',
			icon: 'mdi-gamepad-variant',
			desc: '认真开黑，也认真摸鱼。',
			cover: '/img/world/game/donk-peace.png',
			items: [
				{ title: '灶门炭治郎', text: '鬼灭：心之所向，刀锋所指', image: '/img/world/game/tanjiro.png' },
				{ title: '富冈义勇', text: '水柱静默，雪夜里的守护', image: '/img/world/game/giyu.png' },
				{ title: '我妻善逸', text: '一闪雷霆，真正的高光时刻', image: '/img/world/game/zenitsu.png' },
				{ title: '不死川实弥', text: '风柱热血，不服就干', image: '/img/world/game/sanemi.png' },
				{ title: 'donk', text: 'CS：自信、瞄准、拿下回合', image: '/img/world/game/donk-peace.png' },
				{ title: 'MVP 时刻', text: '赛场聚光灯下的冠军气质', image: '/img/world/game/donk-mvp.png' },
			],
		},
		{
			key: 'project',
			title: '项目',
			icon: 'mdi-code-braces',
			desc: '把想法一点点做成能打开的页面。',
			cover: '/img/wallpaper/static/书房夜晚/image.png',
			items: [
				{ title: '个人主页', text: '你正在看的这个站点，Vue + Vuetify 个人主页。', website: '/', repo: 'https://github.com/lyw313/leleo-home-page' },
				{ title: '前端练手', text: 'Vue / Vuetify 小实验与组件练习。', website: '', repo: '' },
				{ title: '工具脚本', text: '生活里用得上的小工具。', website: '', repo: '' },
			],
		},
		{
			key: 'life',
			title: '生活',
			icon: 'mdi-coffee',
			desc: '代码之外，也想过得热闹一点。',
			cover: '/img/world/life/sunset.png',
			items: [
				{ title: '一束郁金香', text: '把温柔留给日常', image: '/img/world/life/tulips.png' },
				{ title: '黄昏云隙', text: '偶尔抬头，天光很好', image: '/img/world/life/sunset.png' },
				{ title: '月下小城', text: '安静也是一种浪漫', image: '/img/world/life/moon-town.png' },
				{ title: '冰糖葫芦', text: '冬天就该有点甜', image: '/img/world/life/tanghulu.png' },
				{ title: '校园午后', text: '和朋友坐着闲聊的时光', image: '/img/world/life/school-cafe.png' },
				{ title: '冰箱里的花', text: '把生活过成小仪式感', image: '/img/world/life/fridge-flowers.png' },
			],
		},
	],

	// 默认背景壁纸
	background: {
		"pc": {   //pc端
			"type": "pic",   //"pic":静态壁纸;"video":动态壁纸
			"datainfo": {
				"title": "与狗合影",
				"preview": "/img/wallpaper/static/dog-hug/image-pre.webp",
				"url": "/img/wallpaper/static/dog-hug/image.png",
			},
		},
		"mobile": {   //移动端
			"type": "pic",
			"datainfo": {
				"title": "与狗合影",
				"preview": "/img/wallpaper/static/dog-hug/image-pre.webp",
				"url": "/img/wallpaper/static/dog-hug/image.png"
			}
		}

	},

	//技能数据
	polarChart: {
		skills: [
			{ name: '前端开发', point: 90, icon: 'mdi-laptop' },
			{ name: 'JavaScript', point: 86, icon: 'mdi-language-javascript' },
			{ name: 'Vue.js', point: 84, icon: 'mdi-vuejs' },
			{ name: 'UI / UX', point: 80, icon: 'mdi-palette-outline' },
			{ name: '响应式设计', point: 88, icon: 'mdi-responsive' },
			{ name: 'Git', point: 82, icon: 'mdi-git' },
			{ name: 'Node.js', point: 76, icon: 'mdi-nodejs' },
			{ name: 'Python', point: 70, icon: 'mdi-language-python' },
		],
	},

	//社交按钮
	socialPlatformIcons: [
		{ icon: "mdi-github", link: "https://github.com/lyw313" },
		{ icon: "mdi-qqchat", link: "https://wpa.qq.com/msgrd?v=3&uin=2075435029&site=qq&menu=yes" },
		{ icon: "mdi-wechat", link: "weixin://dl/chat?17818447910" }
	],

	//打字机
	typeWriterStrings: [
		"你就来这一趟，我希望你热烈，而又自在的活着！"
	],

	//音乐播放：本地歌单 / 自定义直链；播不了的先别塞进来
	musicPlayer: {
		server: 'netease',
		type: 'playlist',
		id: '',
		localPlaylist: '/kugou-playlist.json',
		// 可播放歌曲示例：{ title:'歌名', author:'歌手', url:'/music/xxx.mp3', pic:'' }
		customSongs: [
			{ title: '普通朋友', author: '陶喆', url: '/music/taozhe-putongpengyou.mp3', pic: '' },
			{ title: '那个女孩', author: '陶喆、卢广仲', url: '/music/taozhe-nage-nvhai.mp3', pic: '' },
		],
	},

	// 各页面背景图
	pageBackgrounds: {
		blog: '/img/wallpaper/static/书房夜晚/image.png',
		planner: '/img/world/life/sunset.png',
		music: '/img/world/life/moon-town.png',
		reviews: '/img/reviews/portrait.png',
	},

	//壁纸数据 -----可以将壁纸文件上传到图床获取网络直链。若想调用api，请前往脚本自行修改逻辑
	wallpaper: {
		pic: [
			{ "title": "与狗合影", "preview": "/img/wallpaper/static/dog-hug/image-pre.webp", "url": "/img/wallpaper/static/dog-hug/image.png" },
			{ "title": "草帽女孩", "preview": "/img/wallpaper/static/草帽女孩/image-pre.webp", "url": "/img/wallpaper/static/草帽女孩/image.png" },
			{ "title": "海洋女孩", "preview": "/img/wallpaper/static/海洋女孩/image-pre.webp", "url": "/img/wallpaper/static/海洋女孩/image.png" },
			{ "title": "书房夜晚", "preview": "/img/wallpaper/static/书房夜晚/image-pre.webp", "url": "/img/wallpaper/static/书房夜晚/image.png" },
			{ "title": "安逸舒适", "preview": "/img/wallpaper/static/安逸舒适/image-pre.webp", "url": "/img/wallpaper/static/安逸舒适/image.png" },
			{ "title": "jswcMaMj", "preview": "https://s21.ax1x.com/2025/07/23/pVGli59.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVGli59.jpg" },
			{ "title": "pgtTqoqq", "preview": "https://s21.ax1x.com/2025/07/23/pVGlmDO.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVGlmDO.jpg" },
			{ "title": "cvKMKhue", "preview": "https://s21.ax1x.com/2025/07/23/pVGlNqS.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVGlNqS.jpg" },
			{ "title": "XpxvQVoP", "preview": "https://s21.ax1x.com/2025/07/23/pVGlfIJ.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVGlfIJ.jpg" },
			{ "title": "fVEEjEOA", "preview": "https://s21.ax1x.com/2025/07/23/pVGlEgx.md.webp", "url": "https://s21.ax1x.com/2025/07/23/pVGlEgx.webp" },
			{ "title": "jgnIKMpd", "preview": "https://s21.ax1x.com/2025/07/23/pVGldaQ.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVGldaQ.jpg" },
			{ "title": "mgqyySeh", "preview": "https://s21.ax1x.com/2025/07/23/pVGl82t.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVGl82t.jpg" },
			{ "title": "dSXZfZp", "preview": "https://s21.ax1x.com/2025/07/23/pVGlaVg.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVGlaVg.jpg" },
		],
		picMobile: [
			{ "title": "与狗合影", "preview": "/img/wallpaper/static/dog-hug/image-pre.webp", "url": "/img/wallpaper/static/dog-hug/image.png" },
			{ "title": "草帽女孩", "preview": "/img/wallpaper/static/草帽女孩/image-pre.webp", "url": "/img/wallpaper/static/草帽女孩/image.png" },
			{ "title": "0001", "preview": "/img/wallpaper/static-mobile/0001/image-pre.webp", "url": "/img/wallpaper/static-mobile/0001/image.png" },
			{ "title": "0002", "preview": "/img/wallpaper/static-mobile/0002/image-pre.webp", "url": "/img/wallpaper/static-mobile/0002/image.png" },
			{ "title": "0003", "preview": "/img/wallpaper/static-mobile/0003/image-pre.webp", "url": "/img/wallpaper/static-mobile/0003/image.png" },
			{ "title": "0004", "preview": "/img/wallpaper/static-mobile/0004/image-pre.webp", "url": "/img/wallpaper/static-mobile/0004/image.png" },
			{ "title": "DfNHPPcc", "preview": "https://s21.ax1x.com/2025/07/23/pVG1uQ0.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVG1uQ0.jpg" },
			{ "title": "cZZwzhis", "preview": "https://s21.ax1x.com/2025/07/23/pVG1Vij.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVG1Vij.jpg" },
			{ "title": "aANKZHPX", "preview": "https://s21.ax1x.com/2025/07/23/pVGlIR1.md.jpg", "url": "https://s21.ax1x.com/2025/07/23/pVGlIR1.jpg" },
		],
		video: [
			{
				"title": "尼尔：机械纪元 团队",
				"preview": "/img/wallpaper/dynamic/尼尔：机械纪元 团队/Nier-Automata-Team-pre.webm",
				"url": "/img/wallpaper/dynamic/尼尔：机械纪元 团队/Nier-Automata-Team.webm"
			},
			{
				"title": "向往航天的女孩",
				"preview": "/img/wallpaper/dynamic/向往航天的女孩/Toy-Aeroplane-pre.webm",
				"url": "/img/wallpaper/dynamic/向往航天的女孩/Toy-Aeroplane.webm"
			},
			{
				"title": "世界很温柔《龙族》上杉绘梨衣",
				"preview": "https://www.leleo.top/img/wallpaper/dynamic/%E4%B8%96%E7%95%8C%E5%BE%88%E6%B8%A9%E6%9F%94%E3%80%8A%E9%BE%99%E6%97%8F%E3%80%8B%E4%B8%8A%E6%9D%89%E7%BB%98%E6%A2%A8%E8%A1%A3/A2EF5E85-pre.webm",
				"url": "https://www.leleo.top/img/wallpaper/dynamic/%E4%B8%96%E7%95%8C%E5%BE%88%E6%B8%A9%E6%9F%94%E3%80%8A%E9%BE%99%E6%97%8F%E3%80%8B%E4%B8%8A%E6%9D%89%E7%BB%98%E6%A2%A8%E8%A1%A3/A2EF5E85.webm"
			},
		],
		videoMobile: [
			{
				"title": "幻觉镇-gaako_illust",
				"preview": "/img/wallpaper/dynamic-mobile/幻觉镇-gaako_illust/Hallucination_town-pre.mp4",
				"url": "/img/wallpaper/dynamic-mobile/幻觉镇-gaako_illust/Hallucination_town.mp4"
			},
			{
				"title": "chuva",
				"preview": "/img/wallpaper/dynamic-mobile/chuva/chuva-pre.mp4",
				"url": "/img/wallpaper/dynamic-mobile/chuva/chuva.mp4"
			},
			{
				"title": "Doodle-小猫女仆降临",
				"preview": "/img/wallpaper/dynamic-mobile/Doodle-小猫女仆降临/d12-pre.mp4",
				"url": "/img/wallpaper/dynamic-mobile/Doodle-小猫女仆降临/d12.mp4"
			},
		],
	},

	//兼容旧字段
	projectcards: [],

	statement: ["", "Copyright © 2026 李应旺"],
}

export default withAssetBase(config)
