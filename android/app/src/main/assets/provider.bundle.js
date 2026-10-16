/**
 * Shinsei Anime Provider Bundle
 * Autonomous, standalone extraction logic for Anilab2 API + Kyoto Player HLS streams.
 * Evaluates cleanly in Node.js, Web Browsers, and Android QuickJS.
 */
(function(exports) {
  'use strict';

  exports.version = "1.5.1";

  const _cfg = (typeof globalThis.APP_CONFIG === 'object' && globalThis.APP_CONFIG) || {};
  const ANILAB_BASE = (_cfg.anilab && _cfg.anilab.base_url) || "https://anilab2.amdapi.click/api";
  const KYOTO_BASE = (_cfg.kyoto && _cfg.kyoto.base_url) || "https://app.kyotoplayer.com/api/v4";
  const ANISKIP_BASE = (_cfg.aniskip && _cfg.aniskip.base_url) || "https://api.aniskip.com/v2";

  const DEFAULT_HEADERS = (_cfg.anilab && _cfg.anilab.headers) || {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "os-version": "35",
    "app-id": "com.xo.anilab",
    "app-version": "105",
    "User-Agent": "okhttp/4.12.0"
  };

  const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
  const M3U8_REGEX = /https?:\/\/[^\s"'<>\\]+?\.m3u8[^\s"'<>\\]*/g;

  // Unified HTTP Transport: works across Node.js fetch and Android QuickJS httpFetch
  async function requestText(url, options = {}) {
    if (typeof globalThis.httpFetch === 'function') {
      const res = await globalThis.httpFetch(url, options);
      return typeof res === 'string' ? res : JSON.stringify(res);
    }
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.text();
  }

  async function requestJson(url, options = {}) {
    const text = await requestText(url, options);
    if (!text || !text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch (e) {
      return { _raw: text };
    }
  }

  const postCache = new Map();

  function isAdultContent(p) {
    if (!p) return false;
    const genres = (typeof p.genres === 'string' ? p.genres : (Array.isArray(p.genres) ? p.genres.join(', ') : '')).toLowerCase();
    const age = String(p.age || p.rating || '').toLowerCase();
    const title = String(p.title || p.name || '').toLowerCase();
    const synopsis = String(p.synopsis || p.overview || p.description || '').toLowerCase();

    if (genres.includes('hentai') || genres.includes('erotica')) return true;
    if (age.includes('18+') || age === 'rx' || age === 'r+') return true;
    if (title.includes('hentai')) return true;
    return false;
  }

  /**
   * 1. Home Feed Spotlight and Curated Rails
   * Optimized for instant load time with clean non-adult curation.
   */
  exports.getHomeFeed = async function() {
    try {
      const data = await requestJson(`${ANILAB_BASE}/home`, { headers: DEFAULT_HEADERS });
      const spotlight = [];
      const rails = [];

      // 1. Featured Spotlight Banner (Top item from Anilab API, verify not adult)
      if (data.featured && (data.featured.id || data.featured.title)) {
        const feat = data.featured;
        postCache.set(String(feat.id), feat);
        if (!isAdultContent(feat)) {
          spotlight.push({
            id: String(feat.id),
            title: feat.title || "Featured Anime",
            poster: feat.poster || "",
            backdrop: feat.backdrop || feat.banner || feat.poster || "",
            synopsis: feat.synopsis || feat.overview || "",
            score: feat.score || feat.rating || "",
            type: feat.type || "TV",
            genres: typeof feat.genres === 'string' ? feat.genres.split(',').map(s => s.trim()) : (Array.isArray(feat.genres) ? feat.genres : []),
            isAdult: false
          });
        }
      }

      // 2. Sections (Spotlight, Trending, Most Popular, Top Airing, etc.)
      const sections = Array.isArray(data.sections) ? data.sections : [];

      // Find the official Spotlight section (up to 10 items for the hero carousel)
      const spotlightSec = sections.find(s => s.name && s.name.toLowerCase() === 'spotlight');
      const spotlightPosts = (spotlightSec && Array.isArray(spotlightSec.posts)) ? spotlightSec.posts.slice(0, 10) : [];

      // Hydrate all spotlight posts (up to 10) in parallel with a 3.5s timeout guard
      const spotlightToHydrate = spotlightPosts
        .map(p => String(p.id))
        .filter(pid => pid && !postCache.has(pid))
        .slice(0, 10);

      if (spotlightToHydrate.length > 0) {
        try {
          const hydrateTask = Promise.allSettled(spotlightToHydrate.map(async id => {
            try {
              const pData = await exports.getPost(id);
              if (pData && pData.title) postCache.set(id, pData);
            } catch {}
          }));
          await Promise.race([
            hydrateTask,
            new Promise(resolve => setTimeout(resolve, 3500))
          ]);
        } catch {}
      }

      // Populate spotlight carousel items (strictly non-adult, valid titles only)
      for (const p of spotlightPosts) {
        const pid = String(p.id);
        if (spotlight.some(s => s.id === pid)) continue;
        const cached = postCache.get(pid);
        if (isAdultContent(cached || p)) continue;

        const title = cached?.title || p.title || p.name || "";
        if (!title || title.toLowerCase() === "anime") continue;

        spotlight.push({
          id: pid,
          title: title,
          poster: cached?.poster || p.poster || "",
          backdrop: cached?.backdrop || cached?.poster || p.poster || "",
          synopsis: cached?.synopsis || "",
          score: cached?.rating || p.score || "",
          type: cached?.type || p.type || "TV",
          genres: cached?.genres || [],
          isAdult: false
        });
      }

      // Rails: populate from section posts, strictly filter out adult/hentai content
      for (const sec of sections) {
        if (sec.name && sec.name.toLowerCase() === 'spotlight') continue;
        const posts = (sec.posts || []).map(p => {
          const pid = String(p.id);
          const cached = postCache.get(pid);
          const adult = isAdultContent(cached || p);
          return {
            id: pid,
            title: cached?.title || p.title || p.name || "",
            poster: p.poster || cached?.poster || "",
            score: cached?.rating || p.score || "",
            type: cached?.type || p.type || "TV",
            isAdult: adult
          };
        }).filter(p => p.id && (p.poster || p.title) && !p.isAdult);

        if (posts.length > 0) {
          rails.push({
            title: sec.name || "Curated Anime",
            items: posts
          });
        }
      }

      // If spotlight had none, populate from first non-adult rail
      if (spotlight.length === 0 && rails.length > 0 && rails[0].items.length > 0) {
        const first = rails[0].items[0];
        if (!first.isAdult) {
          spotlight.push({
            id: first.id,
            title: first.title,
            poster: first.poster,
            backdrop: first.poster,
            synopsis: "",
            score: first.score,
            type: first.type,
            genres: [],
            isAdult: false
          });
        }
      }

      // Combined flat items list (non-adult only)
      const items = [];
      const seenIds = new Set();
      for (const rail of rails) {
        for (const item of rail.items) {
          if (!seenIds.has(item.id) && !item.isAdult) {
            seenIds.add(item.id);
            items.push(item);
          }
        }
      }

      return { spotlight, rails, items };
    } catch (err) {
      return { spotlight: [], rails: [], items: [] };
    }
  };

  /**
   * 2. Search Catalog with Metadata Hydration
   */
  exports.search = async function(query, page = 1) {
    if (!query || !query.trim()) return { results: [], hasMore: false };
    try {
      const data = await requestJson(`${ANILAB_BASE}/search?query=${encodeURIComponent(query)}&page=${page}`, {
        headers: DEFAULT_HEADERS
      });
      const rawPosts = data.posts || (data.data && data.data.posts) || [];
      if (!rawPosts.length) return { results: [], hasMore: false };

      // In Anilab API, search items contain { id, poster }.
      // Hydrate titles for top 8 results with a 3.0s maximum timeout guard.
      const toHydrate = rawPosts.slice(0, 8);
      try {
        const hydTask = Promise.allSettled(
          toHydrate.map(p => exports.getPost(p.id))
        );
        await Promise.race([
          hydTask,
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
      } catch {}

      const results = rawPosts.map((p) => {
        const pid = String(p.id);
        const cached = postCache.get(pid);
        const adult = isAdultContent(cached || p);
        if (cached && cached.title) {
          return {
            ...formatAnimeItem(p),
            ...cached,
            isAdult: adult
          };
        }
        return {
          ...formatAnimeItem(p),
          isAdult: adult
        };
      });

      return {
        results,
        hasMore: rawPosts.length >= 20
      };
    } catch (err) {
      return { results: [], hasMore: false };
    }
  };

  /**
   * 3. Fetch Full Anime Details
   */
  exports.getPost = async function(postId) {
    if (!postId) return null;
    const key = String(postId);
    if (postCache.has(key)) return postCache.get(key);
    try {
      const data = await requestJson(`${ANILAB_BASE}/post?id=${encodeURIComponent(postId)}`, {
        headers: DEFAULT_HEADERS
      });
      const p = data.data || data;
      const adult = isAdultContent(p);
      const res = {
        id: String(p.id || postId),
        title: p.title || p.name || p.english || "Unknown Title",
        poster: p.poster || p.image || "",
        backdrop: p.backdrop || p.banner || p.poster || "",
        synopsis: p.synopsis || p.description || p.overview || "",
        rating: p.score || p.rating || "N/A",
        age: p.age || "",
        year: p.year || "",
        genres: typeof p.genres === 'string' ? p.genres.split(',').map(s => s.trim()) : (Array.isArray(p.genres) ? p.genres : []),
        type: p.type || "TV",
        seasons: (p.seasons || []).map((s, i) => ({
            id: String(s.id || ''),
            title: s.title || `Season ${s.season_number || i + 1}`,
            seasonNumber: s.season_number || i + 1
        })),
        mal_id: p.mal_id || p.malId || 0,
        isAdult: adult
      };
      postCache.set(key, res);
      return res;
    } catch (err) {
      return null;
    }
  };

  /**
   * 4. Fetch Episode List
   */
  exports.getEpisodes = async function(animeId) {
    if (!animeId) return [];
    try {
      const routes = await getKyotoRoutes(animeId);
      const epUrl = routes.episodes.replace("%id%", String(animeId)).replace("{id}", String(animeId));
      const headers = {
        ...DEFAULT_HEADERS,
        ...routes.extraHeaders,
        "Referer": "https://play.app/",
        "X-Requested-With": "PLAY",
        "User-Agent": BROWSER_UA
      };
      const data = await requestJson(epUrl, { headers });
      const list = data.list || [];
      return list.map(e => ({
        id: String(e.id),
        num: String(e.number !== undefined && e.number !== null ? e.number : ""),
        name: e.name || `Episode ${e.number || '?'}`
      }));
    } catch (err) {
      return [];
    }
  };

  /**
   * 5. Fetch Servers (Sub / Dub)
   */
  exports.getServers = async function(animeId, epId) {
    if (!animeId || !epId) return [];
    try {
      const routes = await getKyotoRoutes(animeId);
      const srvUrl = routes.servers.replace("%id%", String(epId));
      const headers = {
        ...DEFAULT_HEADERS,
        ...routes.extraHeaders,
        "Referer": "https://play.app/",
        "X-Requested-With": "PLAY",
        "User-Agent": BROWSER_UA
      };
      const data = await requestJson(srvUrl, { headers });
      const list = data.list || [];
      return list.map(s => {
        const language = String(s.lang || '').trim().toLowerCase();
        const isDub = language.startsWith('dub') || ['en', 'eng', 'english'].includes(language);
        return {
          id: String(s.id),
          lang: isDub ? 'dub' : 'sub',
          name: s.name || `Server ${s.id}`
        };
      });
    } catch (err) {
      return [];
    }
  };

  /**
   * 6. Resolve Direct Master .m3u8 Stream
   */
  exports.resolveStream = async function(animeId, serverId) {
    if (!animeId || !serverId) throw new Error("Missing animeId or serverId");
    const routes = await getKyotoRoutes(animeId);
    const iframeUrl = routes.iframe.replace("%id%", String(serverId));
    const headers = {
      ...DEFAULT_HEADERS,
      ...routes.extraHeaders,
      "Referer": "https://play.app/",
      "X-Requested-With": "PLAY",
      "User-Agent": BROWSER_UA
    };

    // Step 1: Query embed link
    const data = await requestJson(iframeUrl, { headers });
    const link = data.link;
    if (!link) throw new Error(`Embedder returned no link for server ${serverId}`);

    if (link.toLowerCase().includes('.m3u8')) {
      return { url: link, headers: { "Referer": "https://play.app/", "User-Agent": BROWSER_UA } };
    }

    // Step 2: Fetch embed HTML and scrape .m3u8 URL
    const html = await requestText(link, { headers: { "Referer": "https://play.app/", "User-Agent": BROWSER_UA } });
    const matches = html.match(M3U8_REGEX);
    if (!matches || !matches.length) throw new Error("No .m3u8 streams found in embed player HTML");

    const best = matches.find(m => m.toLowerCase().includes('master.m3u8')) || matches[0];
    return {
      url: best,
      stream_url: best,
      headers: { "Referer": "https://play.app/", "User-Agent": BROWSER_UA }
    };
  };

  /**
   * Dedicated Kyoto Episode Stream Resolver for Mobile
   */
  exports.resolveKyotoStream = async function(animeId, epNum, serverId = "4", dub = false) {
    if (!animeId) throw new Error("Missing animeId");
    const episodes = await exports.getEpisodes(animeId);
    if (!episodes.length) throw new Error("No episodes found for anime " + animeId);

    const ep = episodes.find(e => String(e.num) === String(epNum)) || episodes[0];
    const servers = await exports.getServers(animeId, ep.id);

    if (!servers.length) {
      throw new Error("No playback servers found for episode " + epNum);
    }

    let candidates;
    if (dub) {
      candidates = servers.filter(s => s.lang === 'dub');
      if (!candidates.length) {
        throw new Error("No dub servers available for episode " + epNum);
      }
    } else {
      const preferred = servers.find(s => String(s.id) === String(serverId) && s.lang !== 'dub');
      candidates = [preferred, ...servers.filter(s => s.lang !== 'dub' && s !== preferred)].filter(Boolean);
      // Keep playback available when the episode only exposes dubbed streams.
      if (!candidates.length) candidates = servers;
    }

    let lastError = null;
    for (const candidate of candidates) {
      try {
        return await exports.resolveStream(animeId, candidate.id);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("No playable servers found for episode " + epNum);
  };

  /**
   * 7. AniSkip Integration (AniSkip requires a MyAnimeList ID)
   */
  exports.getSkipTimes = async function(titleOrMalId, epNum) {
    if (!titleOrMalId) return { op: null, ed: null };
    try {
      const epInt = isNaN(parseInt(epNum, 10)) ? 1 : parseInt(epNum, 10);
      const idsToCheck = [];

      if (typeof titleOrMalId === 'number' || /^\d+$/.test(String(titleOrMalId).trim())) {
        idsToCheck.push(parseInt(titleOrMalId, 10));
      } else {
        const cleanTitle = String(titleOrMalId)
          .replace(/\s*\(?(TV|Dub|Sub|Season\s*\d+|Part\s*\d+|Cour\s*\d+)\)?/gi, '')
          .replace(/[:\-_]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const searchTitles = [cleanTitle, String(titleOrMalId).trim()].filter((v, i, a) => v && a.indexOf(v) === i);

        for (const q of searchTitles) {
          try {
            const alRes = await requestJson(`https://graphql.anilist.co`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
              body: JSON.stringify({
                query: `query ($q: String) { Media (search: $q, type: ANIME) { id idMal } }`,
                variables: { q }
              })
            });
            const m = alRes?.data?.Media;
            // AniSkip's endpoint expects a MyAnimeList ID, not AniList's ID.
            if (m?.idMal && !idsToCheck.includes(m.idMal)) idsToCheck.push(m.idMal);
            if (idsToCheck.length > 0) break;
          } catch {}
        }

        // Secondary fallback: Jikan API
        if (idsToCheck.length === 0) {
          try {
            const jikanRes = await requestJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanTitle)}&limit=1`);
            const jPost = jikanRes?.data?.[0];
            if (jPost?.mal_id && !idsToCheck.includes(jPost.mal_id)) {
              idsToCheck.push(jPost.mal_id);
            }
          } catch {}
        }
      }

      if (idsToCheck.length === 0) return { op: null, ed: null };

      for (const targetId of idsToCheck) {
        try {
          // AniSkip treats episodeLength=0 as no duration filter.
          const skipUrl = `${ANISKIP_BASE}/skip-times/${targetId}/${epInt}?types[]=op&types[]=ed&episodeLength=0`;
          const skipData = await requestJson(skipUrl);
          if (skipData && skipData.found && Array.isArray(skipData.results) && skipData.results.length > 0) {
            const op = skipData.results.find(r => r.skipType === 'op');
            const ed = skipData.results.find(r => r.skipType === 'ed');
            if (op || ed) {
              return {
                op: op ? [op.interval.startTime, op.interval.endTime] : null,
                ed: ed ? [ed.interval.startTime, ed.interval.endTime] : null
              };
            }
          }
        } catch {}
      }

      return { op: null, ed: null };
    } catch (err) {
      return { op: null, ed: null };
    }
  };

  // Aliases for unified SDK contract
  exports.getHome = exports.getHomeFeed;
  exports.getDetails = exports.getPost;

  // Helper Utilities
  async function getKyotoRoutes(postId) {
    const data = await requestJson(`${KYOTO_BASE}/post?id=${encodeURIComponent(postId)}`, {
      headers: DEFAULT_HEADERS
    });
    const epUrl = typeof data.episodes === 'string' ? data.episodes : null;
    const svUrl = typeof data.servers === 'string' ? data.servers : null;
    let ifUrl = null;
    const extraHeaders = {};

    if (typeof data.server === 'string') {
      ifUrl = data.server;
    } else if (data.server && typeof data.server === 'object') {
      ifUrl = data.server.url;
      if (Array.isArray(data.server.headers)) {
        for (const [k, v] of data.server.headers) {
          extraHeaders[String(k)] = String(v);
        }
      }
    }
    if (!epUrl || !svUrl || !ifUrl) {
      throw new Error(`Invalid Kyoto routes for post ${postId}`);
    }
    return { episodes: epUrl, servers: svUrl, iframe: ifUrl, extraHeaders };
  }

  function formatAnimeItem(p) {
    return {
      id: String(p.id || p.post_id || ""),
      title: p.title || p.name || "",
      poster: p.poster || p.image || "",
      score: p.score || p.rating || "",
      type: p.type || "TV",
      isAdult: isAdultContent(p)
    };
  }

})(typeof globalThis !== 'undefined' ? (globalThis.ShinseiProvider = globalThis.__provider = globalThis.__provider || {}) : this);
