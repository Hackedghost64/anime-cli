# Design Specification: Shinsei Anime Native Android App & Dynamic Script Runner

**Date:** 2026-09-25  
**Version:** 1.0.0  
**Target:** Android APK (API 26+ / Android 8.0 to Android 15+)  
**Repository Location:** `/home/divyam/Downloads/projects/anime-cli/android`

---

## 1. Executive Summary

Shinsei Anime is an autonomous, lightweight native Android media streaming application built with **Jetpack Compose** and **Android Jetpack Media3 (ExoPlayer)**. 

### Core Problems Solved:
1. **Zero PC Bottleneck**: Eliminates the requirement to keep a PC running with a web browser or Cloudflare tunnel. Playback happens directly on the mobile device.
2. **Zero Browser CORS Restrictions**: Mobile native media engines (ExoPlayer) do not enforce browser CORS policies, enabling direct playback of Kyoto and Anilab 1080p master HLS (`.m3u8`) streams without a local reverse proxy.
3. **Hot-Reloadable Extraction ("Dumb Runner")**: Fragile scraping logic, endpoints, and headers live inside a modular `provider.bundle.js` evaluated by an embedded **QuickJS** runtime with a headless WebView fallback for Cloudflare Turnstile/Managed Challenges. Updates occur over the air or via QR scan without rebuilding the APK.
4. **Instant P2P Sync (`anime-cli sync`)**: A 50ms local Wi-Fi handshake via an ephemeral QR code syncs watch history between the phone's Room database and the PC's SQLite database.

---

## 2. Visual Design System & UX Psychology

### 2.1 Thematic Palette (OLED Cinema)
* **Canvas Background**: `#08090D` (True Obsidian Black)
* **Surface Card**: `#12151E` (Subtle 1dp elevation)
* **Surface Hover/Active**: `#1A1F2C`
* **Brand Primary Accent**: `#FF640A` (Crunchyroll Electric Orange)
* **Brand Accent Low-Alpha**: `rgba(255, 100, 10, 0.15)`
* **Text High-Contrast**: `#FFFFFF`
* **Text Muted/Secondary**: `#9BA3B8`
* **Hairline Border**: `#1E2332`

### 2.2 Typography
* **Headers / Anime Titles**: *Inter Display* / *Outfit Extra Bold* (800 weight, `-0.02em` tracking).
* **Body / Episode Details**: *Inter* (500/600 weight, `14px–15px`).
* **Tags / Indicators**: Monospace / Compact Sans (700 weight, uppercase `SUB`, `DUB`, `1080P`).

### 2.3 UX Behavioral Psychology
* **Fitts's Law (Thumb Reach)**: Primary interactive controls (Bottom navigation, Center Play, Scrubber) are located within the thumb reach zone.
* **Zeigarnik Effect (The Urge to Finish)**: The "Continue Watching" rail is permanently pinned directly beneath the Hero Billboard with an exact progress track and remaining time (`Ep 5 · 14m left`).
* **Sensory Feedback**: Haptic ticks (`HapticFeedbackConstants.CLOCK_TICK`) fire on timeline scrubbing, double-tap seek intervals, and skip buttons.

---

## 3. Screen Architecture

### 3.1 Splash & Provider Loader
* Reads `provider.bundle.js` from internal storage (`context.filesDir/scripts/provider.bundle.js`).
* If absent (first launch), copies the bundled asset `default_provider.js` to internal storage.
* Validates exports: `search`, `getHomeFeed`, `getEpisodes`, `resolveStream`.
* Loads in `<150ms`.

### 3.2 Home Screen
* **Top Bar**: Shinsei Logo, Search action, and "Sync with PC" QR button.
* **Hero Billboard**: Spotlight featured anime with high-res visual artwork, title, genres, and a prominent "▶ Play S1 E1" CTA.
* **Continue Watching Rail (`LazyRow`)**: Dynamic cards showing episode snapshot, progress bar, badge (`S1:E4`), and single-tap resume.
* **Curated Category Rails**:
  * *Top Airing This Season*
  * *Trending on Anilab*
  * *English Dubs Spotlight*
  * *All-Time Classics*

### 3.3 Details & Episode Screen
* **Hero Backdrop**: Banner visual with gradient fade into background.
* **Metadata Strip**: Rating (`★ 8.8`), Year (`2024`), Episodes (`24 eps`), TV Rating (`TV-MA`).
* **Audio Switcher Pill**: `SUB` / `DUB` toggle buttons. Remembers user preference globally.
* **Episode List (`LazyColumn`)**: Episode cards with thumbnail, episode number, duration, name, synopsis, and unwatched/progress indicator.

### 3.4 Player Screen (1:1 Crunchyroll Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CRUNCHYROLL PLAYER SCREEN                         │
├────────────────────────────────────────────────────────────────────────┤
│  Top Bar: [←] "Jujutsu Kaisen"  E5 - "Curse Womb"   [⏭ Next] [⚙] [⤢]  │
│                                                                        │
│                   [⏪ 10]      [ ▶ / ❚❚ ]      [10 ⏩]                 │
│                                                                        │
│                                                   [⚡ Skip Intro]      │
│  04:12 ━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -19:28        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Controls & Placement:
* **Top Bar**:
  * `[←]`: Back to details.
  * Title & Subtitle: Anime name and current episode name.
  * `[⏭ Next]`: Jump to next episode (disabled if on final episode).
  * `[⚙]`: Settings sheet (Quality selector: 1080p/720p/Auto, Playback Speed: 0.75x–2.0x, Audio/Subtitles).
  * `[⤢]`: Aspect ratio toggle (Original 16:9 Fit vs 20:9 Fill/Crop).
