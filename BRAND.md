# Coolive — Brand Guidelines

## Identity

- **Name**: Coolive
- **Reading**: *Cool* + *Live* (nod to *coliving*)
- **Pronunciation**: "kool-live" (EN), "cou-live" (FR)
- **Domain**: [coolive.app](https://coolive.app) (primary)
- **Positioning**: La coloc en Polynésie, sans prise de tête.

## Tagline

**"La coloc, en mieux."**

Secondary (context-dependent):
- "Ta coloc sans prise de tête." — problem/solution
- "Cherche. Trouve. Installe-toi." — product flow
- "Respire, t'es chez toi." — emotional

## Voice & tone

- French-first; tutoiement always (`tu`, never `vous` to users)
- Short, confident sentences; sacrifice grammar for clarity
- Warm, never corporate; no hedging
- Occasional casual loanwords welcome: *cool*, *chill*, *match*
- Never apologize for features that work as designed
- When saying no, say it clearly (e.g. "Contact visible après acceptation.")

## Color palette

| Role | Hex | Usage |
|---|---|---|
| Primary | `#FF6B35` | CTAs, active state, price, brand accents |
| Secondary | `#0D9488` | Info icons, secondary actions, map pins |
| Background | `#FFF8F0` | App/page background |
| Card | `#FFFFFF` | Surfaces above background |
| Border | `#E8DDD3` | Dividers, input outlines |
| Foreground | `#2D2A26` | Primary text |
| Muted fg | `#8B7E74` | Secondary text, placeholders |
| Destructive | `#EF4444` | Destructive actions, errors |

Gradient (hero/splash): `#FF6B35 → #0D9488` (sunset → lagoon).

## Typography

- **System sans** on mobile (SF / Roboto); Inter on web if loaded
- Weights: 400 body, 500 emphasis, 600 headings, 700 prominent numbers (price)
- Line height: 1.4 body, 1.2 headings
- No italic for UI text; italics reserved for user quotes (« ... »)

## Logo (direction, pending execution)

- Lowercase wordmark: `coolive`
- Exploration paths:
  - Two **o**'s as overlapping circles (orange ∩ teal) — Venn of sharing
  - Wave crossing under the baseline, dipping through `l` or an `o`
  - Dot over `i` as a sunset gradient micro-mark
- Clearspace: 1× cap height on all sides
- Never stretch, rotate, or recolor outside the palette above
- On dark bg: use pure `#FFF8F0` wordmark

## Iconography

- Feather icons on mobile (already in use)
- Rounded corners everywhere: cards `16px`, buttons `12px`, pills `9999px`
- Heart for favorites (universal) — no tiare substitution for now

## Imagery

- Real photos of Polynesian colocations — warm light, human presence
- Avoid stock tropical clichés (monoï bottle, tiki, etc.)
- Portrait framing for candidate avatars; landscape 4:3 for listings
- Crops: let people be visible, not just the furniture

## Product vocabulary

| Concept | Term | Notes |
|---|---|---|
| Application flow | *Candidature* | Universally understood in PF |
| Submitted | *En attente* | Pending |
| Accepted/shortlisted | *Retenue* | Multiple possible per listing |
| Chosen | *Choisie* | One per listing; archives the listing |
| Declined | *Non retenue* | Soft phrasing |
| Withdrawn | *Retirée* | Candidate-initiated |
| Favorite | *Coup de cœur* | Warmer than "Favoris" |
| Provider | *L'annonceur* | Listing owner |
| Seeker | addressed as *toi* | No label for the user's own role |
| Couple application | *Postuler en couple* | Boolean flag |

## Social & presence

- Instagram: `@coolive.pf` (primary consumer channel)
- Facebook page: *Coolive* (Facebook is huge in PF; do not skip)
- TikTok: secondary, launch once content cadence is stable
- Contact email: `hello@tarima.dev` (Coolive is published by Tarima)
- Sender (transactional): `hello@coolive.app` for brand consistency in emails

## App Store / Play Store listing

- **Name**: Coolive — coloc en Polynésie
- **Subtitle / short description**: Ta coloc, sans prise de tête.
- **Keywords**: coloc, colocation, polynésie, tahiti, chambre, location, moorea, bora bora
- **Icon**: wordmark mark (final) on `#FFF8F0` bg

## Do / Don't

### Do
- Use `tu` in every user-facing string
- Lead with the verb ("Postuler", "Retenir", "Contacter")
- Keep error copy human: *"Téléphone requis avant de postuler"* beats *"Validation failed: phone"*
- Respect contact gating in UI (never show phone/WhatsApp before acceptance)

### Don't
- Say *Chat* — the product doesn't have one by design
- Say *utilisateur* in UI — say *toi* or their name
- Translate *candidature* to *application* in FR UI
- Add emojis in code/commits (user-facing UI emojis are fine in moderation, e.g. 🌴 in tagline)
- Introduce new brand colors without updating this file first

## Versioning

This file is the source of truth. Update it before changing the palette, vocabulary, or tagline in code. Don't branch brand decisions between platforms.
