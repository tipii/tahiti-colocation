# Infrastructure — Coolive

Production setup for `coolive.app`. Covers domains, deploy target, databases, storage, email, push, CI/CD, and versioning.

See [`LAUNCH.md`](./LAUNCH.md) for the pre-launch punch list, [`RENAME.md`](./RENAME.md) for the Coloc → Coolive cutover.

---

## Domain map

| Surface | Domain | Notes |
|---|---|---|
| Web app (primary) | `coolive.app` | Next.js (proxies `/api/*` + `/rpc/*` to Hono) |
| API (direct, mobile only) | `api.coolive.app` | Hono; mobile hits directly |
| Image CDN (R2) | `img.coolive.app` | Cloudflare R2 custom domain |
| Transactional email | `mail.coolive.app` | Resend-verified subdomain (DKIM/SPF/DMARC) |
| Support email | `hello@coolive.app` | Inbox or forwarder to your personal |
| Staging | `dev.theop.dev` | Keep as-is for now, re-parent later if wanted |

Note: even though the web proxies `/api`, mobile uses `api.coolive.app` directly (avoids an extra hop).

---

## Deploy target — Coolify

Existing `docker-compose.prod.yml` is Coolify-compatible. Recommended layout:

- **One Coolify project**: `coolive`
- **Services**:
  - `web` (Next.js) — port 3000, domain `coolive.app`
  - `api` (Hono) — port 3001, domain `api.coolive.app`
  - `postgres` — **prefer managed over Docker**; see Database below
- SSL: Coolify auto-provisions via Let's Encrypt (Traefik)

Deploy trigger: Coolify's GitHub integration on pushes to `main`.

### Build notes

Both apps have `Dockerfile`:
- API builds Sharp + migrations-on-start
- Web is Next.js standalone

Once migrations are version-controlled (see Database), replace `drizzle-kit push` in the API's `CMD` with `drizzle-kit migrate`.

---

## Database

### Recommendation: managed Postgres (not Docker in prod)

Candidates:
- **Neon** — good free tier, branching for preview envs, Paris region
- **Supabase Postgres** — if you want auth/storage tools later
- **Coolify managed Postgres add-on** — simplest if you stay in the Coolify UI

Requirements:
- Daily automated backups (PITR ideally)
- Test restore quarterly
- Network: private where possible; if public, restrict by CIDR / IP

### Migrations

Switch from `db:push` (destructive, prompts interactively, loses data on renames) to committed migrations:

```bash
pnpm --filter @coloc/api drizzle-kit generate    # creates SQL migration files
# commit the /apps/api/drizzle/ directory
pnpm --filter @coloc/api drizzle-kit migrate     # applies pending migrations
```

Dockerfile `CMD` should run `migrate` on startup. `db:push` stays available for dev only.

---

## Object storage — Cloudflare R2

Already configured for dev. For prod:

- Separate bucket: `coloc-prod` (or rename existing)
- Custom domain: `img.coolive.app` → R2 public bucket
- Public read only — write via signed URLs from API
- Lifecycle rule: delete originals in `uploads/` after 7 days (cleanup orphans)

Env vars (prod, separate values from dev):
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=coloc-prod`
- `R2_PUBLIC_URL=https://img.coolive.app`

---

## Email — Resend

1. Create Resend account
2. Add domain `mail.coolive.app` → add DNS records (SPF, DKIM, return-path)
3. Wait for verification
4. Default `from`: `Coolive <hello@mail.coolive.app>`
5. Env: `RESEND_API_KEY=re_...`

Templates to build (all FR first):
- `candidature.submitted` (to provider)
- `candidature.accepted` (to candidate)
- `candidature.finalized` (to chosen)
- `candidature.rejected` (to others + optional thank-you)
- `candidature.withdrawn` (to provider)
- `password.reset`
- `email.verification`

Templates live in `apps/api/src/lib/notifications.ts` or a new `apps/api/src/lib/email-templates/` directory.

---

## Push — Expo Push + APNs/FCM

Expo Push is the SDK layer; it still relies on Apple and Google delivery under the hood.

Setup:
1. Apple: create a push cert / p8 key in Apple Developer account
2. Google: FCM server key from Firebase console
3. Upload both to EAS (`eas credentials`)
4. `EXPO_PUSH_ACCESS_TOKEN` (optional access token for higher rate limits) → env var
5. Un-stub the push branch in `apps/api/src/lib/notifications.ts`
6. Mobile captures the token via `expo-notifications.getExpoPushTokenAsync()` → `user.registerPushToken`

Expo Go cannot receive push notifications — need a dev build or standalone.

---

## Observability

### Error tracking — Sentry

| Surface | Package |
|---|---|
| API (Hono) | `@sentry/node` + manual Hono middleware |
| Web (Next.js) | `@sentry/nextjs` — use the wizard, it configures all runtimes |
| Mobile (Expo) | `sentry-expo` (install follows EAS build) |