* **Center Playhead**:
  * Circular Play/Pause button (`▶` / `❚❚`) with glassmorphic backing.
  * Flanked by `[⏪ 10]` and `[10 ⏩]`.
  * Auto-hides after 3 seconds of user inactivity.
* **Bottom Timeline**:
  * No redundant bottom play/pause button.
  * Current time (`04:12`) on left, remaining time countdown (`-19:28`) on right.
  * Orange progress scrubber with buffered chunk visual track.
* **Smart Overlays**:
  * `[⚡ Skip Intro]` / `[⚡ Skip Outro]`: Orange pill floating directly above the right side of the scrubber when current time matches AniSkip intervals.
  * Autoplay Countdown Banner: Appears in the last 45 seconds of an episode with 10s countdown to next episode.

#### Gestures:
* **Double-Tap Left**: Seek $-10$s with curved animated ripple and cumulative badge.
* **Double-Tap Right**: Seek $+10$s with curved animated ripple.
* **Center Double-Tap**: Isolated; does not toggle fullscreen.
* **Vertical Drag (Left 40%)**: Screen brightness adjust with HUD slider.
* **Vertical Drag (Right 40%)**: Media volume adjust with HUD slider.
* **Pinch-to-Zoom**: Two-finger pinch toggles between 16:9 Letterbox and 20:9 Fullscreen Fill.
* **Picture-in-Picture (PiP)**: Automatic transition via Android `PictureInPictureParams` when user navigates home.

---

## 4. Media3 / ExoPlayer Zero-Buffering Pipeline

### 4.1 `DefaultLoadControl` Tuning
```kotlin
val loadControl = DefaultLoadControl.Builder()
    .setBufferDurationsMs(
        /* minBufferMs = */ 2500,        // Start playback with only 2.5s buffer
        /* maxBufferMs = */ 30000,       // Pre-cache up to 30s ahead in RAM
        /* bufferForPlaybackMs = */ 1500, // Rebuffer threshold
        /* bufferForPlaybackAfterRebufferMs = */ 2500
    )
    .setPrioritizeTimeOverSizeThresholds(true)
    .build()
```

### 4.2 Adaptive Bitrate (ABR)
* Uses `AdaptiveTrackSelection.Factory` favoring highest bitrate while maintaining zero stall.
* Pre-fetches next episode manifest when current episode hits 90% completion.

---

## 5. Dumb Runner Engine (`provider.bundle.js`)

### 5.1 QuickJS Integration
* Embeds `quickjs-android` via JNI.
* Exposes safe native bridges:
  * `httpFetch(url, options): Promise<string>`
  * `log(level, msg)`
* Evaluates cached `provider.bundle.js`.

### 5.2 Script Contract Interface
```javascript
// provider.bundle.js specification
module.exports = {
  version: "1.0.0",
  getHomeFeed: async () => { /* returns { spotlight: [...], rails: [...] } */ },
  search: async (query, page) => { /* returns { results: [...], hasMore: boolean } */ },
  getEpisodes: async (animeId) => { /* returns [{ id, num, title, thumb }] */ },
  getServers: async (animeId, epId) => { /* returns [{ id, name, lang: 'sub'|'dub' }] */ },
  resolveStream: async (animeId, serverId) => { /* returns { url: "https://...m3u8", headers: {} } */ },
  getSkipTimes: async (title, epNum) => { /* returns { op: [start, end], ed: [start, end] } */ }
};
```

### 5.3 Cloudflare Turnstile / Challenge Fallback
* If `httpFetch` receives HTTP 403 / 503 with Cloudflare challenge markers, the native Android layer silently routes the request through a hidden background `WebView` to acquire challenge clearance cookies (`cf_clearance`).
* Cookies are passed back to QuickJS for subsequent requests.

---

## 6. P2P Local Sync Protocol (`anime-cli sync`)

### 6.1 Handshake Flow
1. **PC**: User runs `anime-cli sync`.
   - Starts local HTTP server on port `8088` (or random free port).
   - Generates ephemeral auth token: `token = secrets.token_urlsafe(16)`.
   - Displays ASCII QR code: `shinsei://sync?host=192.168.0.x&port=8088&token=XYZ`.
2. **Mobile**: User taps "Sync with PC" in app.
   - Camera scans QR code.
   - App performs `POST http://192.168.0.x:8088/api/sync` with header `X-Sync-Token: XYZ`.
   - Payload:
     ```json
     {
       "client_timestamp": 1727255000,
       "progress_deltas": [
         { "anime_id": "123", "ep_id": "456", "position": 842.5, "duration": 1420.0, "updated_at": 1727254900 }
       ],
       "script_version": "1.0.0"
     }
     ```
3. **PC Response**:
   - PC updates local `watch_progress` table using `MAX(updated_at)` conflict resolution.
   - PC returns its progress deltas:
     ```json
     {
       "ok": true,
       "progress_deltas": [ ... ],
       "latest_script": "<provider.bundle.js content if newer>"
     }
     ```
4. **Mobile Complete**:
   - Mobile updates Room database.
   - If `latest_script` is returned, mobile updates `provider.bundle.js` in private storage.
   - PC displays: `✓ Synced with Shinsei Mobile in 42ms`.
   - PC server terminates automatically after 30 seconds or successful sync.

---

## 7. Security & Privacy
* **Zero Analytics / Telemetry**: No third-party tracking SDKs.
* **Local Storage Only**: Watch history resides exclusively on device SQLite/Room databases.
* **P2P Encryption & Tokenization**: Wi-Fi sync requires the physical QR token; unauthorized LAN devices cannot read watch history.
