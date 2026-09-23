/**
 * Crunchyroll-style Anime Streaming Client Application
 */

const API = {
  home: () => fetch('/api/anime/home').then(r => r.json()),
  search: (q, page=1) => fetch(`/api/anime/search?q=${encodeURIComponent(q)}&page=${page}`).then(r => r.json()),
  latest: (page=1) => fetch(`/api/anime/latest?page=${page}`).then(r => r.json()),
  categories: () => fetch('/api/anime/categories').then(r => r.json()),
  category: (id, page=1) => fetch(`/api/anime/category?id=${id}&page=${page}`).then(r => r.json()),
  post: (id) => fetch(`/api/anime/post/${id}`).then(r => r.json()),
  episodes: (id) => fetch(`/api/anime/post/${id}/episodes`).then(r => r.json()),
  servers: (pid, eid) => fetch(`/api/anime/post/${pid}/servers/${eid}`).then(r => r.json()),
  stream: (pid, sid) => fetch(`/api/anime/post/${pid}/stream/${sid}`).then(r => r.json()),
  
  // User & DB
  getProgress: (animeId) => fetch(`/api/user/progress/${animeId}`).then(r => r.json()),
  getContinueWatching: () => fetch('/api/user/progress/continue').then(r => r.json()),
  removeProgress: (animeId) => fetch(`/api/user/progress/${animeId}`, { method: 'DELETE' }).then(r => r.json()),
  saveProgress: (data) => fetch('/api/user/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getWatchlist: () => fetch('/api/user/watchlist').then(r => r.json()),
  toggleWatchlist: (data) => fetch('/api/user/watchlist/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  checkWatchlist: (animeId) => fetch(`/api/user/watchlist/check/${animeId}`).then(r => r.json()),
  
  // AniSkip
  getSkipTimes: (title, ep, dur) => fetch(`/api/skip/times?title=${encodeURIComponent(title)}&episode=${ep}&duration=${dur}`).then(r => r.json()),

  // Binge & Airing Today
  binge: (vibe='hype', length='any', gems=true) => fetch(`/api/anime/binge/recommendations?vibe=${encodeURIComponent(vibe)}&length=${encodeURIComponent(length)}&hidden_gems=${gems}`).then(r => r.json()),
  today: () => fetch('/api/anime/schedule/today').then(r => r.json())
};

// ============================================================================
// GLOBAL MEDIA CONTEXT LAYER (Netflix / Crunchyroll Playback Architecture)
// Decoupled Reactive State Machine orchestrating HLS, UI, network & persistence
// ============================================================================

class PlaybackContext {
  constructor() {
    this.state = {
      // 1. Playback State Slice
      playback: {
        currentTime: 0,
        duration: 0,
        playing: false,
        muted: false,
        volume: 1,
        playbackRate: 1,
        bufferedTime: 0,
        buffering: false,
        stalled: false
      },
      // 2. Content Metadata Slice
      content: {
        videoId: null,         // Episode ID
        seriesId: null,        // Anime ID
        title: '',             // Anime title
        episodeNum: '',
        episodeName: '',
        currentEpisodeIndex: -1,
        episodesList: [],
        audioTracks: [],       // [{ id, lang: 'sub'|'dub', name, serverId }]
        activeAudioTrack: null,
        subtitleTracks: [],    // [{ id, lang, label, src }]
        activeSubtitleId: null,
        poster: ''
      },
      // 3. Interactive Markers Slice
      markers: {
        introStartTime: null,
        introEndTime: null,
        creditsStartTime: null,
        showSkipIntroButton: false,
        showSkipOutroButton: false,
        autoSkipEnabled: localStorage.getItem('anime_auto_skip') !== 'false'
      },
      // 4. Network Resilience & Buffer Layer Slice
      network: {
        bufferStalls: 0,
        droppedFrames: 0,
        totalFrames: 0,
        currentQualityIndex: -1, // -1 = Auto
        qualityLevels: [],       // [{ index, height, bitrate, label }]
        effectiveBandwidth: null,
        isPrefetchingNext: false,
        prefetchedEpisode: null
      }
    };

    this._listeners = new Set();
    this.video = null;
    this.hls = null;
    this._heartbeatTimer = null;
    this._networkMonitorTimer = null;
    this._lastHeartbeatPos = 0;
    this._stallTimestamps = [];
    this._resumeTarget = 0;
    this._resumeApplied = false;

    // Cross-tab and exit hooks for persistence
    this._boundSaveOnUnmount = this.saveOnUnmount.bind(this);
    window.addEventListener('pagehide', this._boundSaveOnUnmount);
    window.addEventListener('beforeunload', this._boundSaveOnUnmount);
  }

  // Subscribe to state updates (Returns unsubscribe function)
  subscribe(fn) {
    this._listeners.add(fn);
    fn(this.state, 'init');
    return () => this._listeners.delete(fn);
  }

  notify(sliceName) {
    for (const fn of this._listeners) {
      try {
        fn(this.state, sliceName);
      } catch (err) {
        console.error("[PlaybackContext] Listener error:", err);
      }
    }
  }

  // 1. Content Metadata Methods
  setContentMetadata(meta) {
    Object.assign(this.state.content, meta);
    this.notify('content');
  }

  setAudioTracks(tracks, activeId) {
    this.state.content.audioTracks = tracks;
    this.state.content.activeAudioTrack = activeId || (tracks[0]?.id ?? null);
    this.notify('content');
  }

  setResumeTarget(seconds) {
    this._resumeTarget = seconds;
    this._resumeApplied = false;
    this._tryResume();
  }

  _tryResume() {
    if (!this._resumeApplied && this._resumeTarget > 5 && this.video && this.video.duration && this.video.readyState >= 1) {
      this._resumeApplied = true;
      this.video.currentTime = this._resumeTarget;
      toast(`Resumed playback at ${formatTime(this._resumeTarget)}`, 2500);
    }
  }

  // 2. Interactive Markers Methods
  setMarkers(markers) {
    this.state.markers.introStartTime = markers.introStartTime ?? null;
    this.state.markers.introEndTime = markers.introEndTime ?? null;
    this.state.markers.creditsStartTime = markers.creditsStartTime ?? null;
    this._checkMarkers(this.state.playback.currentTime);
    this.notify('markers');
  }

  toggleAutoSkip(enabled) {
    const val = (enabled !== undefined) ? !!enabled : !this.state.markers.autoSkipEnabled;
    this.state.markers.autoSkipEnabled = val;
    localStorage.setItem('anime_auto_skip', String(val));
    toast(val ? "⚡ Auto-Skip Enabled" : "Manual Skip Enabled", 1500);
    this.notify('markers');
  }

  skipIntro() {
    if (this.state.markers.introEndTime !== null && this.video) {
      this.seek(this.state.markers.introEndTime + 0.5);
      this.state.markers.showSkipIntroButton = false;
      this.notify('markers');
      toast("⚡ Skipped Intro", 1500);
    }
  }

  skipOutro() {
    if (this.video && this.state.playback.duration > 0) {
      this.seek(this.state.playback.duration - 1);
      this.state.markers.showSkipOutroButton = false;
      this.notify('markers');
      toast("⚡ Skipped Outro", 1500);
    }
  }

  _checkMarkers(t) {
    const m = this.state.markers;
    const dur = this.state.playback.duration;

    // Intro check
    if (m.introStartTime !== null && m.introEndTime !== null) {
      if (t >= m.introStartTime && t < m.introEndTime) {
        if (m.autoSkipEnabled) {
          this.seek(m.introEndTime + 0.5);
          m.showSkipIntroButton = false;
          toast("⚡ Auto-skipped Intro", 2000);
          return;
        } else {
          m.showSkipIntroButton = true;
        }
      } else {
        m.showSkipIntroButton = false;
      }
    } else {
      m.showSkipIntroButton = false;
    }

    // Credits / Outro check
    if (m.creditsStartTime !== null && dur > 0) {
      if (t >= m.creditsStartTime && t < (dur - 5)) {
        if (m.autoSkipEnabled) {
          this.seek(dur - 2);
          m.showSkipOutroButton = false;
          toast("⚡ Auto-skipped Outro", 2000);
          return;
        } else {
          m.showSkipOutroButton = true;
        }
      } else {
        m.showSkipOutroButton = false;
      }
    } else {
      m.showSkipOutroButton = false;
    }
  }

  // 3. Playback Controls
  play() {
    if (this.video) {
      this.video.play().catch(() => {});
    }
  }

  pause() {
    if (this.video) {
      this.video.pause();
    }
  }

  togglePlay() {
    if (this.video) {
      if (this.video.paused) {
        this.play();
        showPlayPulse('▶');
      } else {
        this.pause();
        showPlayPulse('⏸');
      }
    }
  }

  seek(seconds) {
    if (this.video && this.state.playback.duration > 0) {
      const target = Math.max(0, Math.min(this.state.playback.duration, seconds));
      this.video.currentTime = target;
      this.state.playback.currentTime = target;
      this.notify('playback');
    }
  }

  seekRelative(delta) {
    if (this.video && this.state.playback.duration > 0) {
      this.seek(this.video.currentTime + delta);
    }
  }

  setVolume(vol) {
    if (this.video) {
      const v = Math.max(0, Math.min(1, vol));
      this.video.volume = v;
      this.state.playback.volume = v;
      if (v > 0 && this.state.playback.muted) {
        this.setMuted(false);
      }
      this.notify('playback');
    }
  }

  setMuted(m) {
    if (this.video) {
      this.video.muted = !!m;
      this.state.playback.muted = !!m;
      this.notify('playback');
    }
  }

  toggleMute() {
    this.setMuted(!this.state.playback.muted);
  }

  setPlaybackRate(rate) {
    const r = parseFloat(rate) || 1;
    if (this.video) {
      this.video.playbackRate = r;
      this.state.playback.playbackRate = r;
      this.notify('playback');
      toast(`Speed: ${r}x`, 1000);
    }
  }

  // 4. Network Resilience & Adaptive Quality Overrides
  setQuality(levelIndex) {
    const idx = parseInt(levelIndex, 10);
    this.state.network.currentQualityIndex = idx;
    if (this.hls) {
      this.hls.currentLevel = idx;
      const label = idx === -1 ? "Auto" : (this.state.network.qualityLevels.find(l => l.index === idx)?.label || `${idx}p`);
      toast(`Quality set to ${label}`, 1500);
    }
    this.notify('network');
  }

  onBufferStall() {
    const now = Date.now();
    this._stallTimestamps.push(now);
    // keep only stalls within last 30s
    this._stallTimestamps = this._stallTimestamps.filter(t => now - t <= 30000);
    this.state.network.bufferStalls = this._stallTimestamps.length;

    console.warn(`[PlaybackContext] Buffer stall detected. Count in last 30s: ${this._stallTimestamps.length}`);
    this.state.playback.buffering = true;
    this.state.playback.stalled = true;
    this.notify('playback');

    // Adaptive Quality Override: if mobile network degradation detected (2+ stalls),
    // proactively step down the resolution to prevent spinning loader wheel freeze!
    if (this._stallTimestamps.length >= 2 && this.hls && this.hls.levels && this.hls.levels.length > 1) {
      if (this.state.network.currentQualityIndex === -1 || this.state.network.currentQualityIndex > 0) {
        const targetLevel = Math.max(0, (this.hls.currentLevel > 0 ? this.hls.currentLevel - 1 : 0));
        console.warn(`[PlaybackContext] Downshifting ABR level to ${targetLevel} to relieve network stall.`);
        this.hls.currentLevel = targetLevel;
        this.state.network.currentQualityIndex = targetLevel;
        toast(`⚡ Network unstable: Auto-adjusting quality to maintain smooth playback`, 2500);
        this.notify('network');
      }
    }
  }

  _startNetworkMonitor() {
    this._stopNetworkMonitor();
    this._networkMonitorTimer = setInterval(() => {
      if (!this.video || this.video.paused) return;

      // Monitor frame drops
      if (typeof this.video.getVideoPlaybackQuality === 'function') {
        const q = this.video.getVideoPlaybackQuality();
        if (q) {
          const droppedDelta = q.droppedVideoFrames - this.state.network.droppedFrames;
          const totalDelta = q.totalVideoFrames - this.state.network.totalFrames;
          this.state.network.droppedFrames = q.droppedVideoFrames;
          this.state.network.totalFrames = q.totalVideoFrames;

          if (totalDelta > 30 && (droppedDelta / totalDelta) > 0.18) {
            console.warn(`[PlaybackContext] High frame drop rate detected (${Math.round((droppedDelta/totalDelta)*100)}%).`);
            // trigger auto downshift if in auto mode
            if (this.hls && this.state.network.currentQualityIndex === -1 && this.hls.currentLevel > 0) {
              this.hls.currentLevel = Math.max(0, this.hls.currentLevel - 1);
            }
          }
        }
      }
    }, 3000);
  }

  _stopNetworkMonitor() {
    if (this._networkMonitorTimer) {
      clearInterval(this._networkMonitorTimer);
      this._networkMonitorTimer = null;
    }
  }

  // Pre-fetching Strategy (when episode reaches ~88-90% completion)
  preFetchNextEpisode() {
    const content = this.state.content;
    const nextIdx = content.currentEpisodeIndex + 1;
    if (nextIdx >= content.episodesList.length || this.state.network.isPrefetchingNext) {
      return;
    }

    this.state.network.isPrefetchingNext = true;
    const nextEp = content.episodesList[nextIdx];
    console.log(`[PlaybackContext] Pre-fetching manifest & stream for Next Episode #${nextEp.num}...`);

    API.servers(content.seriesId, nextEp.id).then(res => {
      const servers = res.servers || [];
      const prefLang = content.activeAudioTrack?.lang || 'sub';
      const targetSrv = servers.find(s => s.lang === prefLang) || servers[0];
      if (targetSrv) {
        return API.stream(content.seriesId, targetSrv.id).then(streamData => {
          this.state.network.prefetchedEpisode = {
            episode: nextEp,
            server: targetSrv,
            streamUrl: streamData.proxy_url
          };
          console.log(`[PlaybackContext] Successfully pre-warmed Next Episode #${nextEp.num} stream URL!`);
        });
      }
    }).catch(err => {
      console.warn("[PlaybackContext] Next episode pre-fetch error:", err);
    }).finally(() => {
      this.state.network.isPrefetchingNext = false;
    });
  }

  // 5. Session & Persistence Layer (Heartbeat & Exit Beacon)
  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      this.triggerHeartbeat();
    }, 10000); // 10-second sync
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  triggerHeartbeat(isFinished = false) {
    if (!this.video || !this.state.content.videoId) return;
    const pos = isFinished ? this.state.playback.duration : this.video.currentTime;
    const dur = this.state.playback.duration;
    if (pos > 5 && dur > 0) {
      if (!isFinished && Math.abs(pos - this._lastHeartbeatPos) < 2) return;
      this._lastHeartbeatPos = pos;

      const payload = {
        anime_id: String(this.state.content.seriesId || ''),
        ep_id: String(this.state.content.videoId || ''),
        position: pos,
        duration: dur,
        anime_title: this.state.content.title || '',
        anime_poster: this.state.content.poster || '',
        ep_num: String(this.state.content.episodeNum || ''),
        ep_name: this.state.content.episodeName || ''
      };

      API.saveProgress(payload).catch(() => {});
    }
  }

  saveOnUnmount() {
    if (this.video && this.video.currentTime > 5 && this.state.content.videoId) {
      const payload = JSON.stringify({
        anime_id: String(this.state.content.seriesId || ''),
        ep_id: String(this.state.content.videoId || ''),
        position: this.video.currentTime,
        duration: this.video.duration || 0,
        anime_title: this.state.content.title || '',
        anime_poster: this.state.content.poster || '',
        ep_num: String(this.state.content.episodeNum || ''),
        ep_name: this.state.content.episodeName || ''
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/user/progress', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/user/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    }
  }

  // 6. Media Element & HLS Binding
  attachMedia(videoElement, hlsInstance) {
    this.detachMedia(false);
    this.video = videoElement;
    this.hls = hlsInstance;
    this._resumeApplied = false;

    // Reset runtime states
    this.state.playback.buffering = false;
    this.state.playback.stalled = false;
    this.state.network.bufferStalls = 0;
    this.state.network.droppedFrames = 0;

    // Video Element Listeners
    this.video.addEventListener('loadedmetadata', () => {
      this.state.playback.duration = this.video.duration || 0;
      this._tryResume();
      this.notify('playback');
    });

    this.video.addEventListener('canplay', () => {
      this.state.playback.buffering = false;
      this.state.playback.stalled = false;
      this._tryResume();
      this.notify('playback');
    });

    this.video.addEventListener('timeupdate', () => {
      const t = this.video.currentTime;
      this.state.playback.currentTime = t;
      this._checkMarkers(t);

      // Pre-fetching check when reaching ~88% of duration
      if (this.state.playback.duration > 60 && (t / this.state.playback.duration) >= 0.88 && !this.state.network.isPrefetchingNext && !this.state.network.prefetchedEpisode) {
        this.preFetchNextEpisode();
      }

      this.notify('playback');
    });

    this.video.addEventListener('play', () => {
      this.state.playback.playing = true;
      this.state.playback.buffering = false;
      this.notify('playback');
    });

    this.video.addEventListener('pause', () => {
      this.state.playback.playing = false;
      this.triggerHeartbeat(false);
      this.notify('playback');
    });

    this.video.addEventListener('waiting', () => {
      this.state.playback.buffering = true;
      this.notify('playback');
    });

    this.video.addEventListener('seeking', () => {
      this.state.playback.buffering = true;
      this.notify('playback');
    });

    this.video.addEventListener('seeked', () => {
      this.state.playback.buffering = false;
      this.notify('playback');
    });

    this.video.addEventListener('progress', () => {
      if (this.video.buffered && this.video.buffered.length > 0) {
        this.state.playback.bufferedTime = this.video.buffered.end(this.video.buffered.length - 1);
        this.notify('playback');
      }
    });

    this.video.addEventListener('ended', () => {
      this.state.playback.playing = false;
      this.triggerHeartbeat(true);
      this.notify('playback');

      // Next Episode Autoplay Transition
      const content = this.state.content;
      const nextIdx = content.currentEpisodeIndex + 1;
      if (nextIdx < content.episodesList.length) {
        const nextEp = content.episodesList[nextIdx];
        toast(`Episode ended. Autoplaying #${nextEp.num}...`, 2500);
        setTimeout(() => {
          location.hash = `#/watch/${content.seriesId}?ep=${nextEp.id}`;
        }, 1200);
      }
    });

    // Hls.js Events
    if (this.hls) {
      this.hls.on(Hls.Events.MANIFEST_PARSED, (evt, data) => {
        if (this.hls.levels && this.hls.levels.length) {
          this.state.network.qualityLevels = this.hls.levels.map((lvl, idx) => ({
            index: idx,
            height: lvl.height || 0,
            bitrate: lvl.bitrate || 0,
            label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`
          }));
        }
        this.notify('network');
        this.video.play().catch(() => {});
      });

      this.hls.on(Hls.Events.BUFFER_STALLED, () => {
        this.onBufferStall();
      });

      this.hls.on(Hls.Events.LEVEL_SWITCHED, (evt, data) => {
        this.state.network.currentQualityIndex = this.hls.autoLevelEnabled ? -1 : data.level;
        this.notify('network');
      });

      this.hls.on(Hls.Events.ERROR, (evt, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("[PlaybackContext] HLS fatal network error, recovering...");
              this.hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("[PlaybackContext] HLS fatal media error, recovering...");
              this.hls.recoverMediaError();
              break;
            default:
              console.error("[PlaybackContext] Unrecoverable HLS error:", data);
              this.detachMedia();
              break;
          }
        }
      });
    }

    this._startHeartbeat();
    this._startNetworkMonitor();
  }

  detachMedia(cleanState = true) {
    this.saveOnUnmount();
    this._stopHeartbeat();
    this._stopNetworkMonitor();

    if (this.hls) {
      try { this.hls.destroy(); } catch (e) {}
      this.hls = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }

    if (cleanState) {
      this.state.playback.playing = false;
      this.state.playback.currentTime = 0;
      this.state.playback.duration = 0;
      this.state.playback.buffering = false;
      this.state.playback.stalled = false;
      this.state.markers.showSkipIntroButton = false;
      this.state.markers.showSkipOutroButton = false;
      this.state.network.prefetchedEpisode = null;
      this.notify('playback');
    }
  }
}

// Global Media Context Singleton
const mediaContext = new PlaybackContext();

function toggleHelpModal() {
  const m = document.getElementById('helpModal');
  if (!m) return;
  m.style.display = (m.style.display === 'none' || !m.style.display) ? 'flex' : 'none';
}

function togglePlayerSettingsModal() {
  const m = document.getElementById('playerSettingsModal');
  if (!m) return;
  const isOpening = (m.style.display === 'none' || !m.style.display);
  m.style.display = isOpening ? 'flex' : 'none';
  if (isOpening) {
    syncPlayerSettingsSheet();
  }
}

function syncPlayerSettingsSheet() {
  // Sync quality pills
  const qContainer = document.getElementById('sheetQualityPills');
  if (qContainer) {
    const n = mediaContext.state.network;
    const curQ = n.currentQualityIndex;
    let html = `<button class="sheet-pill ${curQ === -1 ? 'active' : ''}" data-quality="-1" onclick="mediaContext.setQuality(-1); syncPlayerSettingsSheet();">Auto</button>`;
    if (n.qualityLevels && n.qualityLevels.length > 0) {
      html += n.qualityLevels.map(lvl => `
        <button class="sheet-pill ${curQ === lvl.index ? 'active' : ''}" data-quality="${lvl.index}" onclick="mediaContext.setQuality(${lvl.index}); syncPlayerSettingsSheet();">
          ${lvl.label}
        </button>
      `).join('');
    }
    qContainer.innerHTML = html;
  }

  // Sync speed pills
  const speedContainer = document.getElementById('sheetSpeedPills');
  if (speedContainer) {
    const curSpeed = mediaContext.state.playback.playbackRate;
    const pills = speedContainer.querySelectorAll('.sheet-pill');
    pills.forEach(pill => {
      const spd = parseFloat(pill.dataset.speed);
      pill.classList.toggle('active', Math.abs(spd - curSpeed) < 0.05);
      pill.onclick = () => {
        mediaContext.setPlaybackRate(spd);
        syncPlayerSettingsSheet();
      };
    });
  }

  // Sync auto-skip switch
  const autoSkipSw = document.getElementById('sheetAutoSkipToggle');
  if (autoSkipSw) {
    autoSkipSw.checked = mediaContext.state.markers.autoSkipEnabled;
    autoSkipSw.onchange = () => {
      mediaContext.toggleAutoSkip(autoSkipSw.checked);
    };
  }
}

function toggleTheaterMode() {
  const c = document.querySelector('.watch-container');
  if (c) c.classList.toggle('theater-mode');
}

function showTapRipple(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('animate');
  void el.offsetWidth;
  el.classList.add('animate');
  setTimeout(() => el.classList.remove('animate'), 350);
}

function showPlayPulse(icon = '▶') {
  const p = document.getElementById('playPulse');
  if (!p) return;
  p.textContent = icon;
  p.classList.remove('animate');
  void p.offsetWidth;
  p.classList.add('animate');
  setTimeout(() => p.classList.remove('animate'), 300);
}

function togglePlay() {
  mediaContext.togglePlay();
}

function seekBy(sec) {
  mediaContext.seekRelative(sec);
}

function toast(msg, ms = 3000) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

window.removeCW = async function(animeId) {
  try {
    await API.removeProgress(animeId);
    toast("Removed from Continue Watching");
    const el = document.querySelector(`.cw-card[data-id="${animeId}"]`);
    if (el) {
      el.style.transition = 'all 0.25s ease';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.8)';
      setTimeout(() => {
        el.remove();
        const carousel = document.querySelector('.cw-carousel');
        if (carousel && !carousel.children.length) {
          carousel.closest('.section')?.remove();
        }
      }, 250);
    }
  } catch(e) {
    toast("Failed to remove progress");
  }
};

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function render(html) {
  const main = document.getElementById('content');
  main.innerHTML = html;
  window.scrollTo(0, 0);
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return "00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setActiveNav(navName) {
  document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === navName);
  });
}

// --------------------------------------------------------------------------
// Views
// --------------------------------------------------------------------------

// 1. Home View
async function viewHome() {
  setActiveNav('home');
  render(`
    <div style="display:flex;justify-content:center;padding:80px 0;">
      <div class="spinner"></div>
    </div>
  `);

  try {
    const [homeData, cwData] = await Promise.all([
      API.home(),
      API.getContinueWatching().catch(() => ({ items: [] }))
    ]);

    const data = homeData.data || {};
    const featured = data.featured || {};
    const sections = data.sections || [];
    const continueItems = cwData.items || [];

    let html = '';

    // Featured Hero Banner
    if (featured.title) {
      html += `
        <div class="hero-banner" style="background-image: url('${featured.poster || ''}')">
          <div class="hero-backdrop"></div>
          <div class="hero-content">
            <div class="hero-badges">
              <span class="badge orange">FEATURED</span>
              ${featured.score ? `<span class="badge gold">★ ${featured.score}</span>` : ''}
              ${featured.type ? `<span class="badge">${featured.type}</span>` : ''}
              ${featured.age ? `<span class="badge">${featured.age}</span>` : ''}
            </div>
            <h1 class="hero-title">${esc(featured.title)}</h1>
            <p class="hero-overview">${esc(featured.overview || 'Explore the acclaimed anime series now streaming in full HD quality.')}</p>
            <div class="hero-actions">
              <a href="#/watch/${featured.id}" class="btn btn-primary">
                ▶ Watch Now
              </a>
              <a href="#/post/${featured.id}" class="btn btn-secondary">
                Details & Episodes
              </a>
            </div>
          </div>
        </div>
      `;
    }

    // Continue Watching Row
    if (continueItems.length > 0) {
      html += `
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Continue Watching</h2>
          </div>
          <div class="carousel cw-carousel">
            ${continueItems.map(item => {
              const pct = item.duration ? Math.min(100, Math.round((item.position / item.duration) * 100)) : 0;
              return `
                <div class="cw-card" data-id="${item.anime_id}">
                  <button class="cw-remove-btn" title="Remove from Continue Watching" onclick="removeCW('${item.anime_id}')">✕</button>
                  <a href="#/watch/${item.anime_id}?ep=${item.ep_id}">
                    <div class="cw-poster">
                      <img src="${item.anime_poster || ''}" alt="" onerror="this.src='/static/placeholder.png'">
                      <div class="cw-play-overlay">
                        <div class="cw-play-icon">▶</div>
                      </div>
                      <div class="cw-progress-bar">
                        <div class="cw-progress-fill" style="width: ${pct}%"></div>
                      </div>
                    </div>
                    <div class="cw-info">
                      <div class="cw-title">${esc(item.anime_title || 'Anime')}</div>
                      <div class="cw-sub">Ep ${item.ep_num || '?'} · ${Math.round(item.position / 60)}m / ${Math.round(item.duration / 60)}m (${pct}%)</div>
                    </div>
                  </a>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      `;
    }

    // Dynamic Catalog Sections (Spotlight, Trending, Top Airing)
    sections.forEach(sec => {
      const posts = sec.posts || [];
      if (!posts.length) return;
      html += `
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">${esc(sec.name || 'Featured Collection')}</h2>
          </div>
          <div class="carousel">
            ${posts.map(p => `
              <a class="anime-card" href="#/post/${p.id}">
                <div class="card-poster">
                  <img src="${p.poster || ''}" loading="lazy" alt="" onerror="this.style.display='none'">
                  ${p.score ? `<div class="card-score">★ ${p.score}</div>` : ''}
                </div>
                <div class="card-info">
                  <div class="card-title">${esc(p.title || '')}</div>
                  <div class="card-meta">${esc([p.type, p.age].filter(Boolean).join(' · '))}</div>
                </div>
              </a>
            `).join('')}
          </div>
        </section>
      `;
    });

    render(html);
  } catch (err) {
    render(`
      <div style="text-align:center;padding:60px 20px;">
        <h2>Failed to load catalog</h2>
        <p style="color:var(--text-dim);margin:10px 0 20px;">${esc(err.message)}</p>
        <button class="btn btn-primary" onclick="viewHome()">Retry</button>
      </div>
    `);
  }
}

// 2. Post Details View
async function viewPost(id) {
  setActiveNav('');
  render(`
    <div style="display:flex;justify-content:center;padding:80px 0;">
      <div class="spinner"></div>
    </div>
  `);

  try {
    const [postData, episodesData, progressData, watchlistData] = await Promise.all([
      API.post(id),
      API.episodes(id).catch(() => ({ episodes: [] })),
      API.getProgress(id).catch(() => ({ progress: {} })),
      API.checkWatchlist(id).catch(() => ({ in_watchlist: false }))
    ]);

    const post = postData.data || {};
    const episodes = episodesData.episodes || [];
    const progressMap = progressData.progress || {};
    let inWatchlist = watchlistData.in_watchlist;

    const seasons = post.seasons || [];
    const genres = (post.genres || '').split(',').map(g => g.trim()).filter(Boolean);

    // Compute continue watching episode and label
    let continueEp = episodes[0];
    let continueLabel = '▶ Start Watching Episode 1';
    let latestWatched = null;
    let latestTime = 0;

    for (const ep of episodes) {
      const p = progressMap[String(ep.id)];
      if (p && p.updated_at > latestTime) {
        latestTime = p.updated_at;
        latestWatched = { ep, p };
      }
    }

    if (latestWatched) {
      const { ep, p } = latestWatched;
      continueEp = ep;
      const m = Math.floor(p.position / 60);
      const s = String(Math.floor(p.position % 60)).padStart(2, '0');
      continueLabel = `▶ Resume Episode ${ep.num || '1'} (${m}:${s})`;
    }

    let html = `
      <a href="#/" style="display:inline-flex;align-items:center;gap:6px;color:var(--text-dim);font-weight:600;margin-bottom:20px;">
        ← Back to Catalog
      </a>

      <div class="detail-view">
        <div>
          <div class="detail-poster">
            <img src="${post.poster || ''}" alt="" onerror="this.src='/static/placeholder.png'">
          </div>
          <button id="btnWatchlist" class="btn ${inWatchlist ? 'btn-secondary' : 'btn-primary'}" style="width:100%;margin-top:16px;">
            ${inWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
          </button>
        </div>

        <div class="detail-header">
          <div class="hero-badges">
            <span class="badge orange">${post.type || 'Anime'}</span>
            ${post.score ? `<span class="badge gold">★ ${post.score}</span>` : ''}
            ${post.rating ? `<span class="badge">${post.rating}</span>` : ''}
            ${post.status ? `<span class="badge">${post.status}</span>` : ''}
          </div>
          <h1>${esc(post.title)}</h1>
          
          <div class="detail-genres">
            ${genres.map(g => `<span class="detail-genre-chip">${esc(g)}</span>`).join('')}
          </div>

          <div style="display:flex;gap:24px;margin-bottom:18px;color:var(--text-dim);font-size:14px;">
            ${post.premiered ? `<div><strong>Premiered:</strong> ${esc(post.premiered)}</div>` : ''}
            ${post.runtime ? `<div><strong>Runtime:</strong> ${esc(post.runtime)}</div>` : ''}
          </div>

          <p class="detail-synopsis">${esc(post.overview || 'No synopsis available.')}</p>

          ${episodes.length ? `
            <a href="#/watch/${id}?ep=${continueEp.id}" class="btn btn-primary" style="padding:14px 28px;font-size:16px;">
              ${esc(continueLabel)}
            </a>
          ` : ''}
        </div>
      </div>
    `;

    // Seasons & Related
    if (seasons.length > 0) {
      html += `
        <div style="margin-top:36px;">
          <h3 style="font-size:18px;margin-bottom:12px;">Seasons & Related Titles</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${seasons.map(s => `
              <a href="#/post/${s.id}" class="btn-pill">
                ${esc(s.title || 'Season ' + s.id)}
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Episodes Section
    html += `
      <section class="episodes-section">
        <div class="episodes-controls">
          <h2 class="section-title">Episodes (${episodes.length})</h2>
          <input type="text" id="epSearch" class="ep-filter-input" placeholder="Filter episodes (e.g. 1, 12)...">
        </div>
        <div class="episodes-grid" id="epGrid">
          ${episodes.map(ep => {
            const prog = progressMap[ep.id];
            const isWatched = prog && prog.duration && (prog.position / prog.duration) > 0.85;
            return `
              <a class="ep-card ${isWatched ? 'watched' : ''}" href="#/watch/${id}?ep=${ep.id}">
                <div class="ep-num">EPISODE ${ep.num || '?'}</div>
                <div class="ep-name" title="${esc(ep.name)}">${esc(ep.name || 'Episode ' + ep.num)}</div>
              </a>
            `;
          }).join('')}
        </div>
      </section>
    `;

    render(html);

    // Watchlist button handler
    document.getElementById('btnWatchlist').onclick = async () => {
      const res = await API.toggleWatchlist({
        anime_id: String(id),
        anime_title: post.title || '',
        anime_poster: post.poster || '',
        anime_type: post.type || ''
      });
      inWatchlist = res.added;
      const btn = document.getElementById('btnWatchlist');
      btn.className = `btn ${inWatchlist ? 'btn-secondary' : 'btn-primary'}`;
      btn.textContent = inWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist';
      toast(inWatchlist ? 'Added to Watchlist' : 'Removed from Watchlist');
    };

    // Episodes filter
    document.getElementById('epSearch').oninput = (e) => {
      const val = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#epGrid .ep-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(val) ? '' : 'none';
      });
    };

  } catch (err) {
    render(`
      <div style="text-align:center;padding:60px 20px;">
        <h2>Failed to load anime details</h2>
        <p style="color:var(--text-dim);margin:10px 0 20px;">${esc(err.message)}</p>
        <button class="btn btn-primary" onclick="viewPost('${id}')">Retry</button>
      </div>
    `);
  }
}

// 3. Watch Player View
async function viewWatch(pid, epIdPref, srvPref) {
  setActiveNav('');
  cleanUpPlayer();

  render(`
    <div style="display:flex;justify-content:center;padding:80px 0;">
      <div class="spinner"></div>
    </div>
  `);

  try {
    const [postData, episodesData, progData] = await Promise.all([
      API.post(pid),
      API.episodes(pid),
      API.getProgress(pid).catch(() => ({ progress: {} }))
    ]);

    const post = postData.data || {};
    const episodes = episodesData.episodes || [];
    if (!episodes.length) {
      throw new Error("No episodes found for this anime.");
    }

    const progressMap = progData.progress || {};
    let curEp = null;
    if (epIdPref) {
      curEp = episodes.find(e => String(e.id) === String(epIdPref));
    }
    if (!curEp) {
      // Find latest watched episode
      let latestWatched = null;
      let latestTime = 0;
      for (const ep of episodes) {
        const p = progressMap[String(ep.id)];
        if (p && p.updated_at > latestTime) {
          latestTime = p.updated_at;
          latestWatched = { ep, p };
        }
      }
      if (latestWatched) {
        curEp = latestWatched.ep;
      } else {
        curEp = episodes[0];
      }
    }

    render(`
      <div style="margin-bottom:12px;">
        <a href="#/post/${pid}" style="color:var(--text-dim);font-weight:600;font-size:13px;">← Back to ${esc(post.title)}</a>
      </div>

      <div class="watch-container">
        <div class="player-stage">
          <div class="video-wrapper" id="videoWrapper">
            <video id="animePlayer" playsinline preload="auto"></video>

            <!-- Central Play/Pause Tactile Pulse -->
            <div id="playPulse" class="play-pulse">▶</div>

            <!-- Re-buffering / Network Stabilization Badge -->
            <div id="rebufferingBadge" class="rebuffering-badge">
              <div class="spinner" style="width:14px;height:14px;border-width:2px;"></div>
              <span id="rebufferingText">Optimizing Stream...</span>
            </div>

            <!-- Double-Tap Mobile Ripples -->
            <div id="tapLeft" class="tap-ripple left"><span>⏪ 10s</span></div>
            <div id="tapRight" class="tap-ripple right"><span>10s ⏩</span></div>

            <!-- Modern Floating Controls Overlay -->
            <div id="playerOverlay" class="player-overlay">
              <div class="overlay-top">
                <div class="player-title-info">
                  ${esc(post.title)} · Ep ${curEp.num || '?'}
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <label class="auto-skip-toggle desktop-only" title="Auto-skip Openings & Endings">
                    <input type="checkbox" id="autoSkipToggle" checked>
                    <span>⚡ Auto-Skip</span>
                  </label>
                  <button class="ctrl-btn desktop-only" onclick="toggleTheaterMode()" title="Theater Mode (T)">🗔</button>
                  <button class="ctrl-btn" onclick="togglePlayerSettingsModal()" title="Playback Settings">⚙️</button>
                  <button class="ctrl-btn desktop-only" onclick="toggleHelpModal()" title="Shortcuts (?)">❓</button>
                </div>
              </div>

              <!-- Center 3-Button Touch Row (Netflix/Crunchyroll Mobile Style) -->
              <div class="overlay-center">
                <button class="touch-seek-btn" onclick="mediaContext.seekRelative(-10)" title="Rewind 10s">↺ 10</button>
                <button id="centerPlayIcon" class="touch-play-btn" onclick="mediaContext.togglePlay()" title="Play/Pause">▶</button>
                <button class="touch-seek-btn" onclick="mediaContext.seekRelative(10)" title="Forward 10s">↻ 10</button>
              </div>

              <div class="overlay-bottom">
                <div id="scrubber" class="scrubber-container">
                  <div class="scrubber-track">
                    <div id="scrubberBuffer" class="scrubber-buffer"></div>
                    <div id="scrubberFill" class="scrubber-fill">
                      <div class="scrubber-thumb"></div>
                    </div>
                  </div>
                  <div id="timeTooltip" class="time-tooltip">00:00</div>
                </div>

                <div class="controls-row">
                  <div class="controls-left">
                    <button id="ctrlPlayBtn" class="ctrl-btn desktop-only" onclick="mediaContext.togglePlay()" title="Play/Pause (Space)">▶</button>
                    <button class="ctrl-btn desktop-only" onclick="mediaContext.seekRelative(-10)" title="Rewind 10s (← / J)">↺10</button>
                    <button class="ctrl-btn desktop-only" onclick="mediaContext.seekRelative(10)" title="Forward 10s (→ / L)">↻10</button>
                    <span id="timeDisplay" class="time-display">00:00 / 00:00</span>
                  </div>

                  <div class="controls-right">
                    <select id="speedSelect" class="ctrl-select desktop-only" title="Playback Speed">
                      <option value="0.75">0.75x</option>
                      <option value="1" selected>1.0x</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                      <option value="2">2.0x</option>
                    </select>
                    <select id="qualitySelect" class="ctrl-select desktop-only" title="Video Quality">
                      <option value="-1">Auto</option>
                    </select>
                    <button class="ctrl-btn mobile-only" onclick="togglePlayerSettingsModal()" title="Playback Settings">⚙️</button>
                    <button id="pipBtn" class="ctrl-btn desktop-only" title="Picture in Picture (P)">⧉</button>
                    <button id="fullscreenBtn" class="ctrl-btn" title="Fullscreen (F)">⛶</button>
                  </div>
                </div>
              </div>
            </div>

            <div id="playerLoader" class="player-loader">
              <div class="spinner"></div>
              <div id="loaderText" style="font-size:14px;color:var(--text-dim);">Resolving 1080p HLS stream...</div>
            </div>
            <button id="skipBtn" class="skip-button">
              ⚡ Skip Intro
            </button>
          </div>

          <!-- Watch Info & Mobile Action Bar -->
          <div class="watch-info-bar">
            <h1 class="watch-anime-title">${esc(post.title)}</h1>
            <div class="watch-episode-subtitle">
              <span class="ep-badge">EP ${curEp.num || '?'}</span>
              <span class="ep-name-text">${esc(curEp.name || 'Episode ' + curEp.num)}</span>
            </div>
          </div>

          <div class="player-toolbar">
            <div class="toolbar-group audio-select-group">
              <span style="font-size:12px;font-weight:700;color:var(--text-dim);">AUDIO:</span>
              <div id="audioGroup" style="display:flex;gap:6px;"></div>
            </div>

            <div class="toolbar-group server-select-group">
              <span style="font-size:12px;font-weight:700;color:var(--text-dim);">SERVER:</span>
              <select id="serverSelect" class="server-dropdown">
                <option>Loading...</option>
              </select>
            </div>

            <div class="toolbar-group nav-ep-group">
              <button id="btnPrevEp" class="btn btn-secondary btn-sm ep-nav-btn">⏮ Prev</button>
              <button id="btnNextEp" class="btn btn-primary btn-sm ep-nav-btn">Next ⏭</button>
            </div>
          </div>
        </div>

        <aside class="watch-sidebar">
          <div class="sidebar-header">
            <span>Episodes</span>
            <span style="font-size:12px;color:var(--text-dim);">${episodes.length} total</span>
          </div>
          <div class="sidebar-list">
            ${episodes.map(ep => `
              <a class="sidebar-item ${ep.id === curEp.id ? 'active' : ''}" href="#/watch/${pid}?ep=${ep.id}">
                <span><strong>#${ep.num || '?'}</strong> ${esc(ep.name || 'Episode ' + ep.num)}</span>
              </a>
            `).join('')}
          </div>
        </aside>
      </div>
    `);

    // Next / Prev Episode buttons
    const curIdx = episodes.findIndex(e => String(e.id) === String(curEp.id));
    const prevEp = episodes[curIdx - 1];
    const nextEp = episodes[curIdx + 1];

    document.getElementById('btnPrevEp').disabled = !prevEp;
    document.getElementById('btnPrevEp').onclick = () => {
      if (prevEp) location.hash = `#/watch/${pid}?ep=${prevEp.id}`;
    };

    document.getElementById('btnNextEp').disabled = !nextEp;
    document.getElementById('btnNextEp').onclick = () => {
      if (nextEp) location.hash = `#/watch/${pid}?ep=${nextEp.id}`;
    };

    // Fetch servers for current episode
    const srvData = await API.servers(pid, curEp.id);
    const servers = srvData.servers || [];
    if (!servers.length) {
      throw new Error("No video servers found for this episode.");
    }

    // Categorize into SUB and DUB
    const subs = servers.filter(s => s.lang === 'sub');
    const dubs = servers.filter(s => s.lang === 'dub');

    let activeLang = srvPref ? (servers.find(s => s.id === srvPref)?.lang || 'sub') : (subs.length ? 'sub' : 'dub');

    const audioGroup = document.getElementById('audioGroup');
    audioGroup.innerHTML = `
      ${subs.length ? `<button class="btn-pill ${activeLang === 'sub' ? 'active' : ''}" id="btnLangSub">SUB</button>` : ''}
      ${dubs.length ? `<button class="btn-pill ${activeLang === 'dub' ? 'active' : ''}" id="btnLangDub">DUB</button>` : ''}
    `;

    function updateServerOptions() {
      const list = activeLang === 'sub' ? subs : dubs;
      const sSelect = document.getElementById('serverSelect');
      sSelect.innerHTML = list.map((s, idx) => `
        <option value="${s.id}">${s.name || `Server ${idx + 1}`}</option>
      `).join('');

      // Auto load first server of the selected audio
      if (list.length > 0) {
        loadServerStream(list[0].id);
      }
    }

    if (subs.length) {
      document.getElementById('btnLangSub').onclick = () => {
        activeLang = 'sub';
        document.getElementById('btnLangSub').classList.add('active');
        if (dubs.length) document.getElementById('btnLangDub').classList.remove('active');
        updateServerOptions();
      };
    }
    if (dubs.length) {
      document.getElementById('btnLangDub').onclick = () => {
        activeLang = 'dub';
        document.getElementById('btnLangDub').classList.add('active');
        if (subs.length) document.getElementById('btnLangSub').classList.remove('active');
        updateServerOptions();
      };
    }

    document.getElementById('serverSelect').onchange = (e) => {
      loadServerStream(e.target.value);
    };

    updateServerOptions();

    // Stream Loader function
    async function loadServerStream(serverId) {
      const loader = document.getElementById('playerLoader');
      const loaderText = document.getElementById('loaderText');
      loader.style.display = 'flex';
      loaderText.textContent = 'Extracting and proxying stream...';

      try {
        const streamData = await API.stream(pid, serverId);
        const proxyUrl = streamData.proxy_url;
        if (!proxyUrl) throw new Error("Stream URL could not be resolved.");

        initVideoPlayer(proxyUrl, post, curEp, nextEp);
        loader.style.display = 'none';
      } catch (err) {
        loaderText.innerHTML = `
          <div style="color:var(--accent-red);font-weight:700;">Stream Error</div>
          <div style="font-size:12px;margin:8px 0;">${esc(err.message)}</div>
          <button class="btn btn-primary btn-sm" onclick="location.reload()">Retry</button>
        `;
      }
    }

  } catch (err) {
    render(`
      <div style="text-align:center;padding:60px 20px;">
        <h2>Could not play episode</h2>
        <p style="color:var(--text-dim);margin:10px 0 20px;">${esc(err.message)}</p>
        <a href="#/post/${pid}" class="btn btn-primary">Back to Anime Details</a>
      </div>
    `);
  }
}

// Modern Video Player initializer decoupled via PlaybackContext State Machine
let playerOverlayTimer = null;
let scrubberDragActive = false;
let mediaUnsubscribe = null;

function initVideoPlayer(streamUrl, post, episode, nextEpisode) {
  const video = document.getElementById('animePlayer');
  if (!video) return;

  cleanUpPlayer();
  currentPost = post;
  currentEp = episode;

  const wrapper = document.getElementById('videoWrapper');
  const overlay = document.getElementById('playerOverlay');
  const centerPlay = document.getElementById('centerPlayIcon');
  const ctrlPlay = document.getElementById('ctrlPlayBtn');
  const scrubber = document.getElementById('scrubber');
  const scrubberFill = document.getElementById('scrubberFill');
  const scrubberBuffer = document.getElementById('scrubberBuffer');
  const timeTooltip = document.getElementById('timeTooltip');
  const timeDisplay = document.getElementById('timeDisplay');
  const speedSelect = document.getElementById('speedSelect');
  const qualitySelect = document.getElementById('qualitySelect');
  const pipBtn = document.getElementById('pipBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const autoSkipToggle = document.getElementById('autoSkipToggle');
  const skipBtn = document.getElementById('skipBtn');
  const rebufferingBadge = document.getElementById('rebufferingBadge');

  // Initialize HLS / Native streaming
  let hlsInstance = null;
  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      autoStartLoad: true
    });
    hlsInstance.loadSource(streamUrl);
    hlsInstance.attachMedia(video);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamUrl;
  }

  // Bind Global Media Context Layer
  mediaContext.attachMedia(video, hlsInstance);
  mediaContext.setContentMetadata({
    videoId: episode.id,
    seriesId: post.id,
    title: post.title,
    episodeNum: episode.num,
    episodeName: episode.name,
    currentEpisodeIndex: (post.episodesList || []).findIndex(e => String(e.id) === String(episode.id)),
    episodesList: post.episodesList || [],
    poster: post.poster
  });

  // Query AniSkip Markers
  API.getSkipTimes(post.title, parseInt(episode.num, 10) || 1, 1440).then(res => {
    if (res.found && res.results) {
      const op = res.results.find(r => r.type === 'op');
      const ed = res.results.find(r => r.type === 'ed');
      mediaContext.setMarkers({
        introStartTime: op ? op.start : null,
        introEndTime: op ? op.end : null,
        creditsStartTime: ed ? ed.start : null
      });
    }
  }).catch(() => {});

  // Query saved progress for seamless resume
  API.getProgress(post.id).then(res => {
    const prog = res.progress && res.progress[episode.id];
    if (prog && prog.position && prog.position > 5) {
      mediaContext.setResumeTarget(prog.position);
    }
  }).catch(() => {});

  // Subscribe UI to PlaybackContext reactive state
  if (mediaUnsubscribe) mediaUnsubscribe();
  mediaUnsubscribe = mediaContext.subscribe((state, slice) => {
    const p = state.playback;
    const m = state.markers;
    const n = state.network;

    // Playback state updates
    if (ctrlPlay) {
      ctrlPlay.textContent = p.playing ? '⏸' : '▶';
    }
    if (centerPlay) {
      centerPlay.textContent = p.playing ? '⏸' : '▶';
    }
    if (overlay) {
      overlay.classList.toggle('paused', !p.playing);
    }

    // Scrubber & Time updates
    if (p.duration > 0) {
      if (!scrubberDragActive && scrubberFill) {
        scrubberFill.style.width = `${(p.currentTime / p.duration) * 100}%`;
      }
      if (scrubberBuffer) {
        scrubberBuffer.style.width = `${(p.bufferedTime / p.duration) * 100}%`;
      }
      if (timeDisplay) {
        timeDisplay.textContent = `${formatTime(p.currentTime)} / ${formatTime(p.duration)}`;
      }
    }

    // Re-buffering badge
    if (rebufferingBadge) {
      rebufferingBadge.style.display = (p.buffering || p.stalled) ? 'flex' : 'none';
    }

    // Interactive skip buttons
    if (skipBtn) {
      if (m.showSkipIntroButton) {
        skipBtn.style.display = 'flex';
        skipBtn.textContent = '⚡ Skip Intro';
        skipBtn.onclick = () => mediaContext.skipIntro();
      } else if (m.showSkipOutroButton) {
        skipBtn.style.display = 'flex';
        skipBtn.textContent = '⚡ Skip Outro';
        skipBtn.onclick = () => mediaContext.skipOutro();
      } else {
        skipBtn.style.display = 'none';
      }
    }

    // Auto-skip toggle sync
    if (autoSkipToggle && autoSkipToggle.checked !== m.autoSkipEnabled) {
      autoSkipToggle.checked = m.autoSkipEnabled;
    }

    // Quality levels dropdown
    if (qualitySelect && (slice === 'network' || slice === 'init')) {
      const currentVal = String(n.currentQualityIndex);
      if (qualitySelect.dataset.count !== String(n.qualityLevels.length)) {
        qualitySelect.dataset.count = String(n.qualityLevels.length);
        qualitySelect.innerHTML = '<option value="-1">Auto</option>' +
          n.qualityLevels.map(lvl => `<option value="${lvl.index}">${lvl.label}</option>`).join('');
      }
      if (qualitySelect.value !== currentVal) {
        qualitySelect.value = currentVal;
      }
    }

    // Sync mobile bottom sheet if open
    syncPlayerSettingsSheet();
  });

  // Auto-skip toggle switch
  if (autoSkipToggle) {
    autoSkipToggle.onchange = () => {
      mediaContext.toggleAutoSkip(autoSkipToggle.checked);
    };
  }

  // Quality switcher
  if (qualitySelect) {
    qualitySelect.onchange = (e) => {
      mediaContext.setQuality(e.target.value);
    };
  }

  // Speed selection
  if (speedSelect) {
    speedSelect.onchange = (e) => {
      mediaContext.setPlaybackRate(e.target.value);
    };
  }

  // Picture in Picture
  if (pipBtn) {
    pipBtn.onclick = async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (video.requestPictureInPicture) {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        toast("PiP error: " + err.message);
      }
    };
  }

  // Fullscreen
  if (fullscreenBtn) {
    fullscreenBtn.onclick = () => {
      if (!document.fullscreenElement) {
        wrapper?.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };
  }

  // Auto-hide controls overlay
  function resetOverlayTimer() {
    if (overlay) overlay.classList.add('visible');
    if (wrapper) wrapper.style.cursor = 'default';
    clearTimeout(playerOverlayTimer);
    if (mediaContext.state.playback.playing) {
      playerOverlayTimer = setTimeout(() => {
        if (overlay) overlay.classList.remove('visible');
        if (wrapper && mediaContext.state.playback.playing) wrapper.style.cursor = 'none';
      }, 3000);
    }
  }

  if (wrapper) {
    wrapper.onmousemove = resetOverlayTimer;
    wrapper.ontouchstart = resetOverlayTimer;

    // Direct video-stage click to play/pause (Netflix / Crunchyroll behavior)
    wrapper.onclick = (e) => {
      if (e.target.closest('.controls-row') || e.target.closest('.overlay-top') || e.target.closest('.overlay-center') || e.target.closest('.scrubber-container') || e.target.closest('.skip-button') || e.target.closest('.btn-pill') || e.target.closest('select')) {
        return;
      }
      // If overlay is currently hidden while playing, tap reveals overlay first
      if (overlay && !overlay.classList.contains('visible') && mediaContext.state.playback.playing) {
        resetOverlayTimer();
        return;
      }
      mediaContext.togglePlay();
      resetOverlayTimer();
    };
  }

  // Mobile double-tap seek detection
  let lastTapTime = 0;
  let lastTapX = 0;
  if (wrapper) {
    wrapper.addEventListener('touchend', (e) => {
      const now = Date.now();
      const touch = e.changedTouches[0];
      if (!touch) return;
      const rect = wrapper.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const diffTime = now - lastTapTime;
      const diffX = Math.abs(x - lastTapX);

      if (diffTime < 350 && diffX < 80) {
        e.preventDefault();
        const half = rect.width / 2;
        if (x < half) {
          mediaContext.seekRelative(-10);
          showTapRipple('tapLeft');
        } else {
          mediaContext.seekRelative(10);
          showTapRipple('tapRight');
        }
      }
      lastTapTime = now;
      lastTapX = x;
    });
  }

  // Interactive scrubber bar
  function seekToScrubberClientX(clientX) {
    if (!scrubber || !mediaContext.state.playback.duration) return;
    const rect = scrubber.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    mediaContext.seek(pos * mediaContext.state.playback.duration);
    if (scrubberFill) scrubberFill.style.width = `${pos * 100}%`;
  }

  if (scrubber) {
    scrubber.addEventListener('mousemove', (e) => {
      const dur = mediaContext.state.playback.duration;
      if (!dur || !timeTooltip) return;
      const rect = scrubber.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      timeTooltip.style.display = 'block';
      timeTooltip.style.left = `${pos * 100}%`;
      timeTooltip.textContent = formatTime(pos * dur);
    });

    scrubber.addEventListener('mouseleave', () => {
      if (timeTooltip) timeTooltip.style.display = 'none';
    });

    scrubber.addEventListener('mousedown', (e) => {
      scrubberDragActive = true;
      seekToScrubberClientX(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (scrubberDragActive) seekToScrubberClientX(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      scrubberDragActive = false;
    });

    // Touch scrubbing ergonomics for mobile
    function handleTouchScrub(e) {
      if (!e.touches || !e.touches[0]) return;
      e.preventDefault();
      seekToScrubberClientX(e.touches[0].clientX);
    }

    scrubber.addEventListener('touchstart', (e) => {
      scrubberDragActive = true;
      handleTouchScrub(e);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (scrubberDragActive) {
        handleTouchScrub(e);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      scrubberDragActive = false;
    });
    window.addEventListener('touchcancel', () => {
      scrubberDragActive = false;
    });
  }

  // Modern Keyboard Shortcuts mapped to PlaybackContext
  window.onkeydown = (e) => {
    if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) return;
    if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      mediaContext.togglePlay();
    } else if (e.code === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      mediaContext.seekRelative(10);
    } else if (e.code === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      mediaContext.seekRelative(-10);
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      mediaContext.setVolume(mediaContext.state.playback.volume + 0.1);
      toast(`Volume ${Math.round(mediaContext.state.playback.volume * 100)}%`, 800);
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      mediaContext.setVolume(mediaContext.state.playback.volume - 0.1);
      toast(`Volume ${Math.round(mediaContext.state.playback.volume * 100)}%`, 800);
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.getElementById('videoWrapper')?.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } else if (e.code === 'KeyT') {
      e.preventDefault();
      toggleTheaterMode();
    } else if (e.code === 'KeyP') {
      e.preventDefault();
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      } else if (video.requestPictureInPicture) {
        video.requestPictureInPicture().catch(() => {});
      }
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      mediaContext.toggleMute();
      toast(mediaContext.state.playback.muted ? "Muted" : "Unmuted", 800);
    } else if (e.code === 'KeyN' && nextEpisode) {
      e.preventDefault();
      location.hash = `#/watch/${post.id}?ep=${nextEpisode.id}`;
    } else if (e.key === '?') {
      e.preventDefault();
      toggleHelpModal();
    }
  };
}

function cleanUpPlayer() {
  if (typeof mediaContext !== 'undefined' && mediaContext) {
    mediaContext.detachMedia(true);
  }
  if (mediaUnsubscribe) {
    mediaUnsubscribe();
    mediaUnsubscribe = null;
  }
  window.onkeydown = null;
}

// 4. Watchlist View
async function viewWatchlist() {
  setActiveNav('watchlist');
  render(`
    <div style="display:flex;justify-content:center;padding:80px 0;">
      <div class="spinner"></div>
    </div>
  `);

  try {
    const data = await API.getWatchlist();
    const items = data.items || [];

    if (!items.length) {
      render(`
        <div style="text-align:center;padding:80px 20px;">
          <h2 style="font-size:24px;margin-bottom:10px;">Your Watchlist is Empty</h2>
          <p style="color:var(--text-dim);margin-bottom:20px;">Save anime shows to easily find and watch them later.</p>
          <a href="#/" class="btn btn-primary">Browse Catalog</a>
        </div>
      `);
      return;
    }

    render(`
      <div class="section-header">
        <h2 class="section-title">My Watchlist (${items.length})</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(170px, 1fr));gap:20px;">
        ${items.map(p => `
          <a class="anime-card" href="#/post/${p.anime_id}">
            <div class="card-poster">
              <img src="${p.anime_poster || ''}" alt="" onerror="this.src='/static/placeholder.png'">
            </div>
            <div class="card-info">
              <div class="card-title">${esc(p.anime_title)}</div>
              <div class="card-meta">${esc(p.anime_type || 'Anime')}</div>
            </div>
          </a>
        `).join('')}
      </div>
    `);
  } catch (err) {
    render(`<div style="padding:40px;text-align:center;">Failed to load watchlist: ${esc(err.message)}</div>`);
  }
}

// 5. Search / Browse View
async function viewSearch(query, page = 1) {
  setActiveNav('browse');
  render(`
    <div style="display:flex;justify-content:center;padding:80px 0;">
      <div class="spinner"></div>
    </div>
  `);

  try {
    const data = await API.search(query, page);
    const posts = data.posts || [];

    if (!posts.length) {
      render(`
        <div style="text-align:center;padding:80px 20px;">
          <h2>No anime found for "${esc(query)}"</h2>
          <p style="color:var(--text-dim);margin-top:8px;">Try searching for another keyword or title.</p>
        </div>
      `);
      return;
    }

    render(`
      <div class="section-header">
        <h2 class="section-title">Search: "${esc(query)}"</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(170px, 1fr));gap:20px;">
        ${posts.map(p => `
          <a class="anime-card" href="#/post/${p.id}">
            <div class="card-poster">
              <img src="${p.poster || ''}" alt="" onerror="this.style.display='none'">
              ${p.score ? `<div class="card-score">★ ${p.score}</div>` : ''}
            </div>
            <div class="card-info">
              <div class="card-title">${esc(p.title || 'Anime')}</div>
              <div class="card-meta">${esc([p.type, p.age].filter(Boolean).join(' · '))}</div>
            </div>
          </a>
        `).join('')}
      </div>
    `);
  } catch (err) {
    render(`<div style="padding:40px;text-align:center;">Search failed: ${esc(err.message)}</div>`);
  }
}

// 6. Binge Roulette & Smart Recommendation Engine
async function viewBinge() {
  setActiveNav('binge');
  let currentVibe = 'junk';
  let currentLength = 'any';
  let isHiddenGems = true;

  const vibes = [
    { id: 'junk', label: '🍿 Pure Junk Food', desc: 'Secret OP MC, cheat magic flexes, instant dopamine' },
    { id: 'hype', label: '🔥 Pure Hype & Sakuga', desc: 'High stakes, god-tier battles, zero drag' },
    { id: 'mind_games', label: '🧠 200 IQ Mind Games', desc: 'Masterminds, psychological chess, deception' },
    { id: 'dark', label: '💀 Dark & Gritty', desc: 'High tension, gritty survival, relentless mystery' },
    { id: 'chill', label: '☕ Cozy & Wholesome', desc: 'Wholesome laughs, low stress comfort watching' },
    { id: 'feels', label: '😭 Emotional Damage', desc: 'Tearjerkers, bittersweet drama, deep bonds' }
  ];

  render(`
    <div class="binge-container">
      <div class="section-header">
        <div>
          <h1 class="section-title" style="font-size:26px;">🎲 Binge Roulette</h1>
          <p style="color:var(--text-dim);font-size:14px;margin-top:4px;">
            Pick a craving and spin to discover your next obsession with zero decision paralysis.
          </p>
        </div>
      </div>

      <div class="binge-picker-card">
        <label style="font-size:13px;font-weight:700;color:var(--text-dim);letter-spacing:0.5px;">1. CHOOSE YOUR VIBE</label>
        <div class="vibe-pill-group" id="vibePills">
          ${vibes.map(v => `
            <button class="vibe-pill ${v.id === currentVibe ? 'active' : ''}" data-vibe="${v.id}" title="${esc(v.desc)}">
              ${v.label}
            </button>
          `).join('')}
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;justify-content:space-between;border-top:1px solid var(--border-line);padding-top:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <label style="font-size:13px;font-weight:700;color:var(--text-dim);">LENGTH:</label>
            <select id="bingeLengthSelect" class="ctrl-select" style="padding:6px 12px;font-size:13px;">
              <option value="any" selected>Any Length</option>
              <option value="short">Quick Binge (11-13 eps)</option>
              <option value="medium">Standard Season (22-26 eps)</option>
              <option value="long">Long Journey (40+ eps)</option>
            </select>
          </div>

          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-dim);cursor:pointer;">
            <input type="checkbox" id="bingeGemsToggle" ${isHiddenGems ? 'checked' : ''} style="accent-color:var(--accent-orange);cursor:pointer;">
            <span>💎 Hidden Gems (Skip ubiquitous Top 100)</span>
          </label>

          <button id="spinBtn" class="btn btn-primary" style="padding:10px 24px;font-size:15px;box-shadow:0 4px 18px rgba(255,100,10,0.4);">
            🎰 Spin Roulette
          </button>
        </div>
      </div>

      <div id="bingeResultArea">
        <div style="text-align:center;padding:50px 20px;color:var(--text-dim);">
          Hit <strong style="color:var(--accent-orange);">Spin Roulette</strong> to roll a personalized pick!
        </div>
      </div>
    </div>
  `);

  // Event handlers
  document.querySelectorAll('#vibePills .vibe-pill').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#vibePills .vibe-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentVibe = btn.dataset.vibe;
    };
  });

  const lengthSelect = document.getElementById('bingeLengthSelect');
  if (lengthSelect) {
    lengthSelect.onchange = (e) => { currentLength = e.target.value; };
  }

  const gemsToggle = document.getElementById('bingeGemsToggle');
  if (gemsToggle) {
    gemsToggle.onchange = (e) => { isHiddenGems = e.target.checked; };
  }

  const spinBtn = document.getElementById('spinBtn');
  if (spinBtn) {
    spinBtn.onclick = () => runRoulette();
  }

  async function runRoulette() {
    const resArea = document.getElementById('bingeResultArea');
    if (!resArea) return;

    resArea.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;padding:60px 0;gap:14px;">
        <div class="spinner"></div>
        <div style="color:var(--text-dim);font-size:14px;">Shuffling AniList discovery pool...</div>
      </div>
    `;

    try {
      const data = await API.binge(currentVibe, currentLength, isHiddenGems);
      const recs = data.recommendations || [];

      if (!recs.length) {
        resArea.innerHTML = `
          <div style="text-align:center;padding:40px 20px;background:var(--bg-card);border-radius:var(--radius-md);border:1px solid var(--border-line);">
            <h3>No matches found in this pool</h3>
            <p style="color:var(--text-dim);margin:8px 0 16px;">Try unticking Hidden Gems or changing the episode length.</p>
          </div>
        `;
        return;
      }

      const top = recs[0];
      const others = recs.slice(1, 7);

      resArea.innerHTML = `
        <div class="binge-match-card">
          <div style="border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-md);">
            <img src="${top.cover || '/static/placeholder.png'}" alt="" style="width:100%;height:100%;object-fit:cover;min-height:300px;" onerror="this.src='/static/placeholder.png'">
          </div>
          <div style="display:flex;flex-direction:column;justify-content:space-between;gap:16px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
                <span class="card-score" style="position:static;font-size:13px;padding:3px 8px;">★ ${top.score || 'N/A'}%</span>
                <span style="font-size:13px;color:var(--text-dim);">${top.episodes} Episodes</span>
                <span style="font-size:13px;color:var(--accent-orange);font-weight:700;">🎯 VIBE MATCH</span>
              </div>
              <h2 style="font-size:24px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:6px;">${esc(top.title)}</h2>
              ${top.title_romaji && top.title_romaji !== top.title ? `<div style="font-size:13px;color:var(--text-dim);margin-bottom:12px;">${esc(top.title_romaji)}</div>` : ''}
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 16px;">
                ${(top.genres || []).map(g => `<span class="tag">${esc(g)}</span>`).join('')}
              </div>
              <p style="font-size:14px;line-height:1.6;color:#ccd2e2;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;">
                ${esc(top.description || 'No synopsis provided.')}
              </p>
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding-top:12px;border-top:1px solid var(--border-line);">
              <a href="#/search?q=${encodeURIComponent(top.title)}" class="btn btn-primary" style="padding:10px 22px;">
                ▶ Stream Now
              </a>
              <button class="btn btn-secondary" onclick="document.getElementById('spinBtn').click()">
                🎲 Spin Again
              </button>
            </div>
          </div>
        </div>

        ${others.length ? `
          <div class="section" style="margin-top:36px;">
            <div class="section-header">
              <h3 class="section-title" style="font-size:18px;">More Recommendations For This Vibe</h3>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));gap:16px;">
              ${others.map(r => `
                <a class="anime-card" href="#/search?q=${encodeURIComponent(r.title)}">
                  <div class="card-poster">
                    <img src="${r.cover || ''}" alt="" onerror="this.src='/static/placeholder.png'">
                    ${r.score ? `<div class="card-score">★ ${r.score}%</div>` : ''}
                  </div>
                  <div class="card-info">
                    <div class="card-title">${esc(r.title)}</div>
                    <div class="card-meta">${r.episodes ? r.episodes + ' eps' : ''}</div>
                  </div>
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;
    } catch (err) {
      resArea.innerHTML = `
        <div style="padding:30px;text-align:center;color:var(--accent-red);">
          Binge Discovery Error: ${esc(err.message)}
        </div>
      `;
    }
  }

  // Auto-run roulette on first view
  runRoulette();
}

// 7. Airing Today View
async function viewToday() {
  setActiveNav('today');
  render(`
    <div style="display:flex;justify-content:center;padding:80px 0;">
      <div class="spinner"></div>
    </div>
  `);

  try {
    const data = await API.today();
    const list = data.schedule || [];

    if (!list.length) {
      render(`
        <div style="text-align:center;padding:80px 20px;">
          <h2>No Airing Releases Found Today</h2>
          <p style="color:var(--text-dim);margin-top:8px;">AniList reports no active broadcast schedules in the current window.</p>
        </div>
      `);
      return;
    }

    const todayStr = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());

    render(`
      <div class="section-header">
        <div>
          <h1 class="section-title">📅 Airing Radar — ${todayStr}</h1>
          <p style="color:var(--text-dim);font-size:14px;margin-top:4px;">
            Real-time schedule of new episodes dropping worldwide today (${list.length} releases).
          </p>
        </div>
      </div>

      <div class="airing-schedule-list">
        ${list.map(s => {
          const isAired = s.is_aired;
          const badgeClass = isAired ? 'aired' : 'upcoming';
          return `
            <div class="airing-row">
              <div style="display:flex;align-items:center;gap:16px;flex:1;min-width:0;">
                <div style="width:48px;height:64px;border-radius:var(--radius-sm);overflow:hidden;flex-shrink:0;background:var(--border-line);">
                  <img src="${s.cover || '/static/placeholder.png'}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/static/placeholder.png'">
                </div>
                <div style="min-width:0;flex:1;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                    <span class="airing-badge ${badgeClass}">${s.status_icon} ${esc(s.status_str)}</span>
                    <span style="font-size:12px;font-weight:700;color:var(--accent-orange);">Episode ${s.episode}</span>
                    ${s.score ? `<span style="font-size:12px;color:var(--text-dim);">★ ${s.score}%</span>` : ''}
                  </div>
                  <div style="font-size:15px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${esc(s.title)}
                  </div>
                  ${s.genres && s.genres.length ? `<div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${esc(s.genres.slice(0, 3).join(' • '))}</div>` : ''}
                </div>
              </div>

              <div style="flex-shrink:0;">
                <a href="#/search?q=${encodeURIComponent(s.title)}" class="btn btn-secondary btn-sm" title="Search and stream episode">
                  ▶ Watch
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `);
  } catch (err) {
    render(`<div style="padding:40px;text-align:center;">Failed to load airing radar: ${esc(err.message)}</div>`);
  }
}

// --------------------------------------------------------------------------
// Router
// --------------------------------------------------------------------------
function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  const seg = (path || '').split('/').filter(Boolean);

  cleanUpPlayer();

  if (!seg.length || seg[0] === 'home') {
    viewHome();
  } else if (seg[0] === 'post' && seg[1]) {
    viewPost(seg[1]);
  } else if (seg[0] === 'watch' && seg[1]) {
    viewWatch(seg[1], params.get('ep'), params.get('srv'));
  } else if (seg[0] === 'binge') {
    viewBinge();
  } else if (seg[0] === 'today') {
    viewToday();
  } else if (seg[0] === 'watchlist') {
    viewWatchlist();
  } else if (seg[0] === 'search') {
    viewSearch(params.get('q') || '', parseInt(params.get('page') || '1', 10));
  } else {
    viewHome();
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => {
  route();

  // Search input handler
  const sInput = document.getElementById('globalSearch');
  if (sInput) {
    sInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = sInput.value.trim();
        if (val) {
          location.hash = `#/search?q=${encodeURIComponent(val)}`;
        }
      }
    });
  }
});