Separate projects per surface in Sentry. Source maps uploaded via EAS + Next plugin.

### Product analytics — Plausible (recommended)

- Script on web: `coolive.app` domain
- CNIL-friendly, no cookie banner required
- For mobile events, Plausible isn't great — use Posthog if you want app analytics too

### Logging

- Replace `console.log` in API with `pino` (JSON logs)
- Coolify captures stdout; you can ship to Axiom/Better Stack later

---

## Mobile builds — EAS

We use **Expo Application Services (EAS)** for native mobile builds. Rationale: our primary dev box is Linux aarch64 where Google doesn't officially ship Android SDK build-tools, and we don't own a Mac for iOS. EAS's free tier covers solo-dev cadence.

Config: `apps/mobile/eas.json` with three profiles:

| Profile | Purpose | Output |
|---|---|---|
| `development` | Dev client for local Metro + hot reload | APK (Android), device build (iOS) |
| `preview` | TestFlight / Play internal testing | APK / IPA |
| `production` | Store submission | AAB (Android), IPA (iOS), auto-increment build number |

Commands (from `apps/mobile/`):

```bash
pnpm exec eas login                                   # one-time
pnpm exec eas build --profile development --platform android
pnpm exec eas build --profile production --platform all    # when ready to submit
pnpm exec eas submit --profile production --platform all   # uploads to stores
```

EAS Dashboard → Project → Environment Variables holds build-time env vars (e.g. `EXPO_PUBLIC_API_URL` for prod, Sentry DSN). Separate per `development` / `preview` / `production` target.

Between native releases, JS-only patches go out via **EAS Updates** — no store re-review.

## CI/CD — GitHub Actions

Two workflows:

### `.github/workflows/ci.yml`
Runs on every PR:
- `pnpm install`
- `pnpm turbo typecheck`
- `pnpm turbo lint`
- `pnpm turbo build`

### `.github/workflows/release.yml`
Runs on push to `main` or tag `v*`:
- Bumps version
- Creates GitHub release from CHANGELOG
- Coolify auto-deploys from `main` (separate path)

### Mobile builds
EAS handles mobile builds (see section above). GitHub Actions isn't involved.

---

## Versioning

Single version across the monorepo (one product, one number). Semver:

- **0.1.0** → first beta (TestFlight + Play internal testing)
- **0.1.1, 0.1.2** → beta patches during review feedback
- **1.0.0** → public launch
- **1.x.y** → standard semver after

Tags: `v0.1.0`, `v1.0.0` — one git tag per public release.

Bump script — future candidate:
```bash
pnpm version:bump 0.1.0  # updates root + apps/*/package.json + app.json
```

Between native releases, JS-only patches go out via EAS Updates (no store re-review).

---

## Environment matrix

| Var | Dev | Staging | Prod |
|---|---|---|---|
| `DATABASE_URL` | local Docker | staging managed | prod managed |
| `BETTER_AUTH_URL` | `http://localhost:3001` | `https://api-staging.coolive.app` | `https://api.coolive.app` |
| `BETTER_AUTH_SECRET` | dev secret | unique | unique |
| `FACEBOOK_CLIENT_ID` | shared FB app (dev mode) | shared | **separate prod FB app** |
| `FACEBOOK_REDIRECT_URI` | `https://dev.theop.dev/api/auth/callback/facebook` | staging URI | `https://api.coolive.app/api/auth/callback/facebook` |
| `R2_BUCKET_NAME` | `coloc` | `coloc-staging` | `coloc-prod` |
| `R2_PUBLIC_URL` | `https://img.theop.dev` | staging CDN | `https://img.coolive.app` |
| `RESEND_API_KEY` | dev key (sandbox) | dev key | prod key |
| `EXPO_PUBLIC_API_URL` (mobile) | tunnel or LAN IP | `https://api-staging.coolive.app` | `https://api.coolive.app` |

Keep a `.env.example` updated with the full list; real values in Coolify's secrets (never in git).

---

## Secrets checklist (prod)

Create accounts / generate and store in Coolify:

- [ ] `BETTER_AUTH_SECRET` — `openssl rand -hex 32`
- [ ] `DATABASE_URL`
- [ ] `FACEBOOK_CLIENT_ID` + `FACEBOOK_CLIENT_SECRET` (separate prod FB app)
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (optional, later)
- [ ] `APPLE_CLIENT_ID` + `APPLE_CLIENT_SECRET` (optional, later — mandatory on iOS if you use Google/FB login)
- [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- [ ] `RESEND_API_KEY`
- [ ] `EXPO_PUSH_ACCESS_TOKEN`
- [ ] `SENTRY_DSN` (per surface)

---

## Rollback plan

- DB: point-in-time restore via managed provider (test it once)
- App containers: Coolify keeps previous deploy, click-revert
- Mobile: EAS updates can be rolled back; native releases only via new store submission (1–7 day review) — so be conservative with native changes
