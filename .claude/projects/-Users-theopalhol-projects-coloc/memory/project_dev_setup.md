---
name: dev_setup
description: Dev environment setup - Colima, Cloudflare tunnel, IPv6 workaround, LAN IP for mobile
type: project
---

Dev setup uses `pnpm dev` which runs `scripts/dev.sh` (infrastructure) then `turbo run dev` (apps).

Infrastructure: Colima → Docker → PostgreSQL, Cloudflare tunnel (coloc-dev → api-dev.theop.dev).

**Why:** Mobile Expo Go on Android can't fetch from domains with IPv6 AAAA records (React Native OkHttp bug, no Happy Eyeballs). Cloudflare forces IPv6 on, can't disable it.

**How to apply:** Mobile uses LAN IP (`EXPO_PUBLIC_API_URL=http://192.168.178.62:3001`) for direct API access. Tunnel URL is only for Facebook OAuth callback (`FACEBOOK_REDIRECT_URI`). `skipStateCookieCheck: true` in dev because proxy and callback are on different domains. In production, everything on same domain — remove skip, no LAN IP needed.

Stop services: `pnpm stop` runs `scripts/stop.sh`.
