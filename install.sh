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

# 5. Check PATH
USER_BIN="$HOME/.local/bin"
if [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
    echo -e "\n${C_ORANGE}[!] Warning: $USER_BIN is not currently in your PATH.${C_RESET}"
    echo "Add this line to your ~/.bashrc or ~/.zshrc:"
    echo -e "  ${C_BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${C_RESET}\n"
fi

echo -e "\n${C_GREEN}${C_BOLD}✓ anime-cli installed successfully!${C_RESET}"
echo -e "Try running:\n"
echo -e "  ${C_CYAN}anime-cli \"one piece\"${C_RESET}    # Watch directly in terminal"
echo -e "  ${C_CYAN}anime-cli -b${C_RESET}             # Launch Crunchyroll-style browser app"
echo -e "  ${C_CYAN}anime-cli -s${C_RESET}             # Get QR code to watch on your phone"
echo -e "  ${C_CYAN}anime-cli${C_RESET}                # Open interactive menu\n"
