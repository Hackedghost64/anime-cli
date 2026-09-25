# Player Overhaul, Downloads Subsystem & Curation Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Shinsei Android app with a Crunchyroll-style hybrid portrait/landscape video player (top 16:9 player with episode details & next episodes rail below; landscape fullscreen with top controls; no swipe gestures), fix download cancellation/deletion bugs, group downloads by series, add bulk episode downloading, implement a multi-card curated spotlight carousel, and enable long-press watch history deletion.

**Architecture:** 
- Mobile Player: Adaptive Compose orientation layer in `PlayerActivity` hosting 16:9 `PlayerView` atop a scrollable episode/up-next column in portrait mode, expanding seamlessly to fullscreen in landscape via `SCREEN_ORIENTATION_SENSOR_LANDSCAPE` without re-creating playback.
- Downloads Subsystem: `DownloadManager` sequential worker with immediate cancel/delete lifecycle, series-level grouping in `DownloadsScreen`, and batch queueing in `DetailScreen`.
- Home UI: Multi-card `HorizontalPager` with curation rules and tags; `combinedClickable` long-press deletion on `WatchProgressEntity` cards.

**Tech Stack:** Kotlin, Jetpack Compose, Media3 ExoPlayer, Room Database, OkHttpClient, QuickJS Android.

## Global Constraints
- Target Application: `com.shinsei.anime` in `/home/divyam/Downloads/projects/anime-cli/android`
- Device under test: Samsung Galaxy S23 Ultra (`RZCW21BJDWX`, Android 16)
- Preserve existing Room database schemas and cleartext network configuration.

---

### Task 1: Fix Download Cancellation & Deletion Cleanup

**Files:**
- Modify: `android/app/src/main/java/com/shinsei/anime/data/download/DownloadManager.kt`
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/downloads/DownloadsScreen.kt`

**Interfaces:**
- Consumes: `DownloadDao`, `DownloadEntity`
- Produces: `DownloadManager.deleteDownload(downloadId: String)`, `DownloadManager.cancelDownload(downloadId: String)`

- [ ] **Step 1: Inspect and fix DownloadManager.kt cancel/delete methods**
Ensure `cancelDownload` immediately nullifies `_currentDownload.value` if matching, cancels active coroutine jobs, and deletes `.tmp` files. Ensure `deleteDownload` immediately removes the record from `downloadDao` and cleans all files from disk:
```kotlin
fun cancelDownload(downloadId: String) {
    cancelledIds.add(downloadId)
    activeJobs[downloadId]?.cancel()
    activeJobs.remove(downloadId)
    if (_currentDownload.value?.id == downloadId) {
        _currentDownload.value = null
    }
    scope.launch {
        val entity = downloadDao.getDownload(downloadId)
        if (entity != null) {
            File(entity.localPath + ".tmp").delete()
            File(entity.localPath).delete()
            downloadDao.deleteById(downloadId)
        }
    }
}

fun deleteDownload(downloadId: String) {
    cancelDownload(downloadId)
    _currentDownload.value = null
    scope.launch {
        val entity = downloadDao.getDownload(downloadId)
        if (entity != null) {
            val file = File(entity.localPath)
            if (file.exists()) file.delete()
            File(entity.localPath + ".tmp").delete()
            downloadDao.deleteById(downloadId)
        }
    }
}
```

- [ ] **Step 2: Update DownloadsScreen.kt in-flight card cancel action**
In `DownloadsScreen.kt`, ensure clicking the `X` button calls `downloadManager.deleteDownload(cur.id)` so the card vanishes immediately:
```kotlin
IconButton(
    onClick = { downloadManager.deleteDownload(cur.id) },
    modifier = Modifier.size(32.dp)
) {
    Icon(
        imageVector = Icons.Default.Close,
        contentDescription = "Cancel",
        tint = TextSecondary,
        modifier = Modifier.size(18.dp)
    )
}
```

- [ ] **Step 3: Verify build compiles cleanly**
Run: `./gradlew assembleDebug` in `android/`
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**
```bash
git add android/app/src/main/java/com/shinsei/anime/data/download/DownloadManager.kt android/app/src/main/java/com/shinsei/anime/ui/downloads/DownloadsScreen.kt
git commit -m "fix(downloads): ensure immediate UI card removal and file deletion on cancel"
```

---

### Task 2: Downloads Series Grouping & Series Detail View

**Files:**
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/downloads/DownloadsScreen.kt`

**Interfaces:**
- Consumes: `DownloadDao.observeAllDownloads()`, `DownloadEntity`
- Produces: `SeriesDownloadGroup`, series expansion state, individual episode play/delete controls

- [ ] **Step 1: Define SeriesDownloadGroup data structure**
In `DownloadsScreen.kt`:
```kotlin
data class SeriesDownloadGroup(
    val animeId: String,
    val animeTitle: String,
    val animePoster: String,
    val episodes: List<DownloadEntity>,
    val totalSizeBytes: Long
)
```

