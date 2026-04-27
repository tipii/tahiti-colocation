# Launch plan — Coolive

Pre-launch audit + punch list to ship Coolive (iOS + Android + web) to the Polynesian market.

Product: `Coolive` · Domain: `coolive.app`

See also: [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md) for prod specs, [`RENAME.md`](./RENAME.md) for the Coloc → Coolive cutover, [`BRAND.md`](./BRAND.md) for identity.

---

## Current status

Core product is feature-complete for v1:

- ✅ Auth (email + Facebook), profile, favorites, listings CRUD with images
- ✅ Candidature flow: apply → accept → finalize with server-side contact gating
- ✅ Notifications scaffold (Brevo + Expo Push, falls back to log when env keys missing)
- ✅ Both app typecheck clean

Missing pieces before store submission split into three priorities below.

---

## 🔴 MUST-HAVE — blockers for store acceptance

### Legal & privacy

- [ ] **Privacy policy** hosted at `https://coolive.app/privacy` (FR + EN). Required by Apple, Google, Meta (FB login), GDPR.
- [ ] **Terms of service** at `https://coolive.app/terms`
- [ ] **Delete account** endpoint (`user.deleteAccount`) + mobile UI entry in Paramètres. Apple guideline 5.1.1(v) rejects without it.
- [ ] **Data export** endpoint (`user.exportData` → returns JSON of user's data). GDPR Art. 20.
- [ ] **Cookie/tracking consent** on web if adding analytics (CNIL compliance for FR/PF).

### Store accounts & build tooling

- [ ] **Apple Developer Program** enrollment ($99/yr) — start now, can take 1–2 weeks validation.
- [ ] **Google Play Console** account ($25 one-time).
- [ ] **iOS `bundleIdentifier`** + **Android `package`** set in `app.json` → `app.coolive` (proposed).
- [x] **`eas.json`** with `development` + `preview` + `production` build profiles.
- [x] **`expo-dev-client`** installed (needed for OAuth + push testing off Expo Go).
- [ ] First `eas build --profile development --platform android` run, APK installed on dev phone.
- [ ] App renamed end-to-end — see [`RENAME.md`](./RENAME.md).

### Auth completeness

- [ ] **Password reset** flow wired (Better Auth has it server-side; needs email template + mobile UI screens *"Mot de passe oublié"* + *"Nouveau mot de passe"*).
- [ ] **Email verification** required before first candidature (already in Better Auth; flip `requireEmailVerification: true`).

### Brand assets

- [ ] 1024×1024 app icon (no alpha) finalized
- [ ] Splash screen final
- [ ] Feature graphic 1024×500 for Play Store
- [ ] Screenshots: iPhone 6.7" (5 shots), iPad 13", Android phone + 7" tablet
- [ ] Short description (80 char) + full description (4000 char) FR + EN

---

## 🟡 SHOULD-HAVE — ship within first 2 weeks

### Notifications (wire placeholders)

- [x] Email provider wired (Brevo, REST direct, configurable via `BREVO_API_KEY` + `EMAIL_FROM_ADDRESS`)
- [ ] Brevo: domain authenticated (SPF/DKIM/DMARC) + sender `hello@coolive.app` verified
- [ ] Email templates (FR): submitted / accepted / finalized / rejected / withdrawn
- [ ] Expo Push credentials (iOS APNs + FCM server key) configured in EAS
- [ ] Mobile: capture push token on first launch → `user.registerPushToken`

### Observability

- [ ] **Sentry** on API (Hono middleware), mobile (Expo SDK), web (Next.js plugin)
- [ ] **Plausible** or **Posthog** for product analytics. Plausible = simpler, CNIL-friendly.
- [ ] Structured logging on API (pino) so Coolify logs are greppable

### Data

- [ ] Switch from `drizzle-kit push` in Dockerfile CMD to proper `drizzle-kit migrate` with committed migrations
- [ ] Managed Postgres (Neon, Supabase, or Coolify managed) instead of docker-compose Postgres — need backups + PITR
- [ ] Daily DB backup verified (restore dry-run)

### Map tiles

- [ ] **Swap OSM raster tiles to a permitted tile source.** Search-tab map currently fetches `tile.openstreetmap.org` directly; OSMF policy forbids high-traffic apps using their public servers. Options: MapTiler free (100k req/mo), Stadia free (200k req/mo non-commercial), or self-host a Protomaps `.pmtiles` PF extract on R2 (free egress via Cloudflare). Tile URL is the only change — no native rebuild needed. See `apps/mobile/components/MapResults.tsx` `OSM_STYLE` constant.
- [ ] **Provider sets listing coordinates on create/edit.** Currently lat/lng are seeded server-side from city centroid + ±300m jitter; new listings created via the app have `null` coords. Add a map picker to the listing form so the provider drops a pin on their general area, then jitter server-side before persist (precise coords never reach the DB).

### CI / quality

- [ ] **GitHub Actions**: typecheck + lint + build on every PR
- [ ] **CHANGELOG.md** + release bump script
- [ ] Version tags: `v0.1.0` for first beta, `v1.0.0` for public launch

---

## 🟢 NICE-TO-HAVE — post-launch iteration

- [ ] Test suite: Vitest (API), React Testing Library (web), Detox or Maestro (mobile)
- [ ] Help center / FAQ at `coolive.app/aide`
- [ ] Google OAuth + Apple OAuth (Facebook is already live)
- [ ] Report listing / block user (moderation)
- [ ] Saved search alerts
- [ ] iOS Universal Links + Android App Links (deep linking from web)
- [ ] Payment integration if monetizing later
- [ ] Multi-device push tokens (currently one `user.pushToken` per user — installing on a second device overwrites the first; migrate to a `user_devices` table when this becomes a real complaint)
- [ ] Listing type `location` for professional rentals (full apartment, no candidature/coloc flow). Enum already reserves the slot in `LISTING_TYPES`; will need a separate listing form variant + adjusted contact flow + provider role / KYC if pros need their own onboarding.
- [ ] Multi-country expansion. Data model is already market-agnostic (`country` / `region` / `city` columns, `REGIONS_BY_COUNTRY` map keyed by country code). To open a new market: add the country to `COUNTRIES`, add its regions to `REGIONS_BY_COUNTRY`, then surface a country selector in filters + listing form (currently hidden, defaults to `'PF'`). UI labels stay French-Polynesia-flavoured (Île, Commune) until a second country ships.

---

## Timeline (solo, part-time pace)

```
Week 1  Legal docs + rename + EAS config + iOS/Android platform IDs
        Start Apple/Google account enrollments in parallel
Week 2  Delete account + export + password reset + email verification gate
        Brevo verified + sender authenticated; templates in FR
Week 3  Sentry + analytics + managed DB migration
        First EAS production build → TestFlight + Play internal testing
Week 4  Screenshots, store copy, submit for review
        Apple review: 1–7 days · Google Play: 1–3 days
```

---

## Immediate next steps (this week)

1. ~~Run `pnpm --filter @coloc/mobile add expo-dev-client` + scaffold `eas.json`.~~ Done.
2. Rename app per [`RENAME.md`](./RENAME.md).
3. Start Apple Developer + Google Play enrollments (multi-day waits — start NOW).
4. Draft privacy policy + ToS (French-primary). Host at `coolive.app/privacy` + `/terms`.
5. Add `user.deleteAccount` + `user.exportData` endpoints.

Once those are done, the app is store-submittable.
