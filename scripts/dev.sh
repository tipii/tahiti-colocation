#!/bin/bash
set -e

echo "🔧 Starting dev environment..."

# 1. Docker runtime (Colima on macOS, systemd on Linux)
if command -v colima &>/dev/null; then
  if ! colima status &>/dev/null; then
    echo "🐳 Starting Colima..."
    colima start --activate
  else
    echo "🐳 Colima already running"
  fi
elif ! docker info &>/dev/null; then
  echo "🐳 Starting Docker..."
  sudo systemctl start docker
else
  echo "🐳 Docker already running"
fi

# 2. PostgreSQL
if ! docker compose -f "$(dirname "$0")/../docker-compose.yml" ps --status running 2>/dev/null | grep -q postgres; then
  echo "🗄️  Starting PostgreSQL..."
  docker compose -f "$(dirname "$0")/../docker-compose.yml" up -d
  echo "🗄️  Waiting for PostgreSQL..."
  sleep 2
else
  echo "🗄️  PostgreSQL already running"
fi

# 3. Cloudflare Tunnel
if ! command -v cloudflared &>/dev/null; then
  echo "⚠️  cloudflared not found — install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
elif ! pgrep -f "cloudflared tunnel run" &>/dev/null; then
  echo "🌐 Starting Cloudflare tunnel..."
  cloudflared tunnel run coloc-dev &>/dev/null &
  TUNNEL_PID=$!
  sleep 2
  if kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "🌐 Tunnel started (dev.theop.dev)"
  else
    echo "⚠️  Cloudflare tunnel failed to start — run 'cloudflared tunnel login' then 'cloudflared tunnel list' to check config"
  fi
else
  echo "🌐 Cloudflare tunnel already running"
fi

echo "✅ Infrastructure ready"
