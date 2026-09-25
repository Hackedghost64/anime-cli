# Shinsei Anime Native Android App & Script Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade native Android streaming application (`com.shinsei.anime`) featuring an exact 1:1 Crunchyroll-style player screen (Media3 ExoPlayer), an embedded QuickJS dynamic script runner (`provider.bundle.js`), and instant P2P watch history synchronization with `anime-cli` via QR code.

**Architecture:** 
* Android Native App in Kotlin + Jetpack Compose + Android Jetpack Media3 (ExoPlayer).
* "Dumb Runner" architecture: Extraction logic decoupled into `provider.bundle.js` evaluated in-memory by `QuickJS-KT` with an invisible Activity-mounted WebView fallback for Cloudflare Turnstile/Managed Challenges.
* P2P Sync: `anime-cli sync` launches an ephemeral local HTTP server and outputs an ASCII QR code. The Android app scans the QR code and exchanges watch history deltas in <50ms over local Wi-Fi with relative-age conflict resolution.

**Tech Stack:**
* **Mobile Frontend**: Android Kotlin, Jetpack Compose, Material3, AndroidX Media3 (ExoPlayer 1.4+), Room SQLite, Coil, ZXing Mobile Barcode Scanner.
* **Script Engine**: QuickJS-KT (`io.github.dokar3:quickjs-kt`), OkHttp with `WebSettings` UA parity.
* **CLI Sync Backend**: Python 3.10+, FastAPI, aiosqlite, qrcode.

## Global Constraints
* Work strictly inside `/home/divyam/Downloads/projects/anime-cli`.
* Android app code lives in `android/`.
* Package ID: `com.shinsei.anime`.
* App Name: `Shinsei Anime`.
* Zero external cloud dependencies for streaming; mobile streams directly from Kyoto/Anilab HLS CDNs without a PC proxy.
* All existing tests in `tests/` must continue to pass.

---

### Task 1: The Provider Bundle & Contract Test Suite (`provider.bundle.js`)

**Files:**
- Create: `android/app/src/main/assets/provider.bundle.js`
- Create: `tests/test_provider_bundle.mjs`

**Interfaces:**
- Produces: `provider.bundle.js` exporting to `globalThis.__provider`:
  - `getHomeFeed(): Promise<{ spotlight: AnimeItem[], rails: RailItem[] }>`
  - `search(query: string, page: number): Promise<{ results: AnimeItem[], hasMore: boolean }>`
  - `getEpisodes(animeId: string): Promise<EpisodeItem[]>`
  - `getServers(animeId: string, epId: string): Promise<ServerItem[]>`
  - `resolveStream(animeId: string, serverId: string): Promise<{ url: string, headers: Record<string, string> }>`
  - `getSkipTimes(title: string, epNum: number): Promise<{ op: [number, number] | null, ed: [number, number] | null }>`

- [ ] **Step 1: Write contract unit test for provider bundle**
  Create `tests/test_provider_bundle.mjs` calling the functions against live/mock endpoints to verify JSON schema conformity.
- [ ] **Step 2: Implement `provider.bundle.js`**
  Implement Anilab API queries (`https://anilab2.amdapi.click/api`), Kyoto Player stream extraction (`https://app.kyotoplayer.com/api/v4`), and AniSkip API integration wrapped in `(function(exports){ ... })(globalThis.__provider = {})`.
- [ ] **Step 3: Run provider test suite**
  Execute `node tests/test_provider_bundle.mjs` and confirm all contract assertions pass.
- [ ] **Step 4: Commit Task 1**
  `git add android/app/src/main/assets/provider.bundle.js tests/test_provider_bundle.mjs && git commit -m "feat(provider): implement standalone provider.bundle.js with contract tests"`

---

### Task 2: P2P Local Sync Command (`anime-cli sync`) with Skew-Immune Resolution

**Files:**
- Modify: `cli.py` (add `sync` subcommand and `cmd_sync` handler)
- Create: `tests/test_sync_p2p.py`
- Modify: `db.py` (add relative-age conflict resolution & delta methods)

**Interfaces:**
- Produces: `anime-cli sync [--port 8088]` CLI command.
- Exposes: `POST /api/sync` on ephemeral local server.
  - Header: `X-Sync-Token: <token>`
  - Request body: `{ client_timestamp: number, progress_deltas: [...], script_version: string }`
  - Response: `{ ok: true, progress_deltas: [...], latest_script: string | null }`

