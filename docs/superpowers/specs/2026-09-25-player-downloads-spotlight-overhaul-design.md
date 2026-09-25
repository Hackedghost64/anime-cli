# Design Spec: Player Overhaul, Downloads Subsystem & Curation Rules

**Date:** 2026-09-25  
**Status:** Approved  
**Target Repository:** `anime-cli` (Android mobile app: `com.shinsei.anime`)

---

## 1. Overview & Objectives

This specification defines the architecture, data models, and user experience enhancements for the Shinsei Android Anime streaming application:
1. **Crunchyroll-Style Hybrid Player**: Adaptive portrait/landscape video playback. In portrait, a top 16:9 video player with episode details, "Up Next" rail, and "View All Episodes" sheet below. In landscape, fullscreen immersive viewing with top-pinned Next Episode (`⏭`), Settings (`⚙`), and Minimize (`⛷`) buttons. Annoying vertical brightness/volume slide gestures are completely removed.
2. **Downloads Subsystem & Series Grouping**: Fix download cancellation/deletion bug so cards disappear immediately upon clicking `X`. Group downloaded episodes under their parent Series Card with episode counts and total disk storage. Add a "Download Batch" feature on the Detail screen to queue Next 5, Next 10, or All episodes.
3. **Multi-Card Spotlight Carousel**: Replace the static single hero banner with a swipeable carousel featuring distinct curation rules and badges (Top of the Day, New Simulcast Release, Trending Worldwide, Fan Favorite).
4. **Long-Press History Deletion**: Allow users to delete watch progress / continue watching data by long-pressing any show card on the Home screen or Detail screen with an explicit confirmation dialog.

---

## 2. Architecture & Components

### 2.1 Crunchyroll-Style Player (`PlayerActivity.kt` & `CrunchyrollPlayerControls.kt`)
- **Orientation Modes**:
  - **Portrait (Default)**:
    - Top: 16:9 AspectRatio container for `PlayerView`. Controls overlay includes play/pause, relative seek (+10s / -10s), progress scrubber, current/duration time, Next Episode button (`⏭`), Settings (`⚙`), and Fullscreen/Maximize button (`⛶`).
    - Bottom: Scrollable column (`Modifier.verticalScroll`) containing:
      - Anime title, episode number, episode name.
      - Action row: Sub/Dub toggle pill, Download Episode button.
      - "Up Next" episode card with thumbnail preview and one-tap playback.
      - "View All Episodes" button opening a bottom sheet with the full episode list for quick navigation.
  - **Landscape (Fullscreen)**:
    - Triggered by tapping the Fullscreen button (`⛶`).
    - Calls `requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE`.
    - Video expands across the entire display.
    - Top bar: Back (`←`), Anime & Episode Title, Next Episode (`⏭`), Settings (`⚙`), and Minimize/Restore (`⛷`).
    - Tapping Minimize or rotating device back to portrait invokes `requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT`.
    - Media3 playback continues uninterrupted without recreation or stutter.
- **Gestures**:
  - Vertical volume/brightness swipe gestures are completely disabled.
  - Controls overlay toggles with a single tap.
  - Double-tap left/right seeks -10s / +10s.

### 2.2 Downloads Subsystem (`DownloadManager.kt` & `DownloadsScreen.kt`)
- **Immediate Cancellation / Deletion**:
  - In `DownloadManager.kt`: When `cancelDownload(downloadId)` is called:
    - Cancels running OkHttp request / coroutine.
    - Deletes `.tmp` and partial `.ts` files on disk immediately.
    - Deletes or marks `STATUS_CANCELLED` in Room DB.
    - Clears `_currentDownload.value = null` if matching `downloadId` so the active downloading card disappears immediately.
  - In `deleteDownload(downloadId)`:
    - Cancels download, deletes file on disk, deletes row from `downloadDao`, and clears active state.
- **Series Grouping**:
  - In `DownloadsScreen.kt`:
    - Queries all completed downloads.
    - Groups downloads by `animeId`:
      ```kotlin
      data class SeriesDownloadGroup(
          val animeId: String,
          val animeTitle: String,
          val animePoster: String,
          val episodes: List<DownloadEntity>,
          val totalSizeBytes: Long
      )
      ```
    - Primary view renders Series Cards showing poster, anime title, total episodes count, and total MB used.
    - Tapping a Series Card opens the series episode list sheet or expands inline to show individual episodes with play button and delete button.
