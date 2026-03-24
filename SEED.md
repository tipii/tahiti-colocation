# Seed Data

Run `pnpm --filter @coloc/api db:seed` to populate the database.

## Test Users

All users share the same password: `coloc2026`

### Providers (can create listings)

| Name | Email | Role |
|------|-------|------|
| Hinano Tetuanui | hinano@coloc.pf | provider |
| Maui Teriitahi | maui@coloc.pf | provider |
| Vaiana Pomare | vaiana@coloc.pf | provider |
| Teva Raapoto | teva@coloc.pf | provider |
| Moea Teheiura | moea@coloc.pf | provider |
| Heirani Taaora | heirani@coloc.pf | provider |

### Seekers (browse + message)

| Name | Email | Role |
|------|-------|------|
| Teiki Faatau | teiki@coloc.pf | seeker |
| Moeata Tuihani | moeata@coloc.pf | seeker |
| Raiarii Puhetini | raiarii@coloc.pf | seeker |
| Heipua Temarii | heipua@coloc.pf | seeker |

## What gets created

- 10 users (6 providers + 4 seekers)
- 30 published listings across Tahiti, Moorea, Bora Bora, etc.
- ~20 favorites
- ~8 conversations with sample messages
