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
  getSkipTimes: (title, ep, dur) => fetch(`/api/skip/times?title=${encodeURIComponent(title)}&episode=${ep}&duration=${dur}`).then(r => r.json())
};

// State
let currentHls = null;
let progressInterval = null;
let activeSkipIntervals = [];

function toast(msg, ms = 3000) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

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

function setActiveNav(navName) {
  document.querySelectorAll('.nav-link').forEach(el => {
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
          <div class="carousel">
            ${continueItems.map(item => {
              const pct = item.duration ? Math.min(100, Math.round((item.position / item.duration) * 100)) : 0;
              return `
                <a class="cw-card" href="#/watch/${item.anime_id}?ep=${item.ep_id}">
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
            <a href="#/watch/${id}?ep=${episodes[0].id}" class="btn btn-primary" style="padding:14px 28px;font-size:16px;">
              ▶ Start Watching Episode 1
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
    const [postData, episodesData] = await Promise.all([
      API.post(pid),
      API.episodes(pid)
    ]);

    const post = postData.data || {};
    const episodes = episodesData.episodes || [];
    if (!episodes.length) {
      throw new Error("No episodes found for this anime.");
    }

    const curEp = episodes.find(e => String(e.id) === String(epIdPref)) || episodes[0];

    render(`
      <div style="margin-bottom:14px;">
        <a href="#/post/${pid}" style="color:var(--text-dim);font-weight:600;">← Back to ${esc(post.title)}</a>
        <h2 style="font-size:22px;font-weight:800;margin-top:6px;">
          ${esc(post.title)} · <span style="color:var(--accent-orange)">Ep ${curEp.num || '?'}</span>
        </h2>
      </div>

      <div class="watch-container">
        <div class="player-stage">
          <div class="video-wrapper" id="videoWrapper">
            <video id="animePlayer" controls playsinline preload="auto"></video>
            <div id="playerLoader" class="player-loader">
              <div class="spinner"></div>
              <div id="loaderText" style="font-size:14px;color:var(--text-dim);">Resolving HLS stream...</div>
            </div>
            <button id="skipBtn" class="skip-button">
              ⚡ Skip Intro
            </button>
          </div>

          <div class="player-toolbar">
            <div class="toolbar-group">
              <span style="font-size:13px;font-weight:700;color:var(--text-dim);">AUDIO:</span>
              <div id="audioGroup" style="display:flex;gap:6px;"></div>
            </div>

            <div class="toolbar-group">
              <span style="font-size:13px;font-weight:700;color:var(--text-dim);">SERVER:</span>
              <select id="serverSelect" style="background:var(--border-line);border:none;padding:6px 12px;border-radius:var(--radius-sm);color:#fff;font-size:13px;outline:none;cursor:pointer;">
                <option>Loading...</option>
              </select>
            </div>

            <div class="toolbar-group" style="margin-left:auto;">
              <button id="btnPrevEp" class="btn btn-secondary btn-sm">⏮ Prev</button>
              <button id="btnNextEp" class="btn btn-primary btn-sm">Next ⏭</button>
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

// Player initializer using HLS.js
function initVideoPlayer(streamUrl, post, episode, nextEpisode) {
  const video = document.getElementById('animePlayer');
  if (!video) return;

  cleanUpPlayer();

  if (Hls.isSupported()) {
    currentHls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      maxBufferLength: 30,
      maxMaxBufferLength: 60
    });
    currentHls.loadSource(streamUrl);
    currentHls.attachMedia(video);
    currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });
    currentHls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            currentHls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            currentHls.recoverMediaError();
            break;
          default:
            cleanUpPlayer();
            break;
        }
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native Safari support
    video.src = streamUrl;
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(() => {});
    });
  }

  // Restore watch progress
  API.getProgress(post.id).then(res => {
    const prog = res.progress && res.progress[episode.id];
    if (prog && prog.position && prog.position > 10 && prog.duration && (prog.position / prog.duration) < 0.9) {
      video.currentTime = prog.position;
      toast(`Resumed playback at ${Math.floor(prog.position / 60)}:${String(Math.floor(prog.position % 60)).padStart(2, '0')}`);
    }
  }).catch(() => {});

  // Fetch AniSkip intervals (Skip Intro / Outro)
  const skipBtn = document.getElementById('skipBtn');
  activeSkipIntervals = [];

  video.addEventListener('loadedmetadata', () => {
    const duration = video.duration || 1440;
    const epNum = parseInt(episode.num, 10) || 1;
    API.getSkipTimes(post.title, epNum, duration).then(res => {
      if (res.found && res.results) {
        activeSkipIntervals = res.results;
      }
    }).catch(() => {});
  });

  // Time update event for Skip button & Progress sync
  video.ontimeupdate = () => {
    const t = video.currentTime;
    
    // Check if within skip interval
    const match = activeSkipIntervals.find(i => t >= i.start && t < i.end);
    if (match) {
      skipBtn.style.display = 'flex';
      skipBtn.textContent = match.type === 'op' ? '⚡ Skip Intro' : '⚡ Skip Outro';
      skipBtn.onclick = () => {
        video.currentTime = match.end + 0.5;
        skipBtn.style.display = 'none';
      };
    } else {
      skipBtn.style.display = 'none';
    }
  };

  // Sync Progress to SQLite every 5 seconds
  progressInterval = setInterval(() => {
    if (!video.paused && video.currentTime > 5 && video.duration) {
      API.saveProgress({
        anime_id: String(post.id),
        ep_id: String(episode.id),
        position: video.currentTime,
        duration: video.duration,
        anime_title: post.title || '',
        anime_poster: post.poster || '',
        ep_num: String(episode.num || ''),
        ep_name: episode.name || ''
      }).catch(() => {});
    }
  }, 5000);

  // Auto-play Next Episode on ended
  video.onended = () => {
    if (nextEpisode) {
      toast('Episode ended. Loading next episode...', 3000);
      setTimeout(() => {
        location.hash = `#/watch/${post.id}?ep=${nextEpisode.id}`;
      }, 1500);
    }
  };

  // Keyboard Shortcuts
  window.onkeydown = (e) => {
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
    if (e.code === 'Space') {
      e.preventDefault();
      video.paused ? video.play() : video.pause();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.getElementById('videoWrapper').requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      video.muted = !video.muted;
    } else if (e.code === 'KeyN' && nextEpisode) {
      e.preventDefault();
      location.hash = `#/watch/${post.id}?ep=${nextEpisode.id}`;
    }
  };
}

function cleanUpPlayer() {
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
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
