# Rename: Coloc → Coolive

Cutover checklist. Distinguishes **user-facing** strings (must change) from **internal** package scopes (can keep as-is).

See also: [`BRAND.md`](./BRAND.md), [`LAUNCH.md`](./LAUNCH.md).

---

## Guiding principle

**Rename user-facing surfaces. Leave internal package names alone.**

Internal `@coloc/*` npm scopes have no marketing consequence and renaming them means touching every import in the monorepo. Common practice (Meta / Facebook, Airbnb / "Concur", etc.): product name ≠ codebase name. Keep the codebase internal, rebrand externally.

---

## MUST change — user-facing

### Mobile app metadata

File: `apps/mobile/app.json`

```diff
  "expo": {
-   "name": "Coloc",
-   "slug": "mobile",
+   "name": "Coolive",
+   "slug": "coolive",
-   "scheme": "mobile",
+   "scheme": "coolive",
+   "ios": {
+     "supportsTablet": true,
+     "bundleIdentifier": "app.coolive.mobile"
+   },
+   "android": {
+     "package": "app.coolive.mobile",
      …
+   }
  }
```

### User-facing strings (search & replace "Coloc Tahiti" → "Coolive")

- `apps/mobile/app/(auth)/signup.tsx:52`
- `apps/mobile/app/(auth)/login.tsx:65`
- `apps/mobile/app/(tabs)/index.tsx:39`
- `apps/web/src/components/header.tsx:23`

### Web metadata

- `apps/web/src/app/layout.tsx` — set `metadata.title` to `"Coolive — La coloc en Polynésie"`
- `apps/web/src/app/layout.tsx` — `metadata.description` per [`BRAND.md`](./BRAND.md)
- `apps/web/public/favicon.ico` + `apple-icon.png` — replace with Coolive assets

### App store / Play Store copy

Per [`LAUNCH.md`](./LAUNCH.md):
- **Name**: `Coolive`
- **Subtitle / short desc**: `Ta coloc, sans prise de tête`
- **Category**: Lifestyle (primary), House & Home (secondary)

### Support email

- `hello@coolive.app` (forwarder or managed inbox)

### Social handles

- IG: `@coolive.pf`
- FB: Page `Coolive`

### Production DNS & infra names

Per [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md):
- `coolive.app` (web)
- `api.coolive.app`
- `img.coolive.app`
- `mail.coolive.app`

### Facebook OAuth (prod app)

Create a new Facebook app named **Coolive** for prod. Keep the existing `Colocathlon` app for dev.
- Valid OAuth Redirect URI: `https://api.coolive.app/api/auth/callback/facebook`
- App Domain: `api.coolive.app`

---

## CAN stay — internal codebase

These are fine to leave as `coloc`/`@coloc`. Renaming = chore with zero user impact.

- `@coloc/api`, `@coloc/mobile`, `@coloc/web`, `@coloc/shared`, `@coloc/ui`, `@coloc/contract` (workspace package scopes)
- Root package.json `name: "coloc"`
- Git repository name (`tahiti-colocation`)
- Docker container names (`coloc-postgres`)
- Dev database name / user / password (`coloc` / `coloc` / `coloc`)
- Dev R2 bucket name (`coloc`)

### Optional cleanup (low priority)

If you eventually want codebase-level consistency:
- `packages/shared/package.json` → `@coolive/shared` etc.
- Requires updating every import across ~40+ files, regenerating lockfile
- Defer until post-launch if it matters

---

## Cutover order

Do user-facing changes as one PR, atomic:

1. Update `app.json` (name, slug, scheme, bundle IDs)
2. Swap "Coloc Tahiti" literals for "Coolive" in the 5 files listed
3. Update web `layout.tsx` metadata
4. Bump mobile version to `0.1.0` (first beta)
5. Commit: `rename: coloc → coolive (user-facing)`
6. In parallel (not blocking): start DNS for `coolive.app`, create prod FB app

### Migration concerns

- **Mobile scheme change** (`mobile://` → `coolive://`): invalidates any in-flight OAuth sessions. Since you only have test users, fine.
- **Better Auth `trustedOrigins`**: add `coolive://` alongside existing `mobile://` during transition (remove `mobile://` after first release is stable).
- **Deep links**: if any hardcoded `mobile://...` exist, search and replace.

### Verification after rename

- `pnpm turbo typecheck` clean
- `pnpm dev` → mobile shows "Coolive" on splash + login
- Web header renders "Coolive"
- Facebook login still works (tests the scheme rename)

---

## Post-rename git commit message

```
rename: Coloc → Coolive (user-facing surfaces only)

- app.json: name/slug/scheme + iOS bundleIdentifier + Android package (app.coolive.mobile)
- replace "Coloc Tahiti" literal with "Coolive" in login, signup, home, web header
- web metadata (title + description)
- bump mobile version to 0.1.0 for first beta

Internal @coloc/* package scopes left intact.
```
