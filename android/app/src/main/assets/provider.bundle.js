/**
 * Shinsei Anime Provider Bundle
 * Autonomous, standalone extraction logic for Anilab2 API + Kyoto Player HLS streams.
 * Evaluates cleanly in Node.js, Web Browsers, and Android QuickJS.
 */
(function(exports) {
  'use strict';

  exports.version = "1.1.0";

  const ANILAB_BASE = "https://anilab2.amdapi.click/api";
  const KYOTO_BASE = "https://app.kyotoplayer.com/api/v4";
  const ANISKIP_BASE = "https://api.aniskip.com/v2";

  const DEFAULT_HEADERS = {
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

  /**
   * 1. Home Feed Spotlight and Curated Rails
   */
  exports.getHomeFeed = async function() {
    try {
      const data = await requestJson(`${ANILAB_BASE}/home`, { headers: DEFAULT_HEADERS });
      const spotlight = (data.spotlight || data.data?.spotlight || []).map(item => ({
        id: String(item.id || item.post_id),
        title: item.title || item.name || "Featured Anime",
        poster: item.poster || item.image || "",
        backdrop: item.backdrop || item.banner || item.poster || "",
        synopsis: item.synopsis || item.description || "",
        genres: Array.isArray(item.genres) ? item.genres : []
      }));

      const rails = [];
      if (Array.isArray(data.trending || data.data?.trending)) {
        rails.push({
          title: "Trending Now",
          items: (data.trending || data.data.trending).map(formatAnimeItem)
        });
      }
      if (Array.isArray(data.latest || data.data?.latest)) {
        rails.push({
          title: "Top Airing Releases",
          items: (data.latest || data.data.latest).map(formatAnimeItem)
        });
      }
      return { spotlight, rails };
    } catch (err) {
      return { spotlight: [], rails: [] };
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

      // In Anilab API, search items only contain { id, poster }.
      // Hydrate titles for top results in parallel.
      const toHydrate = rawPosts.slice(0, 10);
      const hydrated = await Promise.allSettled(
        toHydrate.map(p => exports.getPost(p.id))
      );

      const results = rawPosts.map((p, idx) => {
        if (idx < hydrated.length && hydrated[idx].status === 'fulfilled' && hydrated[idx].value?.title) {
          return {
            ...formatAnimeItem(p),
            ...hydrated[idx].value
          };
        }
        return formatAnimeItem(p);
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
    try {
      const data = await requestJson(`${ANILAB_BASE}/post?id=${encodeURIComponent(postId)}`, {
        headers: DEFAULT_HEADERS
      });
      const p = data.data || data;
      return {
        id: String(p.id || postId),
        title: p.title || p.name || p.english || "Unknown Title",
        poster: p.poster || p.image || "",
        backdrop: p.backdrop || p.banner || p.poster || "",
        synopsis: p.synopsis || p.description || "",
        rating: p.score || p.rating || "N/A",
        year: p.year || "",
        genres: Array.isArray(p.genres) ? p.genres : [],
        type: p.type || "TV"
      };
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
      return list.map(s => ({
        id: String(s.id),
        lang: s.lang === 'dub' ? 'dub' : 'sub',
        name: s.name || `Server ${s.id}`
      }));
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
      headers: { "Referer": "https://play.app/", "User-Agent": BROWSER_UA }
    };
  };

  /**
   * 7. AniSkip Integration
   */
  exports.getSkipTimes = async function(title, epNum) {
    if (!title) return { op: null, ed: null };
    try {
      const epInt = isNaN(parseInt(epNum, 10)) ? 1 : parseInt(epNum, 10);
      const alRes = await requestJson(`https://graphql.anilist.co`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          query: `query ($q: String) { Media (search: $q, type: ANIME) { id } }`,
          variables: { q: title }
        })
      });
      const malOrAlId = alRes?.data?.Media?.id;
      if (!malOrAlId) return { op: null, ed: null };

      const skipUrl = `${ANISKIP_BASE}/skip-times/${malOrAlId}/${epInt}?types[]=op&types[]=ed&episodeLength=1440`;
      const skipData = await requestJson(skipUrl);
      if (!skipData.found || !Array.isArray(skipData.results)) return { op: null, ed: null };

      const op = skipData.results.find(r => r.type === 'op');
      const ed = skipData.results.find(r => r.type === 'ed');

      return {
        op: op ? [op.interval.startTime, op.interval.endTime] : null,
        ed: ed ? [ed.interval.startTime, ed.interval.endTime] : null
      };
    } catch (err) {
      return { op: null, ed: null };
    }
  };

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
      type: p.type || "TV"
    };
  }

})(typeof globalThis !== 'undefined' ? (globalThis.__provider = globalThis.__provider || {}) : this);