- [ ] **Step 2: Group completed downloads by animeId**
Transform `completedDownloads` into `List<SeriesDownloadGroup>`:
```kotlin
val groupedSeries = remember(completedDownloads) {
    completedDownloads.groupBy { it.animeId }.map { (animeId, eps) ->
        SeriesDownloadGroup(
            animeId = animeId,
            animeTitle = eps.firstOrNull()?.animeTitle ?: "Anime",
            animePoster = eps.firstOrNull()?.animePoster ?: "",
            episodes = eps.sortedBy { it.epNum.toIntOrNull() ?: 0 },
            totalSizeBytes = eps.sumOf { it.fileSize }
        )
    }
}
```

- [ ] **Step 3: Implement Series Card and Episode List Sheet / Subview**
Show the series cards with poster, title, episode count, and total MB. Tapping a series card expands to show the episodes with episode numbers, titles, file sizes, play buttons, and delete buttons.

- [ ] **Step 4: Verify build compiles cleanly**
Run: `./gradlew assembleDebug` in `android/`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**
```bash
git add android/app/src/main/java/com/shinsei/anime/ui/downloads/DownloadsScreen.kt
git commit -m "feat(downloads): group completed downloads by series with expandable episode view"
```

---

### Task 3: Download Batch Feature on Detail Screen

**Files:**
- Modify: `android/app/src/main/java/com/shinsei/anime/data/download/DownloadManager.kt`
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/detail/DetailScreen.kt`

**Interfaces:**
- Consumes: `EpisodeItem`, `DownloadManager.enqueueDownload`
- Produces: `DownloadManager.queueBatchDownloads(animeId, animeTitle, animePoster, episodes)`

- [ ] **Step 1: Add queueBatchDownloads to DownloadManager**
In `DownloadManager.kt`:
```kotlin
fun queueBatchDownloads(
    animeId: String,
    animeTitle: String,
    animePoster: String,
    episodes: List<Pair<String, String>>, // list of Pair(epId, epNum)
    isDub: Boolean = false
) {
    scope.launch {
        for ((epId, epNum) in episodes) {
            enqueueDownload(
                animeId = animeId,
                epId = epId,
                epNum = epNum,
                epName = "Episode $epNum",
                animeTitle = animeTitle,
                animePoster = animePoster,
                isDub = isDub
            )
        }
    }
}
```

- [ ] **Step 2: Add "Download Batch" button & dialog sheet in DetailScreen.kt**
Add a "Download Batch" action button beside the "Episodes" row. Tapping opens a bottom sheet with:
- "Next 5 Episodes"
- "Next 10 Episodes"
- "All Episodes"
Filtering out already downloaded episodes, then queueing them.

- [ ] **Step 3: Verify build compiles cleanly**
Run: `./gradlew assembleDebug` in `android/`
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**
```bash
git add android/app/src/main/java/com/shinsei/anime/data/download/DownloadManager.kt android/app/src/main/java/com/shinsei/anime/ui/detail/DetailScreen.kt
git commit -m "feat(downloads): add download batch support for next 5, 10, or all episodes"
```

---

### Task 4: Crunchyroll-Style Hybrid Player (Portrait 16:9 + Landscape Fullscreen + No Swipe Gestures)

**Files:**
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/player/PlayerGestureDetector.kt`
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/player/CrunchyrollPlayerControls.kt`
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/player/PlayerActivity.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: `Media3Manager`, `PlayerState`
- Produces: Adaptive portrait 16:9 layout + landscape fullscreen toggle with `SCREEN_ORIENTATION_SENSOR_LANDSCAPE` / `SCREEN_ORIENTATION_USER_PORTRAIT`

- [ ] **Step 1: Strip vertical slide gestures from PlayerGestureDetector.kt**
Remove volume and brightness vertical drag detectors so scrolling and tapping work without accidental brightness/volume changes. Keep single tap (controls toggle) and double-tap seek (10s seek).

- [ ] **Step 2: Update AndroidManifest.xml for PlayerActivity orientation**
Set `android:screenOrientation="unspecified"` and `android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize"` so `PlayerActivity` starts in portrait and adapts cleanly to orientation changes without activity destruction.

- [ ] **Step 3: Re-architect PlayerActivity layout into Portrait + Landscape modes**
- In Portrait:
  - Top: 16:9 video frame (`Modifier.fillMaxWidth().aspectRatio(16f / 9f)`).
  - Bottom: Scrollable `Column(modifier = Modifier.verticalScroll(rememberScrollState()))` containing:
    - Episode title, anime title, episode number.
    - Quick actions: Sub/Dub toggle pill, Download Episode button.
    - "Up Next" episode preview card with thumbnail and one-tap playback.
    - "View All Episodes" button opening a bottom sheet with all episodes.
- In Landscape:
  - Video expands to `fillMaxSize()`.
  - Top controls: Back (`←`), Anime & Episode Title, Next Episode (`⏭`), Settings (`⚙`), Minimize (`⛷`).
  - Maximize button (`⛶`) sets `requestedOrientation = SCREEN_ORIENTATION_SENSOR_LANDSCAPE`.
  - Minimize button (`⛷`) sets `requestedOrientation = SCREEN_ORIENTATION_USER_PORTRAIT`.

