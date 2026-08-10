<template>
  <v-app class="vapp-fullscreen-background" style="overflow: hidden;" :class="{ 'radius-before': !xs }"
  :style="xs?{height: '100%',width: '100%',top: '0',left:'0'}:(sm?{height: '98%',width: '98%',top: '1%',left:' 1%'}:{height: '96.6%',width: '99%',top: '1.7%',left:' 0.5%'})">
    <div class="loading" v-if="isloading">
      <loader></loader>
    </div>

    <video autoplay loop muted class="video-bg" id="bg-video" ref="VdPlayer"
    :style="xs?{height: '100%',width: '100%',top: '0',left:'0'}:(sm?{height: '98%',width: '98%',top: '1%',left:' 1%','border-radius': '16px'}:{height: '96.6%',width: '99%',top: '1.7%',left:' 0.5%','border-radius': '16px',})">
        <source :src=videosrc type="video/mp4">
    </video>

    <div class="floating-switch-container">
      <v-switch
        v-model="isClearScreen"
        inset
        :style="xs?{'transform':'scale(0.6) translateX(15%)'}:{}"
        class="floating-switch"
        @mouseover="expandSwitch"
        @mouseleave="collapseSwitch"
      ></v-switch>
    </div>
    
    <div v-show="!isClearScreen && page === 'home'" :style="xs||sm?{'overflow-y': 'auto','overflow-x': 'hidden'}:{}">
        <v-row>
            <v-col cols="12" md="4" lg="3" class="leleo-left" align="center">
              <div :style="xs||sm?{'font-size':'2.3rem'}:{'display':'none'}" class="leleo-left-welcome">
                <span class="welcome-halo" aria-hidden="true"></span>
                <span class="welcome-text">{{ configdata.welcometitle }}</span>
              </div>
              <div class="leleo-left-profile">
                <v-avatar class="leleo-left-avatar" :size="xs||sm?120:140" @mouseenter="musicplayershow(1)" @mouseleave="musicplayershow(0)">
                    <img
                      class="leleo-left-avatar-img"
                      :class="{'leleo-spin':isPlaying}"
                      alt="avatar"
                      :src="configdata.avatar"
                    >
                    <!-- 由于当ismusicplayer显示后，fadein无效果，所以需要设置一个过渡动画 -->
                    <transition name="fade">
                    <v-card v-show="ismusicplayer" class="musicplayer" :class="{'fade-in':ismusicplayer}" variant="tonal">
                        <div v-if="audioLoading" class="loading-spinner">
                            <v-progress-circular indeterminate></v-progress-circular>
                        </div>
                        <span ref="audiotitle" class="musicplayer-text"
                          style="top: 1.6rem;font-weight: bolder;"
                        >{{ musicinfo?.[0]?.title }}</span>
                        <span ref="audioauthor" class="musicplayer-text"
                          style="bottom: 1.4rem;"
                        >{{ musicinfo?.[0]?.author }}</span>
                        <audio v-show="false" ref="audioPlayer" :src="musicinfo?.[0]?.url"
                        @waiting="onWaiting"
                        @canplay="onCanPlay">
                        </audio>
                        <v-btn :size="xs||sm?22:30" color="#999999" icon @click="previousTrack()">
                        <v-icon>mdi-skip-previous</v-icon>
                        </v-btn>
                        <v-btn :size="xs||sm?35:48" color="#999999" icon @click="togglePlay()">
                        <v-icon>{{ isPlaying? 'mdi-pause' : 'mdi-play' }}</v-icon>
                        </v-btn>
                        <v-btn :size="xs||sm?22:30" color="#999999" icon @click="nextTrack()">
                        <v-icon>mdi-skip-next</v-icon>
                        </v-btn>
                    </v-card>
                    </transition>
                  </v-avatar>
                  <div class="leleo-left-username">{{ configdata.username }}</div>
              </div>

                  <button
                    type="button"
                    class="planner-entry building-solid"
                    :style="{ maxWidth: (xs?270:300) + 'px' }"
                    @click="openPlanner"
                  >
                    <span class="planner-entry__icon" aria-hidden="true">
                      <v-icon icon="mdi-calendar-month-outline" size="22"></v-icon>
                    </span>
                    <span class="planner-entry__copy">
                      <span class="planner-entry__main">学习计划本</span>
                      <span class="planner-entry__sub">按日期安排知识点 · 写计划日记</span>
                    </span>
                    <v-icon icon="mdi-chevron-right" size="20" class="planner-entry__arrow"></v-icon>
                  </button>

                <div
                  v-if="(personalizedtags && personalizedtags.length) || isAdmin"
                  class="tags-panel building-solid"
                  :style="{ maxWidth: (xs?270:300) + 'px' }"
                >
                  <div class="tags-panel__title">自我介绍</div>
                  <div class="tags-panel__list">
                    <span
                      v-for="item in personalizedtags"
                      :key="item"
                      class="tags-panel__chip"
                    >{{ item }}</span>
                    <span v-if="isAdmin && !(personalizedtags && personalizedtags.length)" class="tags-panel__chip">点左下角编辑资料添加</span>
                  </div>
                </div>

                <spinbuddy :music-playing="isPlaying" />

                <div class="leleo-left-chart building-solid">
                    <polarchart
                      :skills="profileSkills"
                      :style="xs||sm?{'height':'250px','width':'100%','max-width':'300px'}:{'height':'310px','width':'100%','max-width':'300px'}"
                    />
                </div>

                <v-container class="leleo-left-socialIconsContainer">
                    <v-row align="center" justify="center">
                    <v-col class="pa-1" cols="auto" v-for="item in socialPlatformIcons">
                        <v-btn :size="xs?25:33" variant="tonal" color="var(--leleo-vcard-color)"
                        class="ma-1 leleo-social-bticon"
                        icon
                        :href="item.link" target="_blank"
                        >
                    <v-icon :icon=item.icon :size="xs?20:25" class="social-bticon-icon"></v-icon></v-btn>
                    </v-col>
                    </v-row>

                    <v-row align="center" justify="center" class="setting">
                    <v-col class="ma-1" cols="auto">
                        <v-speed-dial
                            :location="xs||sm ?'top center':'right center'"
                            transition="slide-y-transition"
                        >
                        <template v-slot:activator="{ props: activatorProps }">
                            <v-fab style="width: 2.5rem;height: 2.5rem;" color="var(--leleo-vcard-color)"
                            variant="tonal"
                            v-bind="activatorProps"
                            icon="mdi-cog"
                            ></v-fab>
                        </template>
                        <v-btn variant="tonal" class="setbtn" key="1" icon="mdi-key-chain" @click="dialog1 = true" size="31" color="var(--leleo-vcard-color)"></v-btn>
                        <v-btn variant="tonal" class="setbtn" key="2" icon="mdi-information" @click="dialog2 = true" size="31" color="var(--leleo-vcard-color)"></v-btn>
                        <v-btn variant="tonal" class="setbtn" key="3" icon="$error" size="31" color="var(--leleo-vcard-color)"></v-btn>
                        </v-speed-dial>
                    </v-col>
                    </v-row>
                </v-container>
            </v-col>

            <v-col cols="12" md="8" lg="9" style="height: 100vh;" :style="xs||sm ?{}:{'overflow': 'auto'}">
                <homeright :configdata=configdata :formattedTime=formattedTime 
                :formattedDate=formattedDate :projectcards=projectcards
                @open-blog-home="openBlogHome"
                @open-blog="openBlog"
                ></homeright>
            </v-col>
        </v-row>
    </div>

    <plannerpage
      v-if="!isClearScreen && page === 'planner'"
      :background="configdata.pageBackgrounds?.planner || configdata.pageBackgrounds?.reviews"
      @back="goHome"
    />

    <authchip
      v-if="!isClearScreen && !isloading"
      :config="configdata"
      @change="onAuthChange"
    />

    <profileeditor
      v-if="!isClearScreen && !isloading"
      :is-admin="isAdmin"
      :page="page"
      :seed="configdata"
      @saved="onProfileSaved"
    />

    <worldpage
      v-if="!isClearScreen && page === 'world' && activeWorldModule"
      :module="activeWorldModule"
      :seed-modules="configdata.lifeModules || []"
      :is-admin="isAdmin"
      @back="goHome"
    />

    <blogpage
      v-if="!isClearScreen && page === 'blog'"
      :mode="blogMode"
      :post-id="blogPostId"
      :config="configdata"
      :is-admin="isAdmin"
      @back="goHome"
      @go-list="openBlogHome"
      @go-read="openBlog"
      @go-write="writeBlog"
      @go-edit="editBlog"
      @published="onBlogPublished"
    />

    <pageclimber
      v-if="!isClearScreen && page === 'home' && !isloading"
      :title="configdata.welcometitle"
      :music-playing="isPlaying"
    />

    <minimusic
      v-if="!isClearScreen && !isloading && page === 'home'"
      :title="currentSong?.title || '暂无歌曲'"
      :artist="currentSong?.author || '—'"
      :cover="currentSong?.pic || ''"
      :background="configdata.pageBackgrounds?.music"
      :is-playing="isPlaying"
      :loading="audioLoading || musicinfoLoading"
      :songs="musicinfo || []"
      :current-index="playlistIndex"
      :is-admin="isAdmin"
      :current-time="audioCurrentTime"
      :duration="audioDuration"
      :volume="audioVolume"
      :lyric-lines="lyricLines"
      :lyric-index="lyricIndex"
      :loading-lyrics="lyricsLoading"
      @toggle="togglePlay"
      @prev="previousTrack"
      @next="nextTrack"
      @select="updateCurrentIndex"
      @add-song="onAddSong"
      @remove-song="onRemoveSong"
      @seek="onSeek"
      @volume="onVolume"
    />

    <v-dialog
        v-model="dialog1"
        width="1000"
        heihght="700"
      >
      <v-card elevation="3" style="backdrop-filter: blur(10px);">
        <v-tabs
          v-model="tab"
          :items="tabs"
          align-tabs="center"
          height="60"
          slider-color=var(--leleo-vcard-color)
        >
          <template v-slot:tab="{ item }">
            <v-tab
              :prepend-icon="item.icon"
              :text="item.text"
              :value="item.value"
              class="text-none"
            ></v-tab>
          </template>
          
          <template v-slot:item="{ item }">
            <v-tabs-window-item :value="item.value" class="pa-4">
              <div v-if="item.value=='tab-3' && musicinfoLoading" class="loading-spinner" align="center">
                  <v-progress-circular indeterminate></v-progress-circular>
              </div>
              <!-- 通过组件绑定不同tab项的组件 -->
              <component v-if="item.value!='tab-3' || (item.value=='tab-3' && !musicinfoLoading)" :is=item.component @cancel="handleCancel" 
              :musicinfo="item.value=='tab-3'?musicinfo:[]"
              :currentIndex="item.value=='tab-3'?playlistIndex:null"
              :isPlaying="item.value=='tab-3'?isPlaying:null"
              :audioPlayer="item.value=='tab-3'?audioPlayer:null"
              :fromLyrics="item.value=='tab-3'?lyrics:null"
              :audioLoading="item.value=='tab-3'?audioLoading:null"
              @update:current-index="updateCurrentIndex"
              @update:is-playing="updateIsPlaying"
              @update:current-lyrics="updateLyrics"
              ></component>
            </v-tabs-window-item>
          </template>
        </v-tabs>
      </v-card>
      </v-dialog>

      <v-dialog
        v-model="dialog2"
        width="700"
        heihght="500"
      >
      <v-card class="ma-3 pa-2" hover
          variant="tonal"
          rounded="lg"
          style="text-align: center;backdrop-filter: blur(10px);"
        >
          <template v-slot:title >
            <span class="leleo-card-title">关于</span>
          </template>
          <div style="display: flex;flex-direction: column;align-items: center;">
            <v-card class="ma-3 pa-2" hover
              variant="tonal"
              max-width="400"
              rounded="lg"
              style="text-align: center;"
              >
              <template v-slot:subtitle>
                <span class="leleo-card-subtitle">本页基于以下技术及服务搭建</span>
              </template>
              <div>
                <v-tooltip  v-for="item in stackicons" v-model="item.model" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" :color=item.color rounded="lg" class="ma-1 stack-btn" size="35">
                      <v-icon size="25" color="white">{{item.icon}}</v-icon>
                    </v-btn>
                  </template>
                  <span>{{item.tip}}</span>
                </v-tooltip>
                <!-- 自定义 -->
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" rounded="lg" class="ma-1 stack-btn" size="35">
                      <v-avatar image="/img/stackicon/vite.svg" rounded="0" size="23"></v-avatar>
                    </v-btn>
                  </template>
                  <span>vite</span>
                </v-tooltip>
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" rounded="lg" class="ma-1 stack-btn" size="35" color="#254B7C">
                      <span style="font-size: 8px;font-weight: bolder;">{less}</span>
                    </v-btn>
                  </template>
                  <span>less</span>
                </v-tooltip>
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" rounded="lg" class="ma-1 stack-btn" size="35">
                      <v-avatar image="/img/stackicon/mdi.svg" rounded="0" size="35"></v-avatar>
                    </v-btn>
                  </template>
                  <span>mdi</span>
                </v-tooltip>
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" rounded="lg" class="ma-1 stack-btn" size="35">
                      <v-avatar image="/img/stackicon/chartjs.png" rounded="0" size="23"></v-avatar>
                    </v-btn>
                  </template>
                  <span>chartjs</span>
                </v-tooltip>
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" rounded="lg" class="ma-1 stack-btn" size="35" color="#0F1225">
                      <v-avatar image="/img/stackicon/meting.png" rounded="0" size="23"></v-avatar>
                    </v-btn>
                  </template>
                  <span>meting</span>
                </v-tooltip>
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" rounded="lg" class="ma-1 stack-btn" size="35" color="#070707">
                      <v-avatar image="/img/stackicon/uiverse.png" rounded="0" size="23"></v-avatar>
                    </v-btn>
                  </template>
                  <span>uiverse</span>
                </v-tooltip>
              </div>
            </v-card>

            <p class="ma-6">
                <span v-for="item in configdata.statement">
                  {{ item }}<br>
                </span>
            </p>
          </div>
        </v-card>
    </v-dialog>
  </v-app>
