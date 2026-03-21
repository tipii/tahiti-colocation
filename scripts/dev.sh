#!/bin/bash
set -e

echo "🔧 Starting dev environment..."

# 1. Colima (Docker runtime)
if ! colima status &>/dev/null; then
  echo "🐳 Starting Colima..."
  colima start --activate
else
  echo "🐳 Colima already running"
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
if ! pgrep -f "cloudflared tunnel run" &>/dev/null; then
  echo "🌐 Starting Cloudflare tunnel..."
  cloudflared tunnel run coloc-dev &>/dev/null &
  echo "🌐 Tunnel started (dev.theop.dev)"
else
  echo "🌐 Cloudflare tunnel already running"
fi

echo "✅ Infrastructure ready"
