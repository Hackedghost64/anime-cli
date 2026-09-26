#!/usr/bin/env bash
# ==============================================================================
# Shinsei Android APK Build Script
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$DIR/android"

RELEASE=0
INSTALL=0

for arg in "$@"; do
  case $arg in
    --release|-r)
      RELEASE=1
      shift
      ;;
    --install|-i)
      INSTALL=1
      shift
      ;;
    --help|-h)
      echo "Usage: ./build-apk.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --release, -r    Build optimized release APK with R8 shrinking"
      echo "  --install, -i    Automatically install the APK on connected device via ADB"
      echo "  --help, -h       Show this help message"
      exit 0
      ;;
  esac
done

if ! command -v java >/dev/null 2>&1; then
  echo "Error: JDK (Java 17+) is required to build the APK."
  echo "Install it via: sudo apt install openjdk-17-jdk"
  exit 1
fi

echo "=================================================="
if [ $RELEASE -eq 1 ]; then
  echo "🚀 Building Shinsei Android APK [RELEASE (R8)]..."
  TASK="assembleRelease"
  OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"
  APK_NAME="app-release.apk"
else
  echo "🔨 Building Shinsei Android APK [DEBUG]..."
  TASK="assembleDebug"
  OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/apk/debug"
  APK_NAME="app-debug.apk"
fi
echo "=================================================="

cd "$ANDROID_DIR"
./gradlew "$TASK" --no-daemon

APK_PATH="$OUTPUT_DIR/$APK_NAME"
if [ -f "$APK_PATH" ]; then
  SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo "✅ Build Successful!"
  echo "📦 APK: $APK_PATH ($SIZE)"
  echo ""

  if [ $INSTALL -eq 1 ]; then
    if command -v adb >/dev/null 2>&1; then
      DEVICES=$(adb devices | grep -v "List" | grep "device$" || true)
      if [ -n "$DEVICES" ]; then
        echo "📲 Installing on connected Android device via ADB..."
        adb install -r "$APK_PATH"
        echo "✨ Installation complete! Shinsei is ready on your phone."
      else
        echo "⚠️ No ADB device found online. Connect via USB or Wi-Fi to install."
      fi
    else
      echo "⚠️ ADB not found in PATH. Install adb or transfer the APK manually."
    fi
  else
    echo "💡 Run with --install (or -i) to immediately deploy to a connected phone:"
    echo "   ./build-apk.sh --install"
  fi
else
  echo "❌ Error: Output APK not found at $APK_PATH"
  exit 1
fi