</template>

<script src="./app.js"></script>
<style>
  /* 全局样式：壁纸/布局/动画，避免 scoped 导致 ::before 与 Teleport 失效 */
  @import url(/css/app.less);
  @import url(/css/mobile.less);

  .tags-panel {
    width: 100%;
    max-width: 300px;
    min-height: 170px;
    padding: 1.35rem 1.05rem 1.4rem;
    box-sizing: border-box;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(var(--leleo-blur));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
    color: var(--leleo-vcard-color);
    text-align: left;
    display: flex;
    flex-direction: column;
  }

  .planner-entry {
    width: 100%;
    max-width: 300px;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    text-align: left;
    padding: 0.9rem 0.95rem;
    box-sizing: border-box;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: linear-gradient(135deg, rgba(255, 236, 160, 0.22), rgba(170, 240, 255, 0.16));
    backdrop-filter: blur(var(--leleo-blur));
    color: var(--leleo-vcard-color);
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease;
  }
  .planner-entry:hover {
    transform: translateY(-1px);
    background: linear-gradient(135deg, rgba(255, 236, 160, 0.3), rgba(170, 240, 255, 0.22));
  }
  .planner-entry__icon {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.14);
    flex-shrink: 0;
  }
  .planner-entry__copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
  }
  .planner-entry__main {
    font-size: 0.95rem;
    font-weight: 750;
  }
  .planner-entry__sub {
    font-size: 0.72rem;
    opacity: 0.78;
  }
  .planner-entry__arrow {
    opacity: 0.7;
    flex-shrink: 0;
  }

  .tags-panel__title {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    margin-bottom: 0.9rem;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
  }

  .tags-panel__list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    align-content: center;
    flex: 1 1 auto;
  }

  .tags-panel__chip {
    display: inline-flex;
    align-items: center;
    padding: 0.55rem 0.95rem;
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 650;
    letter-spacing: 0.02em;
    color: #fff;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.35);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .tags-panel__chip:hover {
    transform: scale(1.08);
    background: rgba(0, 0, 0, 0.4);
  }
</style>