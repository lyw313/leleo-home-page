import homeright from '../src/components/hoemright.vue';
import typewriter from './components/typewriter.vue';
import tab1 from './components/tabs/tab1.vue';
import tab2 from './components/tabs/tab2.vue';
import tab3 from './components/tabs/tab3.vue';
import loader from './components/loader.vue';
import polarchart from './components/polarchart.vue';
import aboutme from './components/aboutme.vue';
import plannerpage from './components/plannerpage.vue';
import spinbuddy from './components/spinbuddy.vue';
import pageclimber from './components/pageclimber.vue';
import worldpage from './components/worldpage.vue';
import blogpage from './components/blogpage.vue';
import minimusic from './components/minimusic.vue';
import authchip from './components/authchip.vue';
import profileeditor from './components/profileeditor.vue';
import config from './config.js';
import { getCookie, eraseCookie } from './utils/cookieUtils.js';
import { setMeta,getFormattedTime,getFormattedDate,dataConsole } from './utils/common.js';
import { getSiteAuth } from './utils/authStore.js';
import { loadProfile } from './utils/profileStore.js';
import {
  seedFromConfig,
  loadMusicPlaylist,
  hydrateMusicUrls,
  addMusicSong,
  removeMusicSong,
} from './utils/musicStore.js';
import {
  resolveSongLyrics,
  findLyricIndex,
} from './utils/lyricsUtils.js';
import { useDisplay } from 'vuetify'

