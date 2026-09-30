#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# ⚡ SHINSEI ANIME-CLI · TERMUX ONE-CLICK INSTALLER
# High-performance anime browsing & streaming for Android Termux.
# ==============================================================================

set -e

# Terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GOLD='\033[38;5;220m'
ORANGE='\033[38;5;208m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${ORANGE}"
cat << "EOF"
  ██████╗ ██╗  ██╗██╗███╗   ██╗███████╗███████╗██╗     ██████╗██╗     ██╗
  ██╔════╝ ██║  ██║██║████╗  ██║██╔════╝██╔════╝██║    ██╔════╝██║     ██║
  ███████╗ ███████║██║██╔██╗ ██║███████╗█████╗  ██║    ██║     ██║     ██║
  ╚════██║ ██╔══██║██║██║╚██╗██║╚════██║██╔══╝  ██║    ██║     ██║     ██║
  ███████║ ██║  ██║██║██║ ╚████║███████║███████╗██║    ╚██████╗███████╗██║
  ╚══════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═════╝╚══════╝╚═╝
EOF
echo -e "${GOLD}${BOLD}  ⚡ Termux One-Click Installer · Next-Gen Anime Streaming CLI${NC}\n"

# Verify Termux environment
if [ -z "$PREFIX" ] || [ ! -d "$PREFIX" ]; then
    echo -e "${RED}Error: This script is meant to be run inside Termux on Android.${NC}"
    exit 1
fi

echo -e "${CYAN}[1/5] Updating Termux packages...${NC}"
pkg update -y

echo -e "\n${CYAN}[2/5] Installing core dependencies (Python, Git, FFmpeg, Termux Tools)...${NC}"
pkg install -y python git ffmpeg termux-tools

# Optionally install Termux MPV if available
if ! command -v mpv >/dev/null 2>&1; then
    echo -e "${YELLOW}Installing terminal mpv (optional CLI fallback)...${NC}"
    pkg install -y mpv || true
fi

INSTALL_DIR="$HOME/.anime-cli"

echo -e "\n${CYAN}[3/5] Setting up anime-cli repository...${NC}"
if [ -d "$INSTALL_DIR/.git" ]; then
    echo -e "${GREEN}Found existing installation in $INSTALL_DIR. Pulling latest updates...${NC}"
    cd "$INSTALL_DIR"
    git pull --ff-only || {
        echo -e "${YELLOW}Could not fast-forward; re-fetching repository...${NC}"
        cd "$HOME"
        rm -rf "$INSTALL_DIR"
        git clone --depth 1 https://github.com/Hackedghost64/anime-cli.git "$INSTALL_DIR"
    }
else
    rm -rf "$INSTALL_DIR"
    echo -e "${GREEN}Cloning repository to $INSTALL_DIR...${NC}"
    git clone --depth 1 https://github.com/Hackedghost64/anime-cli.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

echo -e "\n${CYAN}[4/5] Installing Python packages...${NC}"
# Note: In Termux, pip is managed by pkg; upgrading pip via pip is strictly forbidden by Termux.
PIP_FLAGS=""
if python -m pip install --help 2>&1 | grep -q -- "--break-system-packages"; then
    PIP_FLAGS="--break-system-packages"
fi

# 1. Install core browsing and playback packages (100% pure Python, no compilation needed)
echo -e "${GREEN}Installing anime streaming engine dependencies...${NC}"
python -m pip install $PIP_FLAGS httpx aiosqlite --quiet

# 2. Attempt installing optional sync server packages (won't abort if optional packages fail)
python -m pip install $PIP_FLAGS fastapi "uvicorn[standard]" pydantic qrcode --quiet || true

echo -e "\n${CYAN}[5/5] Creating executable shortcuts...${NC}"
WRAPPER_PATH="$PREFIX/bin/anime-cli"
cat << 'EOF' > "$WRAPPER_PATH"
#!/data/data/com.termux/files/usr/bin/bash
exec python "$HOME/.anime-cli/cli.py" "$@"
EOF
chmod +x "$WRAPPER_PATH"

# Symlink shorter 'anime' command as well
ln -sf "$WRAPPER_PATH" "$PREFIX/bin/anime"

echo -e "${GREEN}✓ Created command shortcuts: 'anime-cli' and 'anime'${NC}"

# Configure Preferred Player
echo -e "\n${GOLD}${BOLD}Configuring your preferred Android video player...${NC}"
python "$INSTALL_DIR/cli.py" --config-player || true

echo -e "\n${ORANGE}╭────────────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${ORANGE}│${NC} ${GREEN}${BOLD}🎉 Installation Complete!${NC}                                              ${ORANGE}│${NC}"
echo -e "${ORANGE}├────────────────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${ORANGE}│${NC} Simply type ${GOLD}${BOLD}anime-cli${NC} or ${GOLD}${BOLD}anime${NC} to launch the interactive player:        ${ORANGE}│${NC}"
echo -e "${ORANGE}│${NC}                                                                            ${ORANGE}│${NC}"
echo -e "${ORANGE}│${NC}   ${CYAN}anime${NC}                         ${DIM}# Open interactive anime dashboard${NC}       ${ORANGE}│${NC}"
echo -e "${ORANGE}│${NC}   ${CYAN}anime \"one piece\"${NC}             ${DIM}# Search and watch immediately${NC}           ${ORANGE}│${NC}"
echo -e "${ORANGE}│${NC}   ${CYAN}anime -c${NC}                      ${DIM}# Continue last watched episode${NC}          ${ORANGE}│${NC}"
echo -e "${ORANGE}│${NC}   ${CYAN}anime --today${NC}                 ${DIM}# Live airing schedule radar${NC}             ${ORANGE}│${NC}"
echo -e "${ORANGE}│${NC}   ${CYAN}anime --config-player${NC}         ${DIM}# Switch video player anytime${NC}            ${ORANGE}│${NC}"
echo -e "${ORANGE}╰────────────────────────────────────────────────────────────────────────────╯${NC}\n"
