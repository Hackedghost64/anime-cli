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

let currentPost = null;
let currentEp = null;

function toggleHelpModal() {
  const m = document.getElementById('helpModal');
  if (!m) return;
  m.style.display = (m.style.display === 'none' || !m.style.display) ? 'flex' : 'none';
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
    if (!episodes.length) throw new Error("No episodes found for this anime.");

    const progressMap = progData.progress || {};
    let curEp = null;
    if (epIdPref) {
      curEp = episodes.find(e => String(e.id) === String(epIdPref));
    }
    if (!curEp) {
      let latestWatched = null;
      let latestTime = 0;
      for (const ep of episodes) {
        const p = progressMap[String(ep.id)];
        if (p && p.updated_at > latestTime) {
          latestTime = p.updated_at;
          latestWatched = { ep, p };
        }
      }
      curEp = latestWatched ? latestWatched.ep : episodes[0];
    }

    render(`
      <div style="margin-bottom:12px;">
        <a href="#/post/${pid}" style="color:var(--text-dim);font-weight:600;font-size:13px;">← Back to ${esc(post.title)}</a>
      </div>

      <div class="watch-container">
        <div class="player-stage">
          <div class="video-wrapper" id="videoWrapper">
            <div id="vidstackTarget"></div>
            <button id="centerPlayBtn" class="center-play-btn" aria-label="Toggle Play/Pause">
              <span class="icon-play">▶</span>
              <span class="icon-pause" style="display:none;">❚❚</span>
            </button>
            <button id="playerNextEpBtn" class="player-next-ep-btn" style="display:none;" title="Next Episode (N)">
              <span>Next Episode</span> ⏭
            </button>
            <button id="skipBtn" class="skip-button">⚡ Skip Intro</button>
            <div id="playerLoader" class="player-loader" style="display:none;">
              <div class="spinner"></div>
              <div id="loaderText" style="font-size:14px;color:var(--text-dim);">Resolving stream...</div>
            </div>
          </div>

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
              <select id="serverSelect" class="server-dropdown"><option>Loading...</option></select>
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

    const curIdx = episodes.findIndex(e => String(e.id) === String(curEp.id));
    const prevEp = episodes[curIdx - 1];
    const nextEp = episodes[curIdx + 1];

    document.getElementById('btnPrevEp').disabled = !prevEp;
    document.getElementById('btnPrevEp').onclick = () => { if (prevEp) location.hash = `#/watch/${pid}?ep=${prevEp.id}`; };
    document.getElementById('btnNextEp').disabled = !nextEp;
    document.getElementById('btnNextEp').onclick = () => { if (nextEp) location.hash = `#/watch/${pid}?ep=${nextEp.id}`; };

    const srvData = await API.servers(pid, curEp.id);
    const servers = srvData.servers || [];
    if (!servers.length) throw new Error("No video servers found for this episode.");

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
      sSelect.innerHTML = list.map((s, idx) => `<option value="${s.id}">${s.name || `Server ${idx + 1}`}</option>`).join('');
      if (list.length > 0) loadServerStream(list[0].id);
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

    document.getElementById('serverSelect').onchange = (e) => loadServerStream(e.target.value);
    updateServerOptions();

    async function loadServerStream(serverId) {
      const loader = document.getElementById('playerLoader');
      const loaderText = document.getElementById('loaderText');
      loader.style.display = 'flex';
      loaderText.textContent = 'Extracting and proxying stream...';

      try {
        const streamData = await API.stream(pid, serverId);
        const proxyUrl = streamData.proxy_url;
        if (!proxyUrl) throw new Error("Stream URL could not be resolved.");
        await initVideoPlayer(proxyUrl, post, curEp, nextEp);
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

// Ensure Vidstack Player & Layout are loaded reliably
async function getVidstack() {
  if (window.VidstackPlayer && (window.VidstackPlayerLayout || window.VidstackPlayer.Layout?.Default)) {
    return {
      VidstackPlayer: window.VidstackPlayer,
      VidstackPlayerLayout: window.VidstackPlayerLayout || window.VidstackPlayer.Layout.Default
    };
  }
  try {
    const mod = await import('https://cdn.vidstack.io/player');
    const playerCls = mod.VidstackPlayer || window.VidstackPlayer;
    const layoutCls = mod.VidstackPlayerLayout || playerCls?.Layout?.Default || window.VidstackPlayerLayout;
    window.VidstackPlayer = playerCls;
    window.VidstackPlayerLayout = layoutCls;
    return { VidstackPlayer: playerCls, VidstackPlayerLayout: layoutCls };
  } catch (err) {
    console.error("Vidstack load error:", err);
    return {
      VidstackPlayer: window.VidstackPlayer,
      VidstackPlayerLayout: window.VidstackPlayerLayout || window.VidstackPlayer?.Layout?.Default
    };
  }
}

async function initVideoPlayer(streamUrl, post, episode, nextEpisode) {
  cleanUpPlayer();
  currentPost = post;
  currentEp = episode;

  try {
    const { VidstackPlayer, VidstackPlayerLayout } = await getVidstack();
    if (!VidstackPlayer || !VidstackPlayerLayout) {
      throw new Error("Vidstack Player components are unavailable.");
    }

    const target = document.getElementById('vidstackTarget');
    if (!target) return;
    target.innerHTML = '';

    const player = await VidstackPlayer.create({
      target: target,
      src: { src: streamUrl, type: 'application/x-mpegurl' },
      title: `${post.title} - Ep ${episode.num}`,
      autoplay: true,
      layout: new VidstackPlayerLayout({
        colorScheme: 'dark'
      }),
      crossOrigin: true
    });
    window._vidstackPlayer = player;

    // Attach overlays into player so they remain accessible in fullscreen!
    const centerPlayBtn = document.getElementById('centerPlayBtn');
    const playerNextEpBtn = document.getElementById('playerNextEpBtn');
    const skipBtn = document.getElementById('skipBtn');

    if (centerPlayBtn && player) player.appendChild(centerPlayBtn);
    if (playerNextEpBtn && player) player.appendChild(playerNextEpBtn);
    if (skipBtn && player) player.appendChild(skipBtn);

    // Center Play / Pause Button logic
    if (centerPlayBtn) {
      centerPlayBtn.style.display = 'flex';
      const iconPlay = centerPlayBtn.querySelector('.icon-play');
      const iconPause = centerPlayBtn.querySelector('.icon-pause');

      const updateCenterBtn = () => {
        const isPaused = player.paused;
        if (iconPlay) iconPlay.style.display = isPaused ? 'block' : 'none';
        if (iconPause) iconPause.style.display = isPaused ? 'none' : 'block';
      };

      player.addEventListener('play', updateCenterBtn);
      player.addEventListener('pause', updateCenterBtn);
      updateCenterBtn();

      centerPlayBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (player.paused) {
          player.play().catch(() => {});
        } else {
          player.pause().catch(() => {});
        }
        updateCenterBtn();
      };

      // Prevent taps/clicks on center button from triggering gestures or double-click zoom
      centerPlayBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      centerPlayBtn.addEventListener('dblpointerup', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      centerPlayBtn.ondblclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
      };
    }

    // In-Player Next Episode Button logic
    if (playerNextEpBtn) {
      if (nextEpisode) {
        playerNextEpBtn.style.display = 'flex';
        playerNextEpBtn.title = `Next Episode (#${nextEpisode.num}) [N]`;
        playerNextEpBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          location.hash = `#/watch/${post.id}?ep=${nextEpisode.id}`;
        };
      } else {
        playerNextEpBtn.style.display = 'none';
      }
    }

    // Add Next Episode button to bottom controls bar as well
    const addControlsNextBtn = () => {
      if (!nextEpisode) return;
      const controlsGroup = player.querySelector('.vds-controls-group');
      if (controlsGroup && !controlsGroup.querySelector('.vds-custom-next-btn')) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'vds-button vds-custom-next-btn';
        nextBtn.setAttribute('aria-label', `Next Episode (#${nextEpisode.num})`);
        nextBtn.title = `Next Episode (#${nextEpisode.num}) [N]`;
        nextBtn.innerHTML = `<span style="font-size:16px;line-height:1;">⏭</span>`;
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          location.hash = `#/watch/${post.id}?ep=${nextEpisode.id}`;
        };
        const playBtn = controlsGroup.querySelector('.vds-play-button');
        if (playBtn && playBtn.nextSibling) {
          controlsGroup.insertBefore(nextBtn, playBtn.nextSibling);
        } else {
          controlsGroup.appendChild(nextBtn);
        }
      }
    };
    addControlsNextBtn();

    // Prevent double-tapping in the middle from minimizing or toggling fullscreen
    player.addEventListener('will-trigger', (e) => {
      if (typeof e.detail === 'string' && e.detail.includes('fullscreen')) {
        e.preventDefault();
      }
    });

    const disableFullscreenGestures = () => {
      player.querySelectorAll('media-gesture[action*="fullscreen"]').forEach(g => g.remove());
    };
    disableFullscreenGestures();

    const gestureObserver = new MutationObserver(() => {
      disableFullscreenGestures();
      addControlsNextBtn();
    });
    gestureObserver.observe(player, { childList: true, subtree: true });
    window._vidstackObserver = gestureObserver;

    // Heartbeat: save progress every 10s during active playback
    let lastHeartbeat = 0;
    const saveProgress = (pos, dur, finished = false) => {
      if (pos > 5 && dur > 0) {
        if (!finished && Math.abs(pos - lastHeartbeat) < 2) return;
        lastHeartbeat = pos;
        API.saveProgress({
          anime_id: String(post.id),
          ep_id: String(episode.id),
          position: pos,
          duration: dur,
          anime_title: post.title || '',
          anime_poster: post.poster || '',
          ep_num: String(episode.num || ''),
          ep_name: episode.name || ('Episode ' + episode.num)
        }).catch(() => {});
      }
    };

    const hbTimer = setInterval(() => {
      if (player && !player.paused) {
        saveProgress(player.currentTime, player.duration);
      }
    }, 10000);

    // Save progress on page close or navigation
    const onUnload = () => {
      if (player && player.currentTime > 5) {
        const payload = JSON.stringify({
          anime_id: String(post.id),
          ep_id: String(episode.id),
          position: player.currentTime,
          duration: player.duration || 0,
          anime_title: post.title || '',
          anime_poster: post.poster || '',
          ep_num: String(episode.num || ''),
          ep_name: episode.name || ('Episode ' + episode.num)
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/user/progress', new Blob([payload], { type: 'application/json' }));
        }
      }
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);

    // Resume from saved progress without race condition
    API.getProgress(post.id).then(res => {
      const prog = res.progress && res.progress[episode.id];
      if (prog && prog.position && prog.position > 5) {
        const doResume = () => {
          player.currentTime = prog.position;
          toast(`Resumed playback at ${formatTime(prog.position)}`, 2500);
        };
        if (player.canPlay || player.state?.canPlay) {
          doResume();
        } else {
          player.addEventListener('can-play', doResume, { once: true });
        }
      }
    }).catch(() => {});

    // Autoplay next episode when current finishes
    player.addEventListener('ended', () => {
      saveProgress(player.duration, player.duration, true);
      if (nextEpisode) {
        toast(`Episode ended. Autoplaying #${nextEpisode.num}...`, 2500);
        setTimeout(() => {
          location.hash = `#/watch/${post.id}?ep=${nextEpisode.id}`;
        }, 1200);
      }
    });

    // AniSkip integration
    let markers = { introStart: null, introEnd: null, creditsStart: null };
    API.getSkipTimes(post.title, parseInt(episode.num, 10) || 1, 1440).then(res => {
      if (res.found && res.results) {
        const op = res.results.find(r => r.type === 'op');
        const ed = res.results.find(r => r.type === 'ed');
        markers.introStart = op ? op.start : null;
        markers.introEnd = op ? op.end : null;
        markers.creditsStart = ed ? ed.start : null;
      }
    }).catch(() => {});

    let skipAction = null;
    if (skipBtn) {
      skipBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (skipAction === 'intro' && markers.introEnd) {
          player.currentTime = markers.introEnd + 0.5;
          skipBtn.style.display = 'none';
          toast("⚡ Skipped Intro", 1500);
        } else if (skipAction === 'outro' && player.duration) {
          player.currentTime = player.duration - 1;
          skipBtn.style.display = 'none';
          toast("⚡ Skipped Outro", 1500);
        }
      };
    }

    player.addEventListener('time-update', () => {
      const t = player.currentTime;
      const dur = player.duration;
      let show = false;

      if (markers.introStart !== null && markers.introEnd !== null && t >= markers.introStart && t < markers.introEnd) {
        show = true;
        skipAction = 'intro';
        if (skipBtn) skipBtn.textContent = '⚡ Skip Intro';
      } else if (markers.creditsStart !== null && dur > 0 && t >= markers.creditsStart && t < (dur - 5)) {
        show = true;
        skipAction = 'outro';
        if (skipBtn) skipBtn.textContent = '⚡ Skip Outro';
      }
      if (skipBtn) skipBtn.style.display = show ? 'flex' : 'none';
    });

    // Custom Keyboard Shortcuts
    window.onkeydown = (e) => {
      if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) return;
      if (e.code === 'KeyT') {
        e.preventDefault();
        toggleTheaterMode();
      } else if (e.code === 'KeyN' && nextEpisode) {
        e.preventDefault();
        location.hash = `#/watch/${post.id}?ep=${nextEpisode.id}`;
      } else if (e.key === '?') {
        e.preventDefault();
        toggleHelpModal();
      }
    };

    // Store cleanup data
    window._vidstackCleanup = () => {
      clearInterval(hbTimer);
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };

  } catch (err) {
    console.error("Vidstack init error:", err);
    toast("Player error: " + err.message, 4000);
  }
}