export default {
  components: {
    tab1,tab2,tab3,loader,homeright,typewriter,polarchart,aboutme,plannerpage,spinbuddy,pageclimber,worldpage,blogpage,minimusic,authchip,profileeditor
  },
  setup() {
    const { xs,sm,md } = useDisplay();
    return { xs,sm,md };
  },
  data() {
    return {
      isloading:false,
      page: 'home',
      worldKey: '',
      blogMode: 'list',
      blogPostId: '',
      isAdmin: false,
      isClearScreen: false,
      formattedTime:"",
      formattedDate:"",
      configdata: config,
      dialog1: false,
      dialog2: false,
      personalizedtags: null,
      profileAbout: null,
      profileSkills: [],
      videosrc: '',
      ismusicplayer: false,
      isPlaying:false,
      playlistIndex: 0,
      audioLoading: false,
      musicinfo: [],
      musicinfoLoading:false,
      lyrics:{},
      lyricLines: [],
      lyricIndex: -1,
      lyricsLoading: false,
      audioCurrentTime: 0,
      audioDuration: 0,
      audioVolume: 0.8,
      socialPlatformIcons: null,
      isExpanded: false,
      stackicons:[
        {icon:"mdi-vuejs",color:"green", model: false,tip: 'vue'},
        {icon:"mdi-language-javascript",color:"#CAD300", model: false,tip: 'javascript'},
        {icon:"mdi-language-css3",color:"blue", model: false,tip: 'css'},
        {icon:"mdi-language-html5",color:"red", model: false,tip: 'html'},
        {icon:"$vuetify",color:"#1697F6", model: false,tip: 'vuetify'},
      ],
      projectcards:null,
      tab: null,
      tabs: [
        {
          icon: 'mdi-pencil-plus',
          text: '样式预览',
          value: 'tab-1',
          component: "tab1",
        },
        {
          icon: 'mdi-wallpaper',
          text: '背景预览',
          value: 'tab-2',
          component: "tab2",
        },
        {
          icon: 'mdi-music-circle-outline',
          text: '音乐播放',
          value: 'tab-3',
          component: "tab3",
        },
      ],

    };
  },
  created() {
    // 尽早设置主题与壁纸，避免 mounted 异步异常导致一直灰屏
    try {
      if (import.meta.env.VITE_CONFIG) {
        this.configdata = JSON.parse(import.meta.env.VITE_CONFIG);
      }
    } catch (e) {
      console.warn('VITE_CONFIG 解析失败，使用本地 config', e);
    }
    this.projectcards = this.configdata.projectcards || [];
    this.socialPlatformIcons = this.configdata.socialPlatformIcons || [];
    this.personalizedtags = this.configdata.tags || [];
    this.syncAuth();
    this.syncProfile();
    try {
      this.setMeta(
        this.configdata.metaData.title,
        this.configdata.metaData.description,
        this.configdata.metaData.keywords,
        this.configdata.metaData.icon
      );
    } catch (_) {}
    try {
      this.setMainProperty('');
    } catch (e) {
      console.error(e);
    }
    try {
      this.formattedTime = this.getFormattedTime(new Date());
      this.formattedDate = this.getFormattedDate(new Date());
    } catch (_) {}
    this.isloading = false;
  },
  mounted() {
    this.syncPageFromHash();
    window.addEventListener('hashchange', this.syncPageFromHash);
    window.addEventListener('leleo-auth-changed', this.syncAuth);
    window.addEventListener('leleo-profile-updated', this.syncProfile);
    window.addEventListener('leleo-music-updated', this.reloadMusicPlaylist);

    const tick = () => {
      try {
        this.formattedTime = this.getFormattedTime(new Date());
        this.formattedDate = this.getFormattedDate(new Date());
      } catch (_) {}
    };

    tick();
    this.isloading = false;

    try {
      try { this.dataConsole(); } catch (_) {}
      this.setMainProperty('');
    } catch (e) {
      console.error('页面初始化失败:', e);
    }

    setInterval(tick, 1000);
    this.getMusicInfo().then(() => this.setupAudioListener()).catch(() => {});
  },

  beforeUnmount() {
    window.removeEventListener('hashchange', this.syncPageFromHash);
    window.removeEventListener('leleo-auth-changed', this.syncAuth);
    window.removeEventListener('leleo-profile-updated', this.syncProfile);
    window.removeEventListener('leleo-music-updated', this.reloadMusicPlaylist);
  },

  beforeDestroy() {     //在组件销毁前移除事件监听器，防止内存泄漏。
    const el = this.$refs.audioPlayer;
    if (!el) return;
    el.removeEventListener('ended', this.nextTrack);
    el.removeEventListener('timeupdate', this.onAudioTimeUpdate);
    el.removeEventListener('loadedmetadata', this.onAudioMeta);
    el.removeEventListener('durationchange', this.onAudioMeta);
  },

  watch:{
    isClearScreen(val){
      if(!this.videosrc){
        return
      }
      if(val){
        this.$refs.VdPlayer.style.zIndex = 0; 
        this.$refs.VdPlayer.controls = true;
      }else{
        this.$refs.VdPlayer.style.zIndex = -100; 
        this.$refs.VdPlayer.controls = false;
      }
    },
    audioLoading(val){
      this.isPlaying = !val;
    }

  //若弹出框使得页面播放卡顿，可以先停止背景播放
  //   dialog1(val){
  //     if(val){
  //       this.$refs.VdPlayer.pause();
  //     }else{
  //       this.$refs.VdPlayer.play();
  //     }
  //  }
  },

  computed: {
    currentSong() {
      if (!this.musicinfo?.length) return null;
      return this.musicinfo[this.playlistIndex] || this.musicinfo[0];
    },
    audioPlayer() {
      return this.$refs.audioPlayer;
    },
    activeWorldModule() {
      const list = this.configdata.lifeModules || [];
      return list.find((m) => m.key === this.worldKey) || null;
    },
  },
  
  methods: {
    getCookie,setMeta,getFormattedTime,getFormattedDate,dataConsole,

    syncAuth() {
      this.isAdmin = !!getSiteAuth().ok;
    },
    onAuthChange(ok) {
      this.isAdmin = !!ok;
    },
    syncProfile() {
      const profile = loadProfile(this.configdata);
      this.profileAbout = {
        ...(this.configdata.aboutMe || {}),
        title: profile.about.title,
        summary: profile.about.summary,
      };
      this.personalizedtags = profile.tags;
      this.profileSkills = profile.skills;
    },
    onProfileSaved(profile) {
      this.profileAbout = {
        ...(this.configdata.aboutMe || {}),
        title: profile.about.title,
        summary: profile.about.summary,
      };
      this.personalizedtags = profile.tags;
      this.profileSkills = profile.skills;
    },

    syncPageFromHash() {
      const hash = (location.hash || '').replace(/^#\/?/, '');
      if (hash === 'planner' || hash === 'reviews') {
        // reviews 旧链接兼容跳转到学习计划本
        this.page = 'planner';
        this.worldKey = '';
        this.blogMode = 'list';
        this.blogPostId = '';
        return;
      }
      if (hash === 'blog' || hash === 'blog/') {
        this.page = 'blog';
        this.blogMode = 'list';
        this.blogPostId = '';
        this.worldKey = '';
        return;
      }
      if (hash === 'blog/write') {
        this.page = 'blog';
        this.blogMode = 'write';
        this.blogPostId = '';
        this.worldKey = '';
        return;
      }
      const blogEdit = hash.match(/^blog\/edit\/([\w-]+)$/);
      if (blogEdit) {
        this.page = 'blog';
        this.blogMode = 'edit';
        this.blogPostId = blogEdit[1];
        this.worldKey = '';
        return;
      }
      const blogMatch = hash.match(/^blog\/([\w-]+)$/);
      if (blogMatch && blogMatch[1] !== 'write') {
        this.page = 'blog';
        this.blogMode = 'read';
        this.blogPostId = blogMatch[1];
        this.worldKey = '';
        return;
      }
      const worldMatch = hash.match(/^world\/([\w-]+)$/);
      if (worldMatch) {
        const key = worldMatch[1];
        const exists = (this.configdata.lifeModules || []).some((m) => m.key === key);
        if (exists) {
          this.page = 'world';
          this.worldKey = key;
          this.blogMode = 'list';
          this.blogPostId = '';
          return;
        }
      }
      this.page = 'home';
      this.worldKey = '';
      this.blogMode = 'list';
      this.blogPostId = '';
    },
    openPlanner() {
      location.hash = 'planner';
      this.page = 'planner';
      this.worldKey = '';
      this.blogMode = 'list';
      this.blogPostId = '';
    },
    openReviews() {
      // 兼容旧事件名
      this.openPlanner();
    },
    openWorld(key) {
      location.hash = `world/${key}`;
      this.page = 'world';
      this.worldKey = key;
      this.blogMode = 'list';
      this.blogPostId = '';
    },
    openBlogHome() {
      location.hash = 'blog';
      this.page = 'blog';
      this.blogMode = 'list';
      this.blogPostId = '';
      this.worldKey = '';
    },
    openBlog(id) {
      location.hash = `blog/${id}`;
      this.page = 'blog';
      this.blogMode = 'read';
      this.blogPostId = id;
      this.worldKey = '';
    },
    writeBlog() {
      location.hash = 'blog/write';
      this.page = 'blog';
      this.blogMode = 'write';
      this.blogPostId = '';
      this.worldKey = '';
    },
    editBlog(id) {
      location.hash = `blog/edit/${id}`;
      this.page = 'blog';
      this.blogMode = 'edit';
      this.blogPostId = id;
      this.worldKey = '';
    },
    onBlogPublished(id) {
      if (id) {
        this.openBlog(id);
        return;
      }
      this.openBlogHome();
    },
    goHome() {
      location.hash = '';
      this.page = 'home';
      this.worldKey = '';
      this.blogMode = 'list';
      this.blogPostId = '';
    },

    setMainProperty(imageurl){
      const root = document.documentElement;
      try {
        let leleodata = this.getCookie("leleodata");
        if(leleodata){
          root.style.setProperty('--leleo-welcomtitle-color', `${leleodata.color.welcometitlecolor}`);
          root.style.setProperty('--leleo-vcard-color', `${leleodata.color.themecolor}`);
          root.style.setProperty('--leleo-brightness', `${leleodata.brightness}%`);
          root.style.setProperty('--leleo-blur', `${leleodata.blur}px`); 
        }else{
          root.style.setProperty('--leleo-welcomtitle-color', `${this.configdata.color.welcometitlecolor}`);
          root.style.setProperty('--leleo-vcard-color', `${this.configdata.color.themecolor}`);  
          root.style.setProperty('--leleo-brightness', `${this.configdata.brightness}%`);  
          root.style.setProperty('--leleo-blur', `${this.configdata.blur}px`);
        }
    
        let leleodatabackground = this.getCookie("leleodatabackground");
        // 一次性切换到新默认壁纸，避免旧 cookie 覆盖配置
        if (!localStorage.getItem('leleo-wallpaper-v4')) {
          eraseCookie('leleodatabackground');
          leleodatabackground = null;
          localStorage.setItem('leleo-wallpaper-v4', '1');
        }
        // setup 返回的 xs 在 Options API 里已自动解包，不要再取 .value
        const isMobile = !!this.xs;
        const bg = leleodatabackground
          ? (isMobile ? leleodatabackground.mobile : leleodatabackground.pc)
          : (isMobile ? this.configdata.background.mobile : this.configdata.background.pc);

        if (bg && bg.type === 'pic' && bg.datainfo && bg.datainfo.url) {
          root.style.setProperty('--leleo-background-image-url', `url('${bg.datainfo.url}')`);
          imageurl = bg.datainfo.url;
          return imageurl;
        }
        if (bg && bg.datainfo && bg.datainfo.url) {
          this.videosrc = bg.datainfo.url;
        }
      } catch (e) {
        console.error('设置主题/壁纸失败:', e);
        root.style.setProperty('--leleo-welcomtitle-color', '#FFFFFF');
        root.style.setProperty('--leleo-vcard-color', '#FFFFFF');
        root.style.setProperty('--leleo-brightness', '85%');
        root.style.setProperty('--leleo-blur', '5px');
        root.style.setProperty('--leleo-background-image-url', `url('${this.configdata.background.pc.datainfo.url}')`);
        return this.configdata.background.pc.datainfo.url;
      }
      return imageurl;
    },

    projectcardsShow(key){
      this.projectcards.forEach((item,index)=>{
        if(index!= key){
          item.show = false;
        }
      })
    },
    handleCancel(){
      this.dialog1 = false;
    },
    jump(url){
      window.open(url, '_blank').focus();
    },
    
    async getMusicInfo(){
      this.musicinfoLoading = true;
      try {
        const cfg = this.configdata.musicPlayer || {};
        const custom = seedFromConfig(cfg.customSongs || []);
        let list = [];

        if (cfg.localPlaylist) {
          try {
            const localRes = await fetch(cfg.localPlaylist);
            if (localRes.ok) {
              const local = await localRes.json();
              if (Array.isArray(local) && local.length) {
                list = seedFromConfig(local);
              }
            }
          } catch (e) {
            console.warn('本地歌单加载失败', e);
          }
        }

        if (!list.length && cfg.server && cfg.id) {
          const response = await fetch(
            `https://api.i-meto.com/meting/api?server=${cfg.server}&type=${cfg.type || 'playlist'}&id=${cfg.id}`
          );
          if (response.ok) {
            const remote = await response.json();
            if (Array.isArray(remote)) {
              list = seedFromConfig(remote.filter((s) => s?.title && s?.url));
            }
          }
        }

        const seed = [...custom, ...list];
        const stored = loadMusicPlaylist(seed);
        this.musicinfo = await hydrateMusicUrls(stored);
        if (this.playlistIndex >= this.musicinfo.length) {
          this.playlistIndex = 0;
        }
      } catch (error) {
        console.error('请求失败:', error);
        const fallback = seedFromConfig(this.configdata.musicPlayer?.customSongs || []);
        this.musicinfo = await hydrateMusicUrls(loadMusicPlaylist(fallback));
      } finally {
        this.musicinfoLoading = false;
        if (!Array.isArray(this.musicinfo)) this.musicinfo = [];
      }
    },
    async reloadMusicPlaylist() {
      const cfg = this.configdata.musicPlayer || {};
      const seed = seedFromConfig(cfg.customSongs || []);
      const stored = loadMusicPlaylist(seed);
      this.musicinfo = await hydrateMusicUrls(stored);
      if (this.playlistIndex >= this.musicinfo.length) {
        this.playlistIndex = Math.max(0, this.musicinfo.length - 1);
      }
    },
    async onAddSong(song) {
      const next = addMusicSong(this.musicinfo, song);
      this.musicinfo = await hydrateMusicUrls(next);
    },
    async onRemoveSong(id) {
      if (!id && id !== 0) return;
      if (!confirm('确定从歌单删除这首歌？')) return;
      const wasPlaying = this.isPlaying;
      const next = await removeMusicSong(this.musicinfo, id);
      this.musicinfo = await hydrateMusicUrls(next);
      if (this.playlistIndex >= this.musicinfo.length) {
        this.playlistIndex = Math.max(0, this.musicinfo.length - 1);
      }
      if (!this.musicinfo.length) {
        this.isPlaying = false;
        try { this.audioPlayer?.pause(); } catch (_) {}
        return;
      }
      if (wasPlaying) {
        await this.updateAudio();
      }
    },

    async resolveSongUrl(song) {
      if (!song) return '';
      if (song.url) return song.url;
      if (!song.hash) return '';
      try {
        const api = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${song.hash}&album_id=${song.album_id || 0}`;
        const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(api)}`;
        const res = await fetch(proxy);
        if (!res.ok) return '';
        const data = await res.json();
        const play = data?.data?.play_url || data?.data?.play_backup_url || '';
        if (play) {
          song.url = play;
          if (!song.pic && data?.data?.img) song.pic = data.data.img;
        }
        return play;
      } catch (e) {
        console.warn('解析播放地址失败', e);
        return '';
      }
    },
    musicplayershow(val) {
        this.ismusicplayer = val;
    },

    setupAudioListener() {
      if (!this.$refs.audioPlayer) return;
      this.$refs.audioPlayer.addEventListener('ended', this.nextTrack);
      this.$refs.audioPlayer.addEventListener('timeupdate', this.onAudioTimeUpdate);
      this.$refs.audioPlayer.addEventListener('loadedmetadata', this.onAudioMeta);
      this.$refs.audioPlayer.addEventListener('durationchange', this.onAudioMeta);
      try {
        const saved = Number(localStorage.getItem('leleo-music-volume'));
        if (Number.isFinite(saved) && saved >= 0 && saved <= 1) {
          this.audioVolume = saved;
        }
        this.$refs.audioPlayer.volume = this.audioVolume;
      } catch (_) {
        this.$refs.audioPlayer.volume = this.audioVolume;
      }
    },

    onAudioTimeUpdate() {
      const el = this.audioPlayer;
      if (!el) return;
      this.audioCurrentTime = el.currentTime || 0;
      if (Number.isFinite(el.duration) && el.duration > 0) {
        this.audioDuration = el.duration;
      }
      this.lyricIndex = findLyricIndex(this.lyricLines, this.audioCurrentTime);
    },
    onAudioMeta() {
      const el = this.audioPlayer;
      if (!el) return;
      this.audioDuration = Number.isFinite(el.duration) ? el.duration : 0;
      this.audioCurrentTime = el.currentTime || 0;
    },
    onSeek(time) {
      const el = this.audioPlayer;
      if (!el || !Number.isFinite(time)) return;
      el.currentTime = Math.max(0, Math.min(time, this.audioDuration || time));
      this.audioCurrentTime = el.currentTime;
      this.lyricIndex = findLyricIndex(this.lyricLines, this.audioCurrentTime);
    },
    onVolume(vol) {
      const next = Math.max(0, Math.min(1, Number(vol)));
      this.audioVolume = next;
      if (this.audioPlayer) this.audioPlayer.volume = next;
      try { localStorage.setItem('leleo-music-volume', String(next)); } catch (_) {}
    },
    async loadCurrentLyrics() {
      const song = this.currentSong;
      const token = `${song?.id || ''}|${song?.title || ''}|${this.playlistIndex}`;
      this._lyricsToken = token;
      this.lyricLines = [];
      this.lyricIndex = -1;
      if (!song) {
        this.lyricsLoading = false;
        return;
      }
      this.lyricsLoading = true;
      try {
        const lines = await resolveSongLyrics(song);
        if (this._lyricsToken !== token) return;
        this.lyricLines = lines;
        this.lyricIndex = findLyricIndex(this.lyricLines, this.audioCurrentTime || 0);
      } catch (_) {
        if (this._lyricsToken === token) this.lyricLines = [];
      } finally {
        if (this._lyricsToken === token) this.lyricsLoading = false;
      }
    },

    async togglePlay() {
      if (!this.audioPlayer || !this.currentSong) return;
      if (!this.isPlaying) {
        const url = await this.resolveSongUrl(this.currentSong);
        if (url && this.audioPlayer.src !== url) {
          this.audioPlayer.src = url;
        }
        if (!this.audioPlayer.src && !url) return;
        this.audioPlayer.volume = this.audioVolume;
        await this.audioPlayer.play().catch(() => {});
        this.isVdMuted = true;
        this.isPlaying = true;
        this.loadCurrentLyrics();
      } else {
        this.audioPlayer.pause();
        this.isVdMuted = false;
        this.isPlaying = false;
      }
    },
    previousTrack() {
      if (!this.musicinfo?.length) return;
      this.playlistIndex = this.playlistIndex > 0 ? this.playlistIndex - 1 : this.musicinfo.length - 1;
      this.updateAudio();
    },
    nextTrack() {
      if (!this.musicinfo?.length) return;
      this.playlistIndex = this.playlistIndex < this.musicinfo.length - 1 ? this.playlistIndex + 1 : 0;
      this.updateAudio();
    },
    async updateAudio() {
      if (!this.audioPlayer || !this.currentSong) return;
      this.audioLoading = true;
      this.audioCurrentTime = 0;
      this.audioDuration = 0;
      const url = await this.resolveSongUrl(this.currentSong);
      if (this.$refs.audiotitle) this.$refs.audiotitle.innerText = this.currentSong.title;
      if (this.$refs.audioauthor) this.$refs.audioauthor.innerText = this.currentSong.author;
      if (!url) {
        this.audioLoading = false;
        this.nextTrack();
        return;
      }
      this.audioPlayer.src = url;
      this.audioPlayer.volume = this.audioVolume;
      this.isPlaying = true;
      this.loadCurrentLyrics();
      try {
        await this.audioPlayer.play();
      } catch (_) {}
      this.audioLoading = false;
    },
    updateCurrentIndex(index) {
      this.playlistIndex = index;
      this.updateAudio();
    },
    updateIsPlaying(isPlaying) {
      this.isPlaying = isPlaying;
    },
    updateLyrics(lyrics){
      this.lyrics = lyrics;
    },
    // 监听等待事件（缓冲不足）
    onWaiting() {
      this.audioLoading = true;
    },
    // 监听可以播放事件（缓冲足够）
    onCanPlay() {
      this.audioLoading = false;
      this.onAudioMeta();
    },
    expandSwitch() {
      this.isExpanded = true;
    },
    collapseSwitch() {
      this.isExpanded = false;
    },
  }
};