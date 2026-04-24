# Seed Data

Run `pnpm --filter @coloc/api db:seed` to populate the database.

## Test Users

All users share the same password: `coloc2026`

| Name | Email |
|------|-------|
| Hinano Tetuanui | hinano@coloc.pf |
| Maui Teriitahi | maui@coloc.pf |
| Vaiana Pomare | vaiana@coloc.pf |
| Teva Raapoto | teva@coloc.pf |
| Moea Teheiura | moea@coloc.pf |
| Heirani Taaora | heirani@coloc.pf |
| Teiki Faatau | teiki@coloc.pf |
| Moeata Tuihani | moeata@coloc.pf |
| Raiarii Puhetini | raiarii@coloc.pf |
| Heipua Temarii | heipua@coloc.pf |

## What gets created

- 10 users with full profile fields (dob, phone, occupation, smoker, pets, schedule, languages, bio)
- 30 published listings across Tahiti, Moorea, Bora Bora, Raiatea, Rangiroa, Fakarava, Nuku Hiva, Huahine
- ~20 favorites across seeker users
- ~5–10 candidatures with mixed statuses (pending / accepted / rejected)

## Images

Use `pnpm --filter @coloc/api db:seed-images` to upload + Sharp-process local photos to R2 (slow).
Or `pnpm --filter @coloc/api db:reattribute-images` to reuse existing R2 objects across current listings without re-uploading (fast).
