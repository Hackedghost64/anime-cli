#!/usr/bin/env bash
set -e

# ==============================================================================
# ⚡ anime-cli One-Command Universal Installer
# ==============================================================================

C_ORANGE="\033[38;2;255;100;10m"
C_BOLD="\033[1m"
C_GREEN="\033[38;2;0;210;106m"
C_CYAN="\033[38;2;0;210;255m"
C_RESET="\033[0m"

echo -e "${C_ORANGE}${C_BOLD}"
echo "  ██████╗ ██╗  ██╗██╗███╗   ██╗███████╗███████╗██╗     ██████╗██╗     ██╗"
echo "  ██╔════╝ ██║  ██║██║████╗  ██║██╔════╝██╔════╝██║    ██╔════╝██║     ██║"
echo "  ███████╗ ███████║██║██╔██╗ ██║███████╗█████╗  ██║    ██║     ██║     ██║"
echo "  ╚════██║ ██╔══██║██║██║╚██╗██║╚════██║██╔══╝  ██║    ██║     ██║     ██║"
echo "  ███████║ ██║  ██║██║██║ ╚████║███████║███████╗██║    ╚██████╗███████╗██║"
echo "  ╚══════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═════╝╚══════╝╚═╝"
echo -e "${C_RESET}"
echo -e "${C_BOLD}Installing anime-cli...${C_RESET}\n"

# 1. Check Python
if ! command -v python3 &>/dev/null; then
    echo "Python 3 is required. Please install python3 first."
    exit 1
fi

# 2. Check Pip
if ! command -v pip &>/dev/null && ! command -v pip3 &>/dev/null; then
    echo "pip is required. Please install python3-pip first."
    exit 1
fi

# 3. Inform about media players
for tool in mpv fzf ffmpeg; do
    if ! command -v "$tool" &>/dev/null; then
        echo -e "${C_CYAN}[Notice] Optional recommended tool '$tool' is not installed.${C_RESET}"
    fi
done

# 4. Install from GitHub
echo -e "📦 Fetching and installing latest anime-cli package..."
pip install --user --upgrade git+https://github.com/Hackedghost64/anime-cli.git

USER_BIN="$HOME/.local/bin"

# 5. Build and install anime-lite (C Edition) if C compiler and make are present
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
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
        echo -e "\n⚡ Compiling anime-lite (C Edition) for ultra-fast startup..."
        if make -C "$LITE_DIR" clean all &>/dev/null; then
            mkdir -p "$USER_BIN"
            if install -m 755 "$LITE_DIR/bin/anime-lite" "$USER_BIN/anime-lite" 2>/dev/null || cp "$LITE_DIR/bin/anime-lite" "$USER_BIN/anime-lite"; then
                chmod 755 "$USER_BIN/anime-lite"
                LITE_BUILT=1
                echo -e "${C_GREEN}✓ anime-lite (C Edition) compiled and installed to $USER_BIN/anime-lite${C_RESET}"
            fi
        else
            echo -e "${C_CYAN}[Notice] anime-lite could not be compiled (missing libcurl development headers). Skipping.${C_RESET}"
        fi
    fi

    if [[ -n "$TEMP_CLONE" && -d "$TEMP_CLONE" ]]; then
        rm -rf "$TEMP_CLONE"
    fi
else
    echo -e "${C_CYAN}[Notice] C compiler (gcc/clang) or make not found. Skipping anime-lite companion compilation.${C_RESET}"
fi

# 6. Check PATH
if [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
    echo -e "\n${C_ORANGE}[!] Warning: $USER_BIN is not currently in your PATH.${C_RESET}"
    echo "Add this line to your ~/.bashrc or ~/.zshrc:"
    echo -e "  ${C_BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${C_RESET}\n"
fi

echo -e "\n${C_GREEN}${C_BOLD}✓ anime-cli installed successfully!${C_RESET}"
if [[ $LITE_BUILT -eq 1 ]]; then
    echo -e "${C_GREEN}${C_BOLD}⚡ anime-lite (C Edition) was built and is available as an ultra-fast companion command!${C_RESET}"
fi
echo -e "Try running:\n"
echo -e "  ${C_CYAN}anime-cli \"one piece\"${C_RESET}    # Watch directly in terminal"
if [[ $LITE_BUILT -eq 1 ]]; then
    echo -e "  ${C_CYAN}anime-lite \"one piece\"${C_RESET}   # Instant streaming via ultra-fast C companion (<5ms cold start)"
fi
echo -e "  ${C_CYAN}anime-cli -b${C_RESET}             # Launch Crunchyroll-style browser app"
echo -e "  ${C_CYAN}anime-cli -s${C_RESET}             # Get QR code to watch on your phone"
echo -e "  ${C_CYAN}anime-cli${C_RESET}                # Open interactive menu\n"