- **Download Batch Feature**:
  - In `DetailScreen.kt`:
    - Adds a "Download Batch" button next to "Episodes" header.
    - Tapping displays a modal bottom sheet with 3 options:
      1. **Next 5 Episodes**: Queues the next 5 unwatched/undownloaded episodes.
      2. **Next 10 Episodes**: Queues the next 10 unwatched/undownloaded episodes.
      3. **All Remaining Episodes**: Queues all available episodes.
    - Episodes are queued into `DownloadManager` and processed sequentially in the background.

### 2.3 Multi-Card Spotlight Carousel (`HomeScreen.kt`)
- **Curation Rules**:
  1. **Card 1: 🏆 TOP OF THE DAY**: High-performing spotlight anime with rating ≥ 8.5.
  2. **Card 2: ⚡ NEW SIMULCAST RELEASE**: Latest trending release / currently airing simulcast.
  3. **Card 3: 🔥 TRENDING WORLDWIDE**: Most popular global anime series.
  4. **Card 4: 🌍 FAN FAVORITE**: Top-rated classic / regional hit.
- **UI Presentation**:
  - Horizontal carousel with auto-advancing pager (`HorizontalPager` from Jetpack Compose Foundation).
  - Dot indicators at the bottom of the banner.
  - Each slide features its distinctive badge ("TOP OF THE DAY", "NEW RELEASE", etc.), artwork, title, score, and "WATCH NOW" action.

### 2.4 Long-Press Data Deletion
- **Continue Watching Shelf (`HomeScreen.kt`)**:
  - Each card uses `Modifier.combinedClickable(onClick = { ... }, onLongClick = { showDeleteConfirm = item })`.
  - Long-pressing prompts an AlertDialog:
    - Title: *"Remove from Continue Watching?"*
    - Text: *"Clear watch progress for [Anime Title]? You can still watch it again anytime."*
    - Actions: `[Cancel]` and `[Remove]` (CrunchyOrange).
  - Confirming calls `watchProgressDao.deleteProgress(item.animeId, item.epId)` or `deleteSeries(item.animeId)` on `HomeViewModel`.
  - State updates reactively via Room `Flow`.

---

## 3. Data Flow & State Management

```
┌─────────────────────────────────────────────────────────────┐
│                       HomeScreen UI                         │
│  - Multi-Card Spotlight Carousel (Top of Day, New, Trending)│
│  - Continue Watching Shelf (Long-press -> Delete Dialog)     │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
       DetailScreen.kt                PlayerActivity.kt
   - Single & Batch Downloads    - Portrait Mode:
     (Next 5 / 10 / All)           * Top 16:9 Video Player
   - Long-press Episode Delete     * Episode Info + Up Next Rail
                │                  * View All Episodes Sheet
                │                - Landscape Fullscreen Mode:
                │                  * Fullscreen Expand
                │                  * Top Next [⏭] & Settings [⚙]
                │                  * Minimize [⛷] -> Portrait
                ▼
      DownloadManager.kt (Sequential Queue)
        ├── Room DB (DownloadDao)
        └── Local Storage (MPEG-TS chunks -> .ts)
```

---

## 4. Verification & Testing Strategy
1. **Downloads Screen Verification**:
   - Start downloading an episode; click `X`. Confirm in-flight card immediately disappears and disk file is removed.
   - Download 2 episodes of One Piece. Verify Downloads screen renders a single "One Piece" series card showing "2 Episodes • XXX MB".
   - Tap the series card; verify individual episodes expand with play and delete buttons.
   - On Detail screen, tap "Download Batch", pick "Next 5", and verify all 5 are queued sequentially into `DownloadManager`.
2. **Player Screen Verification**:
   - Launch player. Confirm it opens in Portrait with 16:9 video on top and episode details + up next list below.
   - Tap fullscreen `⛶`. Confirm it rotates smoothly to landscape fullscreen with Next and Settings at top.
   - Tap minimize `⛷`. Confirm it returns cleanly to portrait.
   - Verify vertical edge swiping does NOT trigger volume/brightness overlays.
3. **Spotlight & History Deletion Verification**:
   - Verify Spotlight shows swipeable carousel with distinct curation tags.
   - Long-press a Continue Watching card; confirm dialog appears and tapping "Remove" removes it from the shelf.
