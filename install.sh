#!/usr/bin/env bash
set -e

# ==============================================================================
# ⚡ anime-cli & anime-lite Universal One-Command Installer for All Devices
# Supports Linux (Ubuntu/Debian/Arch/Fedora/Alpine), macOS, Android (Termux) & WSL
# ==============================================================================

C_ORANGE="\033[38;2;255;100;10m"
C_BOLD="\033[1m"
C_GREEN="\033[38;2;0;210;106m"
C_CYAN="\033[38;2;0;210;255m"
C_GOLD="\033[38;2;255;184;0m"
C_RED="\033[38;2;255;51;75m"
C_RESET="\033[0m"

echo -e "${C_ORANGE}${C_BOLD}"
cat << "EOF"
  ██████╗ ██╗  ██╗██╗███╗   ██╗███████╗███████╗██╗     ██████╗██╗     ██╗
  ██╔════╝ ██║  ██║██║████╗  ██║██╔════╝██╔════╝██║    ██╔════╝██║     ██║
  ███████╗ ███████║██║██╔██╗ ██║███████╗█████╗  ██║    ██║     ██║     ██║
  ╚════██║ ██╔══██║██║██║╚██╗██║╚════██║██╔══╝  ██║    ██║     ██║     ██║
  ███████║ ██║  ██║██║██║ ╚████║███████║███████╗██║    ╚██████╗███████╗██║
  ╚══════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═════╝╚══════╝╚═╝
EOF
echo -e "${C_GOLD}${C_BOLD}  ⚡ Universal Installer: anime-cli & anime-lite (All Devices)${C_RESET}\n"

# ------------------------------------------------------------------------------
# 1. Environment & Platform Detection
# ------------------------------------------------------------------------------
IS_TERMUX=0
IS_MACOS=0
IS_LINUX=0

if [[ -n "$PREFIX" && -d "$PREFIX" ]] || [[ -d "/data/data/com.termux" ]]; then
    IS_TERMUX=1
    PLATFORM="Android (Termux)"
elif [[ "$(uname -s 2>/dev/null)" == "Darwin" ]]; then
    IS_MACOS=1
    PLATFORM="macOS"
else
    IS_LINUX=1
    PLATFORM="Linux / WSL"
fi

echo -e "Detected Platform: ${C_BOLD}${C_CYAN}${PLATFORM}${C_RESET}\n"

# ------------------------------------------------------------------------------
# 2. Package Manager & Dependencies
# ------------------------------------------------------------------------------
if [[ $IS_TERMUX -eq 1 ]]; then
    echo -e "${C_CYAN}[1/4] Updating Termux environment & installing dependencies...${C_RESET}"
    pkg update -y || true
    pkg install -y python git ffmpeg termux-tools clang make libcurl libxml2 || true
    if ! command -v mpv >/dev/null 2>&1; then
        pkg install -y mpv || true
    fi
    USER_BIN="$PREFIX/bin"
else
    USER_BIN="$HOME/.local/bin"
    mkdir -p "$USER_BIN"

    # Check Python & Pip
    if ! command -v python3 &>/dev/null; then
        echo -e "${C_RED}Error: Python 3 is required. Please install python3 first.${C_RESET}"
        exit 1
    fi

    if ! command -v pip &>/dev/null && ! command -v pip3 &>/dev/null; then
        echo -e "${C_RED}Error: pip is required. Please install python3-pip first.${C_RESET}"
        exit 1
    fi

    # Inform about media players
    for tool in mpv fzf ffmpeg; do
        if ! command -v "$tool" &>/dev/null; then
            echo -e "${C_CYAN}[Notice] Recommended playback tool '$tool' is not installed.${C_RESET}"
        fi
    done
fi

# ------------------------------------------------------------------------------
# 3. Install Python anime-cli
# ------------------------------------------------------------------------------
echo -e "\n${C_CYAN}[2/4] Installing / Updating anime-cli package...${C_RESET}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [[ -f "$SCRIPT_DIR/setup.py" ]]; then
    pip install --user --upgrade "$SCRIPT_DIR" || pip install --upgrade "$SCRIPT_DIR" || true
else
    pip install --user --upgrade git+https://github.com/Hackedghost64/anime-cli.git || pip install --upgrade git+https://github.com/Hackedghost64/anime-cli.git || true
