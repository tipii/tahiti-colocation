# Plan: Candidature-first flow

Replace chat with candidature → acceptance → contact-reveal.

## Core decisions

- Chat removed (RPC, screens, tables)
- Status flow: `pending → accepted → finalized` (multiple `accepted` per listing; one `finalized`)
- Contact revealed both directions when status in (`accepted`,`finalized`) — gated server-side
- `finalize` cascades: archive listing + reject all other non-withdrawn candidatures with `rejectionMessage`
- Notifications: email + push
- FB link = manual URL field (no App Review)
- Couple candidature = boolean flag, partner anonymous
- No pre-accept chat; structured profile fields carry the signal
- Phone required at candidature submit only
- DOB stored, age displayed

## Schema

### `user` — add
- `dob` date
- `phone` text (E.164)
- `occupation` enum(`student`,`employed`,`self_employed`,`retired`,`other`)
- `occupationDetail` text nullable
- `languages` text[] subset `['fr','en','ty']`
- `smoker` enum(`no`,`outside`,`yes`)
- `pets` enum(`none`,`cat`,`dog`,`other`)
- `schedule` enum(`day`,`night`,`flexible`)
- `whatsappOverride` text nullable
- `facebookUrl` text nullable
- `pushToken` text nullable

### `listings` — change
- Rename `numberOfPeople` → `roommateCount`
- Drop `showPhone`
- Drop `contactEmail`

### `candidatures` — add
- `isCouple` boolean default false
- `preferredMoveInDate` date
- `rejectionMessage` text nullable

### Drop
- `conversations`, `messages`

## Contract (`packages/contract`)

- Remove all `chat` procedures
- `listing.*`: rename `numberOfPeople`, strip contact fields from `get`
- `user.update`: accept new profile fields
- `candidature.apply`: add `isCouple`, `preferredMoveInDate`
- `candidature.accept({ id })`: move to `accepted` (no cascade)
- `candidature.finalize({ candidatureId, rejectionMessage })`: cascade — exists but rework to drop chat and set `rejectionMessage` on cascaded rows
- `candidature.contact({ id })`: returns gated contact payload

## API handlers

- `candidature.contact` gating:
  - Candidate: `candidature.userId === context.user.id` AND status in (`accepted`,`finalized`)
  - Provider: `listing.authorId === context.user.id` AND status in (`accepted`,`finalized`)
  - Otherwise: throw Forbidden
- `candidature.accept`: flip status to `accepted`; enqueue candidate notification (shortlisted)
- `candidature.finalize`:
  - flip chosen to `finalized`
  - archive listing
  - other non-withdrawn → `rejected` with `rejectionMessage` column set (drop current chat-based message flow)
  - enqueue: push+email to chosen (finalized); push+email to others (rejected + rejectionMessage)
- `candidature.reject`: set rejection + optional `rejectionMessage`
- Audit all user-returning endpoints: strip `phone`, `whatsappOverride`, `facebookUrl`, `dob` from public shapes

## Notifications (new infra: `apps/api/src/lib/notifications.ts`)

- Email: Resend (`RESEND_API_KEY`)
- Push: Expo Push API (`EXPO_PUSH_ACCESS_TOKEN`, `user.pushToken`)
- Events:
  - `candidature.submitted` → email provider
  - `candidature.accepted` → email + push candidate (shortlisted, contact revealed)
  - `candidature.finalized` → email + push chosen candidate
  - `candidature.rejected` (incl. cascade on finalize) → email + push candidate (with `rejectionMessage`)
  - `candidature.withdrawn` → email provider

## UI (mobile + web)

### Listing card
`🏠 Coloc à {roommateCount} + {N} ({toi|vous|toi ou vous})` per `roomType`:
- `single` → + 1 (toi)
- `couple` → + 2 (vous)
- `both` → + 1 ou 2 (toi ou vous)

### Listing detail
- "Vous vivrez avec {roommateCount} personne(s)"
- No contact fields
- `Postuler` CTA

### Listing form
- Label: "Nombre de colocataires actuels" · helper "Vous non compris"
- Remove `showPhone`, `contactEmail` inputs

### Profile edit
- New fields: dob, phone, occupation (+ detail), languages, smoker, pets, schedule, whatsappOverride, facebookUrl
- Profile completion badge (required = avatar, name, dob, occupation, smoker, pets, phone)

### Candidature submit
- Inputs: `message`, `preferredMoveInDate`, `isCouple`
- Block submit if required profile fields missing; inline prompt to fill

### Candidature detail (candidate view)
- Status badge, withdraw (pending only)
- Contact block post-accept
- `rejectionMessage` shown if rejected

### Candidature detail (provider view)
- Candidate profile (name, age, occupation, lifestyle tags, bio, languages)
- Candidature message, preferredMoveInDate, isCouple
- Pending: Accept / Reject
- Accepted: Finalize (with optional thank-you input) / Reject
- Contact block when accepted or finalized

### Provider candidatures list (per listing)
- Card list, newest first, status filter
- Tap → detail

### Profile menu
- Remove "Messages"
- Keep "Mes candidatures" (already exists) — verify screen renders candidate view list

## Cleanup

- Delete `apps/api/src/rpc/chat.ts`
- Remove chat from `router.ts`
- Delete chat procedures + schemas from contract
- Delete `apps/mobile/app/chat/`, `apps/mobile/app/profile/messages.tsx` (it's currently Candidatures — restore or delete)
- Delete web chat routes if any
- Drop chat tables via `db:push`

## Execution order

1. Schema: add user/candidature fields, rename `numberOfPeople`, `db:push`
2. Contract: update procedures (keep chat temp to avoid blocking)
3. API: handlers + gating + notifications scaffold
4. Mobile UI + Web UI in parallel
5. Remove chat (contract, API, screens, tables)
6. Re-seed
7. QA: full candidate + provider flows, acceptance cascade, contact gating, notification delivery

## Open items

- Resend domain verification for `dev.theop.dev`
- Expo push credentials (dev build needed — Expo Go can't receive pushes reliably)
- Email template design (French)
