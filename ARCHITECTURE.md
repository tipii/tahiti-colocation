# Architecture

Technical reference for the codebase. For product/brand see [`BRAND.md`](./BRAND.md); for launch plan [`LAUNCH.md`](./LAUNCH.md); for prod infra [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md).

## Overview

Monorepo (pnpm + Turborepo):

```
apps/
  api/       → Hono standalone server (port 3001)
  web/       → Next.js 16 (port 3000)
  mobile/    → Expo SDK 55 (Expo Router, NativeWind)
packages/
  contract/  → oRPC contract (Zod schemas + procedure signatures)
  shared/    → Constants, types, helpers shared across apps
  ui/        → Design tokens (color, radius)
```

Internal package scope stays `@coloc/*` even though the product is branded Coolive — rename is external only (see [`RENAME.md`](./RENAME.md)).

## Request flow

Web traffic goes through Next.js, which proxies `/api/*` and `/rpc/*` to Hono. Same-origin cookies, no CORS issues.

```
Browser  → Next.js (3000)   → /api/* + /rpc/* rewrite → Hono (3001)
Mobile   → Hono directly (LAN IP in dev, api.coolive.app in prod)
OAuth    → Next.js (3000)   → /api/auth/callback/* → Hono (3001)
```

### Why the proxy for web

- Same-origin cookies with `SameSite=Lax`
- No CORS on the browser side
- OAuth redirect URIs live on one hostname
- Mirrors prod behind Coolify/Traefik

### Mobile dev caveat

Expo Go + Cloudflare = broken IPv6 (React Native OkHttp lacks Happy Eyeballs). Mobile dev hits the LAN IP (`http://192.168.x.x:3001`) directly. In production, standalone builds implement IPv6 correctly, so `https://api.coolive.app` works.

## Contract-first RPC (oRPC)

```
packages/contract (@orpc/contract + zod)   ← schemas + procedure signatures
       ↓                     ↓
   apps/api          apps/web + apps/mobile
   (@orpc/server)    (@orpc/client + @orpc/tanstack-query)
   implements        imports Contract type → full type safety
```

- **Contract** (`packages/contract/src/`): Zod schemas + `oc` procedure definitions. Zero server deps. Single source of truth for types.
- **Server** (`apps/api/src/rpc/`): `implement(contract)` with handler files per domain.
- **Clients** (`apps/*/lib/orpc.ts`): `ContractRouterClient<Contract>` + `createTanstackQueryUtils` → `orpc.listing.list.queryOptions()`.
- **Image upload** stays REST (`/api/images/upload`) — multipart FormData doesn't fit RPC.

### Procedure domains

- `listing` — CRUD, search, publish/archive
- `image` — list, delete, reorder
- `favorite` — list, ids, toggle
- `candidature` — apply, withdraw, accept, reject, finalize, forListing, mine, count, contact
- `user` — me, update, updateAvatar, removeAvatar, setMode, registerPushToken

## Auth (Better Auth)

- Email/password + Facebook OAuth (Google + Apple wired but not enabled)
- Expo plugin (`@better-auth/expo`) for mobile token forwarding via custom scheme
- Session cookies in Postgres (`session` table)

## Candidature flow (core product loop)

Statuses: `pending → accepted → finalized` (with `rejected` / `withdrawn` side exits).

- Multiple `accepted` candidatures per listing allowed — shortlist
- One `finalized` per listing — cascades: archives listing + rejects other non-withdrawn candidatures (copies optional thank-you into `rejectionMessage`)
- **Contact reveal** gated server-side in `candidature.contact`: returns phone/whatsapp/email/facebookUrl only if the caller is either the candidate or the listing owner AND status ∈ (`accepted`, `finalized`)
- No chat — replaced by structured profile fields + off-platform contact after acceptance

## Notifications

`apps/api/src/lib/notifications.ts` — event dispatch with Brevo (email) + Expo Push (mobile). Events:

- `candidature.submitted` → email provider
- `candidature.accepted` → email + push candidate
- `candidature.finalized` → email + push chosen
- `candidature.rejected` → email + push candidate with optional message
- `candidature.withdrawn` → email provider

Live providers wired when `BREVO_API_KEY` / `EXPO_PUSH_ACCESS_TOKEN` env vars present; otherwise logs to stdout.

## Database

- **PostgreSQL 17** via Docker (dev) / managed (prod — see [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md))
- **Drizzle ORM** with `pg` driver
- Schema in `apps/api/src/db/schema.ts` — uses `.$type<>()` to narrow varchar columns to contract enum unions
- Better Auth tables (user, session, account, verification) generated once via `npx @better-auth/cli generate`; hand-edit is allowed after
- `pnpm db:push` in dev (destructive renames require SQL `ALTER`); committed migrations in prod
- `pnpm db:studio` for Drizzle Studio

## Image upload (Cloudflare R2 + Sharp)

Flow:
1. Client POSTs multipart to `/api/images/upload` (API, not R2 directly — Expo Go IPv6 workaround)
2. API processes with Sharp into 2 WebP variants:
   - **Medium**: `fit: inside`, 1200×900, quality 85
   - **Thumbnail**: `fit: cover`, 200×200, quality 80
3. Both variants uploaded to R2; original not kept
4. Row inserted into `images` table (polymorphic: `entityType` + `entityId`; supports `listing` and `avatar`)

Storage layout:
```
images/
  {entityType}/{entityId}/{imageId}/
    medium.webp
    thumb.webp
```

## Dev environment

`scripts/dev.sh` detects host and boots the right services:

1. **Docker runtime**: Colima on macOS, systemd on Linux
2. **PostgreSQL 17** via `docker-compose.yml`
3. **Cloudflare Tunnel** (`coloc-dev`) exposes `dev.theop.dev` → localhost:3000 if `cloudflared` is installed; skips with a warning otherwise

`pnpm dev` runs the script then Turbo (API + Drizzle Studio + Web + Mobile).
`pnpm stop` tears everything down.

## Tech stack

| Layer      | Tech                                 |
| ---------- | ------------------------------------ |
| API        | Hono + oRPC                          |
| Web        | Next.js 16 (App Router, React 19)    |
| Mobile     | Expo SDK 55 (Expo Router)            |
| Styling    | Tailwind CSS v4 (web), NativeWind v4 (mobile) |
| Forms      | TanStack Form (web), useState (mobile) |
| Data       | oRPC + TanStack Query                |
| Database   | PostgreSQL 17 + Drizzle ORM          |
| Auth       | Better Auth + @better-auth/expo      |
| Storage    | Cloudflare R2                        |
| Images     | Sharp (server-side, 2 WebP variants) |
| Email      | Resend (wired via placeholder)       |
| Push       | Expo Push (wired via placeholder)    |
| Deployment | Coolify (planned, see [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md)) |
| Monorepo   | pnpm workspaces + Turborepo          |
