# Coolive

Colocation platform for French Polynesia. Monorepo: `apps/api` (Hono), `apps/web` (Next.js), `apps/mobile` (Expo), `packages/contract`, `packages/shared`, `packages/ui`.

Product is branded **Coolive**; internal package scope stays `@coloc/*`. See `RENAME.md` for the user-facing rename scope.

## Commands

- `pnpm dev` — starts Docker runtime (Colima on macOS, systemctl on Linux), Postgres, Cloudflare tunnel (if `cloudflared` installed), then Turbo (API + Drizzle Studio + Web + Mobile)
- `pnpm stop` — tears down all services
- `pnpm db:push` — apply schema changes (dev only)
- `pnpm --filter @coloc/api db:seed` — seed users, listings, candidatures (full profile fields)
- `pnpm --filter @coloc/api db:seed-images` — upload + process fresh images to R2 (slow)
- `pnpm --filter @coloc/api db:reattribute-images` — fast path: reuse existing R2 objects for current listings (no upload)
- `pnpm turbo typecheck` — typecheck all apps

## Architecture

All traffic goes through Next.js (port 3000) which proxies `/api/*` and `/rpc/*` to Hono (port 3001). Same-origin cookies, no CORS issues. Mobile hits Hono directly (LAN IP in dev, `api.coolive.app` in prod). See `ARCHITECTURE.md`.

### oRPC (contract-first)

```
packages/contract  (@orpc/contract + zod)  ← schemas + procedure signatures
    ↓                    ↓
apps/api             apps/web + apps/mobile
(@orpc/server)       (@orpc/client + @orpc/tanstack-query)
implements contract  imports Contract type → full type safety
```

- **Contract** (`packages/contract`): Zod schemas + `oc` procedure definitions. Zero server deps. Single source of truth.
- **Server** (`apps/api/src/rpc/`): `implement(contract)` → handlers with Drizzle queries
- **Clients**: `ContractRouterClient<Contract>` + `createTanstackQueryUtils` → `orpc.listing.list.queryOptions()`
- **Image upload** stays REST (`/api/images/upload`) — multipart FormData not suited for RPC

## Product model

### Candidature flow
`pending → accepted → finalized` (with `rejected` / `withdrawn` exits).
- Multiple `accepted` per listing allowed (shortlist)
- One `finalized` per listing — cascades: archives listing + rejects other non-withdrawn with optional `rejectionMessage`
- Contact reveal gated server-side in `candidature.contact`: returns phone / whatsapp / email / facebookUrl only if caller is candidate OR listing owner AND status ∈ (`accepted`, `finalized`)
- No chat; structured profile fields + off-platform contact after acceptance

### User profile fields (affecting candidature)
- Required to apply: `avatar`, `name`, `dob`, `occupation`, `smoker`, `pets`, `phone`
- Optional: `bio`, `occupationDetail`, `languages[]`, `schedule`, `whatsappOverride`, `facebookUrl`
- Age derived from `dob` (DOB never leaves server)

## Key Files

- `packages/contract/src/` — Zod schemas, oRPC contract definitions, Contract type
- `apps/api/src/rpc/` — oRPC handlers (listing.ts, image.ts, router.ts, context.ts, base.ts, candidature.ts, user.ts)
- `apps/api/src/routes/images.ts` — image upload REST endpoint (multipart)
- `apps/api/src/db/schema.ts` — Drizzle schema with `$type<>()` narrowing for enum fields
- `apps/api/src/lib/notifications.ts` — event dispatcher (Resend + Expo Push, currently stubbed)
- `apps/web/src/lib/orpc.ts` — typed oRPC client + TanStack Query utils
- `apps/mobile/lib/orpc.ts` — typed oRPC client with cookie forwarding

## Web Frontend

- **UI components**: shadcn/ui (base-nova style) — `apps/web/src/components/ui/`
- **Forms**: TanStack Form — validate with contract Zod schemas
- **Data fetching**: oRPC + TanStack Query — `orpc.listing.list.queryOptions()`
- **Styling**: Tailwind v4, shadcn design tokens (palette in `BRAND.md`)

## Mobile

- **UI**: NativeWind v4 (Tailwind classes on React Native)
- **Data fetching**: oRPC + TanStack Query
- **Forms**: plain useState
- **Image upload**: via REST API proxy (`/api/images/upload`), not direct R2 (Expo Go IPv6 issue)

## Rules

- **Type safety first**: all API types flow from `packages/contract`. Never use `any` for RPC types (exception: the `auth` export in `apps/api/src/lib/auth.ts` needs `: any` due to a Better Auth 1.6 type leak from internal zod v4).
- **DB enum fields**: use `.$type<>()` on Drizzle varchar columns to narrow to contract enum unions
- **Better Auth schema**: generate with `npx @better-auth/cli generate` if you regenerate; hand-edit allowed after
- **Images**: upload through API (`/api/images/upload`), not directly to R2 (Expo Go IPv6 issue)
- **Images**: only store medium (1200×900) + thumbnail (200×200) WebP, no original
- **Contact fields** (`phone`, `whatsappOverride`, `facebookUrl`, `dob`): NEVER return from any RPC except `user.me` (self) or `candidature.contact` (status-gated). Audit before adding new endpoints.
- **French only** for all UI labels; tutoiement (see `BRAND.md` voice rules)
- **Currency**: XPF (integer, no decimals)
- **DB migrations**: `db:push` in dev, committed migrations in prod (see `INFRASTRUCTURE.md`)

## Dev Environment

- Docker: Colima (macOS) or systemd (Linux) — `scripts/dev.sh` auto-detects
- DB: Postgres 17 via Docker Compose
- Tunnel: Cloudflare (`dev.theop.dev` → localhost:3000) — skipped with warning if `cloudflared` missing
- Mobile dev caveat: Expo Go can't fetch IPv6 hosts (Cloudflare). Use LAN IP as fallback.
- Facebook OAuth in mobile: requires a dev build (EAS); Expo Go can't handle the scheme redirect reliably.

## Mobile builds (EAS)

Native builds use Expo Application Services (EAS); local Android/iOS builds aren't viable on this Linux aarch64 box. See `INFRASTRUCTURE.md` for profiles. Common commands from `apps/mobile/`:

```bash
pnpm exec eas build --profile development --platform android   # dev client APK
pnpm exec eas build --profile production --platform all        # store-ready
pnpm exec eas submit --profile production --platform all       # upload to stores
```

## Plans
- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
- When executing a plan, update plan at each step if its written on a md file.
- If there's question to resolve, ask them one by one and wait for user input.

## Git
- **Never mention Claude, AI, or add Co-Authored-By lines in commits** — no trace of AI in git history
- Make concise descriptions about what changes were made, bullet list appreciated

## Related docs
- `BRAND.md` — identity, voice, palette, product vocabulary
- `LAUNCH.md` — pre-launch punch list + timeline
- `INFRASTRUCTURE.md` — prod domains, deploy, versioning
- `RENAME.md` — Coloc → Coolive cutover
- `ARCHITECTURE.md` — deeper technical reference
- `SEED.md` — dev test users
