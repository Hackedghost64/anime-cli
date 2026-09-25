# Proguard rules for Shinsei Anime
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.dokar.quickjs.** { *; }
-keep class com.shinsei.anime.data.** { *; }
