# Coloc

Colocation platform for French Polynesia. Monorepo: `apps/api` (Hono), `apps/web` (Next.js), `apps/mobile` (Expo), `packages/shared`, `packages/contract`.

## Commands

- `pnpm dev` — starts Colima, Postgres, Cloudflare tunnel, then Turbo (API + Drizzle Studio + Web + Mobile)
- `pnpm stop` — tears down all services
- `pnpm db:push` — apply schema changes
- `pnpm turbo typecheck` — typecheck all apps

## Architecture

All traffic goes through Next.js (port 3000) which proxies `/api/*` and `/rpc/*` to Hono (port 3001). Same-origin cookies, no CORS issues. See `ARCHITECTURE.md` for details.

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

## Key Files

- `packages/contract/src/` — Zod schemas, oRPC contract definitions, Contract type
- `apps/api/src/rpc/` — oRPC handlers (listing.ts, image.ts, router.ts, context.ts, base.ts)
- `apps/api/src/routes/images.ts` — image upload REST endpoint (multipart)
- `apps/api/src/db/schema.ts` — Drizzle schema with `$type<>()` narrowing for enum fields
- `apps/web/src/lib/orpc.ts` — typed oRPC client + TanStack Query utils
- `apps/mobile/lib/orpc.ts` — typed oRPC client with cookie forwarding

## Web Frontend

- **UI components**: shadcn/ui (base-nova style) — `apps/web/src/components/ui/`
- **Forms**: TanStack Form — validate with contract Zod schemas
- **Data fetching**: oRPC + TanStack Query — `orpc.listing.list.queryOptions()`
- **Styling**: Tailwind v4, shadcn design tokens

## Mobile

- **UI**: NativeWind v4 (Tailwind classes on React Native)
- **Data fetching**: oRPC + TanStack Query
- **Forms**: plain useState
- **Image upload**: via REST API proxy (`/api/images/upload`), not direct R2

## Rules

- **Type safety first**: all API types flow from `packages/contract`. Never use `any` for RPC types.
- **DB enum fields**: use `.$type<>()` on Drizzle varchar columns to narrow to contract enum unions
- **Better Auth schema**: always generate with `npx @better-auth/cli generate`, never hand-write
- **Images**: upload through API (`/api/images/upload`), not directly to R2 (Expo Go IPv6 issue)
- **Images**: only store medium (1200x900) + thumbnail (200x200), no original
- **French only** for all UI labels
- **Currency**: XPF (integer, no decimals)
- **DB migrations**: `db:push` in dev, auto-push on deploy via Dockerfile CMD

## Dev Environment

- Docker: Colima (macOS)
- DB: Postgres 17 via Docker Compose
- Tunnel: Cloudflare (`dev.theop.dev` → localhost:3000)
- Mobile dev caveat: Expo Go can't fetch IPv6 hosts (Cloudflare). Use LAN IP as fallback.

## Plans
- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
- When executing a plan, update plan at each step if its written on a md file.
- If there's question to resolve, ask them one by one and wait for user input.

## Git
- **Never mention Claude, AI, or add Co-Authored-By lines in commits** — no trace of AI in git history
- Make concise descriptions about what changes were made, bullet list appreciated