fi

# ------------------------------------------------------------------------------
# 4. Build & Install anime-lite (C Edition)
# ------------------------------------------------------------------------------
echo -e "\n${C_CYAN}[3/4] Building anime-lite (C Edition) for instant (<5ms) streaming...${C_RESET}"
CC_CMD=""
if command -v gcc &>/dev/null; then
    CC_CMD="gcc"
elif command -v clang &>/dev/null; then
    CC_CMD="clang"
fi

LITE_BUILT=0
if [[ -n "$CC_CMD" ]] && command -v make &>/dev/null; then
    LITE_DIR=""
    TEMP_CLONE=""
    if [[ -d "$SCRIPT_DIR/lite" && -f "$SCRIPT_DIR/lite/Makefile" ]]; then
        LITE_DIR="$SCRIPT_DIR/lite"
    elif command -v git &>/dev/null; then
        TEMP_CLONE="$(mktemp -d 2>/dev/null || mktemp -d -t 'anime_lite')"
        if git clone --depth 1 https://github.com/Hackedghost64/anime-cli.git "$TEMP_CLONE/anime-cli" &>/dev/null; then
            LITE_DIR="$TEMP_CLONE/anime-cli/lite"
        fi
    fi

    if [[ -n "$LITE_DIR" && -d "$LITE_DIR" ]]; then
        if make -C "$LITE_DIR" clean all &>/dev/null; then
            mkdir -p "$USER_BIN"
            if install -m 755 "$LITE_DIR/bin/anime-lite" "$USER_BIN/anime-lite" 2>/dev/null || cp "$LITE_DIR/bin/anime-lite" "$USER_BIN/anime-lite"; then
                chmod 755 "$USER_BIN/anime-lite"
                LITE_BUILT=1
                echo -e "${C_GREEN}✓ anime-lite (C Edition) compiled and installed to $USER_BIN/anime-lite${C_RESET}"
            fi
        else
            echo -e "${C_CYAN}[Notice] anime-lite could not be compiled (missing libcurl development headers). Skipping C edition.${C_RESET}"
        fi
    fi

    if [[ -n "$TEMP_CLONE" && -d "$TEMP_CLONE" ]]; then
        rm -rf "$TEMP_CLONE"
    fi
else
    echo -e "${C_CYAN}[Notice] C compiler (gcc/clang) or make not found. Skipping anime-lite compilation.${C_RESET}"
fi

# ------------------------------------------------------------------------------
# 5. PATH Verification & Aliases
# ------------------------------------------------------------------------------
echo -e "\n${C_CYAN}[4/4] Verifying PATH and commands...${C_RESET}"
if [[ $IS_TERMUX -ne 1 ]] && [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
    echo -e "${C_ORANGE}[!] Warning: $USER_BIN is not currently in your PATH.${C_RESET}"
    echo "Add this line to your ~/.bashrc or ~/.zshrc:"
    echo -e "  ${C_BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${C_RESET}\n"
fi

# Link convenience alias 'anime' -> anime-cli if not present
if [[ -f "$USER_BIN/anime-cli" && ! -f "$USER_BIN/anime" ]]; then
    ln -sf "$USER_BIN/anime-cli" "$USER_BIN/anime" 2>/dev/null || true
fi

echo -e "\n${C_GREEN}${C_BOLD}🎉 Installation Complete!${C_RESET}"
echo -e "Available commands:\n"
echo -e "  ${C_BOLD}${C_CYAN}anime-cli \"naruto\"${C_RESET}     # Full feature-rich Hub (PWA, AniSkip, Airing Radar, Sync)"
if [[ $LITE_BUILT -eq 1 ]]; then
    echo -e "  ${C_BOLD}${C_GOLD}anime-lite -c${C_RESET}          # ⚡ Resume last episode instantly at saved duration"
    echo -e "  ${C_BOLD}${C_GOLD}anime-lite \"naruto\"${C_RESET}   # ⚡ Instant fzf search & 1080p stream (<5ms startup)"
fi
echo -e "  ${C_BOLD}${C_CYAN}anime-cli -b${C_RESET}          # Launch Crunchyroll-style Browser App"
echo -e "  ${C_BOLD}${C_CYAN}anime-cli -s${C_RESET}          # QR Code Sync to phone PWA\n"
