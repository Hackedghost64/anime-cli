#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

echo "================================================="
echo "   ⚡ Launching Shinsei Anime Streaming App     "
echo "   Access on this PC:  http://localhost:$PORT   "
echo "   Access on Wi-Fi:    http://$(hostname -I | awk '{print $1}'):$PORT "
echo "================================================="

python3 main.py