function cleanUpPlayer() {
  if (window._vidstackObserver) {
    try { window._vidstackObserver.disconnect(); } catch (e) {}
    window._vidstackObserver = null;
  }
  const videoWrapper = document.getElementById('videoWrapper');
  ['centerPlayBtn', 'playerNextEpBtn', 'skipBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el && videoWrapper && el.parentElement !== videoWrapper) {
      videoWrapper.appendChild(el);
      el.style.display = 'none';
    }
  });
  if (window._vidstackPlayer) {
    try {
      window._vidstackPlayer.destroy();
    } catch (e) {}
    window._vidstackPlayer = null;
  }
  if (window._vidstackCleanup) {
    try {
      window._vidstackCleanup();
    } catch (e) {}
    window._vidstackCleanup = null;
  }
  const target = document.getElementById('vidstackTarget');
  if (target) {
    target.innerHTML = '';
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

// Expose functions globally for HTML onclick event handlers
window.toggleHelpModal = toggleHelpModal;
window.toggleTheaterMode = toggleTheaterMode;
window.toast = toast;
window.viewHome = viewHome;
window.viewPost = viewPost;
window.viewWatch = viewWatch;
window.viewWatchlist = viewWatchlist;
window.viewBinge = viewBinge;
window.viewToday = viewToday;
window.removeCW = removeCW;
window.cleanUpPlayer = cleanUpPlayer;
window.initVideoPlayer = initVideoPlayer;