- [ ] **Step 1: Write failing unit test for `anime-cli sync` endpoint**
  Create `tests/test_sync_p2p.py` using FastAPI `TestClient` verifying token auth, relative-age calculation ($client\_timestamp - updated\_at$), and delta merging.
- [ ] **Step 2: Implement skew-immune delta sync in `db.py`**
  Add `get_progress_deltas(since_timestamp: int)` and `merge_progress_deltas(deltas: list, client_timestamp: int)`.
- [ ] **Step 3: Implement `cmd_sync` and router in `cli.py`**
  Implement ephemeral server, token generation, QR code rendering, firewall guidance, and auto-shutdown on sync complete.
- [ ] **Step 4: Run pytest on sync module**
  Execute `python3 -m pytest tests/test_sync_p2p.py` and verify all tests pass.
- [ ] **Step 5: Commit Task 2**
  `git add cli.py db.py tests/test_sync_p2p.py && git commit -m "feat(sync): add P2P anime-cli sync command with relative-age conflict resolution"`

---

### Task 3: Android Scaffolding, Theme Tokens & QuickJS Engine Bridge

**Files:**
- Create: `android/build.gradle.kts`
- Create: `android/settings.gradle.kts`
- Create: `android/local.properties`
- Create: `android/app/build.gradle.kts`
- Create: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/res/xml/network_security_config.xml`
- Create: `android/app/src/main/java/com/shinsei/anime/ui/theme/Color.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/ui/theme/Theme.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/runner/ScriptRunner.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/runner/CloudflareBypassWebView.kt`

**Interfaces:**
- Produces: `ScriptRunner` Kotlin singleton.
  - `suspend fun init(context: Context)`
  - `suspend fun getHomeFeed(): HomeFeedResult`
  - `suspend fun search(query: string, page: Int): SearchResult`
  - `suspend fun getEpisodes(animeId: String): List<Episode>`
  - `suspend fun resolveStream(animeId: String, serverId: String): StreamResult`
  - `fun updateScript(newScriptContent: String): Boolean`

- [ ] **Step 1: Scaffold Android project with Gradle wrapper**
  Generate `gradlew` wrapper using cached distribution and set `sdk.dir=/home/divyam/Android/Sdk` in `android/local.properties`.
- [ ] **Step 2: Define Android Manifest & Network Security**
  Add permissions (`INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`), `network_security_config.xml` allowing cleartext LAN traffic, and Activity config flags (`supportsPictureInPicture="true"`, `configChanges`).
- [ ] **Step 3: Define OLED Cinema Theme Tokens**
  Implement colors (`#08090D`, `#FF640A`, `#12151E`) and typography.
- [ ] **Step 4: Implement `ScriptRunner` with QuickJS-KT and Cloudflare fallback**
  Integrate `io.github.dokar3:quickjs-kt`, wire `httpFetch` bridge with OkHttp (sharing `WebSettings` User-Agent), coroutine dispatching, and `CloudflareBypassWebView` cookie harvesting fallback.
- [ ] **Step 5: Verify build with Gradle**
  Run `./gradlew compileDebugKotlin` in `android/`.
- [ ] **Step 6: Commit Task 3**
  `git add android/ && git commit -m "feat(android): scaffold project, theme tokens, and QuickJS ScriptRunner with CF bypass"`

---

### Task 4: Room Local Storage & P2P Sync Client

**Files:**
- Create: `android/app/src/main/java/com/shinsei/anime/data/AnimeDatabase.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/data/ProgressDao.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/data/Entities.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/sync/SyncClient.kt`

**Interfaces:**
- Produces: `SyncClient.syncWithPc(qrPayload: String): Result<SyncSummary>`

- [ ] **Step 1: Define Room entities and DAOs**
  Create `WatchProgressEntity` with `(animeId, epId)` primary key and `updatedAt` timestamp.
- [ ] **Step 2: Implement `SyncClient`**
  Parse `shinsei://sync?host=...&port=...&token=...`, verify Wi-Fi connectivity, perform HTTP POST via `OkHttp`, merge deltas, and hot-reload updated script if returned.
- [ ] **Step 3: Unit test Room DAO and SyncClient parsing**
  Write local unit tests verifying QR payload extraction and delta merging logic.
- [ ] **Step 4: Commit Task 4**
  `git add android/app/src/main/java/com/shinsei/anime/data/ android/app/src/main/java/com/shinsei/anime/sync/ && git commit -m "feat(android): implement Room database and P2P SyncClient"`

