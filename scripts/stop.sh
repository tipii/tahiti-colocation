#!/bin/bash

echo "🛑 Stopping dev environment..."

# Cloudflare Tunnel
if pkill -f "cloudflared tunnel run" 2>/dev/null; then
  echo "🌐 Cloudflare tunnel stopped"
else
  echo "🌐 Cloudflare tunnel not running"
fi

# PostgreSQL
if docker compose -f "$(dirname "$0")/../docker-compose.yml" ps --status running 2>/dev/null | grep -q postgres; then
  docker compose -f "$(dirname "$0")/../docker-compose.yml" down
  echo "🗄️  PostgreSQL stopped"
else
  echo "🗄️  PostgreSQL not running"
fi

# Docker runtime (Colima on macOS, systemd on Linux)
if command -v colima &>/dev/null; then
  if colima status &>/dev/null; then
    echo "🐳 Stopping Colima..."
    colima stop
    echo "🐳 Colima stopped"
  else
    echo "🐳 Colima not running"
  fi
elif systemctl is-active --quiet docker; then
  echo "🐳 Stopping Docker..."
  sudo systemctl stop docker
  echo "🐳 Docker stopped"
else
  echo "🐳 Docker not running"
fi

echo "✅ All services stopped"