- [ ] **Step 4: Update CrunchyrollPlayerControls.kt to support portrait & landscape controls**
Pin Next episode (`⏭`) and Settings (`⚙`) at the top right. Render Maximize (`⛶`) in portrait and Minimize (`⛷`) in landscape.

- [ ] **Step 5: Verify build compiles cleanly**
Run: `./gradlew assembleDebug` in `android/`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**
```bash
git add android/app/src/main/java/com/shinsei/anime/ui/player/ android/app/src/main/AndroidManifest.xml
git commit -m "feat(player): implement crunchyroll portrait/landscape player layout with up-next rail and no swipe gestures"
```

---

### Task 5: Multi-Card Spotlight Carousel with Curation Rules

**Files:**
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/home/HomeScreen.kt`
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/home/HomeViewModel.kt`

**Interfaces:**
- Consumes: `HomeFeedData`, `AnimeCard`
- Produces: `List<SpotlightCard>` with curation badges ("TOP OF THE DAY", "NEW SIMULCAST", "TRENDING WORLDWIDE", "FAN FAVORITE")

- [ ] **Step 1: Add curated spotlight cards generation to HomeViewModel.kt**
Generate a list of 4 curated spotlight cards from the home feed data, assigning appropriate badges:
- Card 1: 🏆 TOP OF THE DAY
- Card 2: ⚡ NEW SIMULCAST RELEASE
- Card 3: 🔥 TRENDING WORLDWIDE
- Card 4: 🌍 FAN FAVORITE

- [ ] **Step 2: Update HomeScreen.kt with HorizontalPager carousel**
Replace single `FeaturedSpotlightBanner` with a swipeable `HorizontalPager` with indicator dots and badges.

- [ ] **Step 3: Verify build compiles cleanly**
Run: `./gradlew assembleDebug` in `android/`
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**
```bash
git add android/app/src/main/java/com/shinsei/anime/ui/home/
git commit -m "feat(home): add multi-card curated spotlight carousel with distinct badges"
```

---

### Task 5.5: Long-Press Watch History & Episode Deletion

**Files:**
- Modify: `android/app/src/main/java/com/shinsei/anime/data/local/WatchProgressDao.kt`
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/home/HomeViewModel.kt`
- Modify: `android/app/src/main/java/com/shinsei/anime/ui/home/HomeScreen.kt`

**Interfaces:**
- Consumes: `WatchProgressDao.deleteProgress(animeId, epId)`
- Produces: `combinedClickable` with `onLongClick` and confirmation AlertDialog

- [ ] **Step 1: Add deleteByAnime method to WatchProgressDao.kt**
```kotlin
@Query("DELETE FROM watch_progress WHERE animeId = :animeId")
suspend fun deleteByAnime(animeId: String)
```

- [ ] **Step 2: Add deleteSeriesProgress to HomeViewModel.kt**
```kotlin
fun deleteSeriesProgress(animeId: String) {
    viewModelScope.launch {
        ShinseiApp.instance.database.watchProgressDao().deleteByAnime(animeId)
    }
}
```

- [ ] **Step 3: Add long-press handler & confirmation dialog to HomeScreen ContinueWatchingCard**
Use `combinedClickable(onClick = { ... }, onLongClick = { itemToDelete = item })`. Show `AlertDialog` confirming removal.

- [ ] **Step 4: Verify build compiles cleanly**
Run: `./gradlew assembleDebug` in `android/`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**
```bash
git add android/app/src/main/java/com/shinsei/anime/data/local/WatchProgressDao.kt android/app/src/main/java/com/shinsei/anime/ui/home/
git commit -m "feat(history): allow deleting continue watching items via long-press"
```

---

### Task 6: End-to-End Build, Verification, and Live Device Installation

**Files:**
- Android build artifacts
- Connected device: `RZCW21BJDWX`

- [ ] **Step 1: Compile Debug APK**
Run: `./gradlew assembleDebug` in `android/`
Expected: BUILD SUCCESSFUL

- [ ] **Step 2: Install APK onto Samsung Galaxy S23 Ultra**
Run: `adb -s RZCW21BJDWX install -r app/build/outputs/apk/debug/app-debug.apk`
Expected: Success

- [ ] **Step 3: Launch app and capture screenshots of all new features**
- Test 1: Verify multi-card spotlight carousel on Home Screen.
- Test 2: Verify long-press on Continue Watching card brings up delete dialog.
- Test 3: Launch Player and verify Portrait mode: 16:9 top player, episode info, up next rail, and all episodes button below.
- Test 4: Tap maximize button: verify landscape fullscreen mode with Next and Settings at top.
- Test 5: Verify Downloads tab shows Series grouping and clicking X cancels/deletes immediately.
- Test 6: Verify Batch Download on Detail screen.

- [ ] **Step 4: Push all changes to remote GitHub repository**
```bash
git push origin main
git push origin master
```