---

### Task 5: 1:1 Crunchyroll Player Screen (Media3 ExoPlayer)

**Files:**
- Create: `android/app/src/main/java/com/shinsei/anime/ui/player/PlayerActivity.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/ui/player/CrunchyrollPlayerControls.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/ui/player/PlayerGestures.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/ui/player/Media3Manager.kt`

**Interfaces:**
- Produces: `PlayerActivity` launching with `animeId`, `epId`, `title`, `streamUrl`.
- UI Features:
  - Top Bar: `[← Back]  Title  Subtitle         [⏭ Next Ep] [⚙ Settings] [⤢ Aspect]`
  - Center 3-Button Row: `[⏪ 10]` `[ ▶ / ❚❚ ]` `[10 ⏩]`
  - Bottom Bar: `04:12 ━━━━━●━━━━━ -19:28` (clean scrubber with no bottom pause button)
  - Smart Overlay: Floating `[⚡ Skip Intro]` pill docked right above scrubber on right.
  - Double-Tap Seeking: Custom Canvas curved quadratic bezier ripple with cumulative second indicator and 650ms debounce window.
  - Dual-Axis Gestures: Vertical swipe on left for brightness, right for volume (angle-threshold gated).
  - Android 12+ Smooth Auto Picture-in-Picture (`setAutoEnterEnabled(true)`) with `if (!isInPictureInPictureMode) player.pause()` lifecycle guard.
  - Media3 Audio Focus: `handleAudioFocus = true` with movie content type.

- [ ] **Step 1: Implement `Media3Manager` with Zero-Buffering LoadControl**
  Configure ExoPlayer instance with custom `DefaultLoadControl` (2500ms initial buffer, 30s max buffer) and ABR track selection.
- [ ] **Step 2: Implement Compose `CrunchyrollPlayerControls`**
  Build top bar with next button, center 3-button touch cluster, clean bottom timeline, and floating AniSkip pill.
- [ ] **Step 3: Implement `PlayerGestures`**
  Implement double-tap detection for $\pm 10$s seeking, isolated center area, and vertical drag brightness/volume listeners.
- [ ] **Step 4: Connect PiP & Lifecycle hooks**
  Implement `setAutoEnterEnabled(true)`, `onPictureInPictureModeChanged` overlay hiding, and progress auto-save on exit.
- [ ] **Step 5: Commit Task 5**
  `git add android/app/src/main/java/com/shinsei/anime/ui/player/ && git commit -m "feat(android): build 1:1 Crunchyroll Media3 player screen with gestures and PiP"`

---

### Task 6: Home Feed, Details, and QR Scanner UI

**Files:**
- Create: `android/app/src/main/java/com/shinsei/anime/ui/home/HomeScreen.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/ui/details/DetailScreen.kt`
- Create: `android/app/src/main/java/com/shinsei/anime/ui/sync/QrScannerSheet.kt`

**Interfaces:**
- Produces: Full app navigation graph from Splash -> Home -> Details -> Player and QR Sync Sheet.

- [ ] **Step 1: Build Home Feed Screen**
  Implement Hero Billboard and horizontal LazyRow rails including "Continue Watching" with progress bars.
- [ ] **Step 2: Build Detail Screen**
  Implement banner backdrop, metadata strip, Sub/Dub toggle pill, and episode list.
- [ ] **Step 3: Build QR Scanner Sheet**
  Implement CameraX / ZXing barcode scanner bottom sheet connected to `SyncClient` with manual IP fallback.
- [ ] **Step 4: Commit Task 6**
  `git add android/app/src/main/java/com/shinsei/anime/ui/ && git commit -m "feat(android): implement Home, Details, and QR Scanner UI screens"`

---

### Task 7: End-to-End Build, Verification & Documentation

**Files:**
- Create: `android/README.md`
- Modify: `README.md` (add Android app building & QR sync instructions)

- [ ] **Step 1: Run complete test suite**
  Run `pytest tests/` and verify CLI, sync, and backend tests pass.
- [ ] **Step 2: Compile Android APK**
  Run `./gradlew assembleDebug` in `android/` and verify APK generation.
- [ ] **Step 3: Update main README**
  Document the native Android app, QR sync workflow, and APK installation steps.
- [ ] **Step 4: Commit Task 7**
  `git add README.md android/README.md && git commit -m "docs: document Android app compilation, script runner, and P2P sync"`
