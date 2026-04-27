import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

// ── Reference data ──────────────────────────────────────────────────────────
//
// Countries / regions / cities are *constants* that ship with the app.
// They are NOT fake fixture data — they describe real geography and are safe
// to seed in any environment, including production.
//
// The fake-user / listing / candidature fixtures live in `seed.ts`.

export type CitySeed = { code: string; label: string; lat: number; lng: number }

export const COUNTRIES: { code: string; label: string; sortOrder: number }[] = [
  { code: 'PF', label: 'Polynésie française', sortOrder: 0 },
]

export const PF_REGIONS: { code: string; label: string; sortOrder: number }[] = [
  { code: 'tahiti', label: 'Tahiti', sortOrder: 0 },
  { code: 'moorea', label: 'Moorea', sortOrder: 1 },
  { code: 'huahine', label: 'Huahine', sortOrder: 2 },
  { code: 'raiatea', label: 'Raiatea', sortOrder: 3 },
  { code: 'tahaa', label: 'Tahaa', sortOrder: 4 },
  { code: 'bora-bora', label: 'Bora Bora', sortOrder: 5 },
  { code: 'rangiroa', label: 'Rangiroa', sortOrder: 6 },
  { code: 'fakarava', label: 'Fakarava', sortOrder: 7 },
  { code: 'nuku-hiva', label: 'Nuku Hiva', sortOrder: 8 },
  { code: 'hiva-oa', label: 'Hiva Oa', sortOrder: 9 },
  { code: 'other', label: 'Autre', sortOrder: 99 },
]

// Curated cities per region with centroid coords (lat, lng).
// Coordinates are real city centers; not jittered (cities are public geography).
export const CITIES_BY_REGION: Record<string, CitySeed[]> = {
  tahiti: [
    { code: 'papeete', label: 'Papeete', lat: -17.5325, lng: -149.5665 },
    { code: 'punaauia', label: 'Punaauia', lat: -17.6242, lng: -149.6075 },
    { code: 'faaa', label: 'Faaa', lat: -17.5573, lng: -149.6110 },
    { code: 'pirae', label: 'Pirae', lat: -17.5246, lng: -149.5374 },
    { code: 'arue', label: 'Arue', lat: -17.5172, lng: -149.5113 },
    { code: 'mahina', label: 'Mahina', lat: -17.5040, lng: -149.4760 },
    { code: 'paea', label: 'Paea', lat: -17.6878, lng: -149.5811 },
    { code: 'papara', label: 'Papara', lat: -17.7510, lng: -149.5470 },
    { code: 'taravao', label: 'Taravao', lat: -17.7351, lng: -149.3146 },
  ],
  moorea: [
    { code: 'afareaitu', label: 'Afareaitu', lat: -17.5570, lng: -149.7989 },
    { code: 'haapiti', label: 'Haapiti', lat: -17.5540, lng: -149.8730 },
    { code: 'paopao', label: 'Paopao', lat: -17.5141, lng: -149.8262 },
    { code: 'teavaro', label: 'Teavaro', lat: -17.4896, lng: -149.7714 },
  ],
  'bora-bora': [
    { code: 'vaitape', label: 'Vaitape', lat: -16.5097, lng: -151.7472 },
    { code: 'anau', label: 'Anau', lat: -16.4910, lng: -151.7220 },
    { code: 'faanui', label: 'Faanui', lat: -16.4820, lng: -151.7610 },
  ],
  huahine: [
    { code: 'fare', label: 'Fare', lat: -16.7167, lng: -151.0333 },
    { code: 'maeva', label: 'Maeva', lat: -16.7239, lng: -151.0114 },
    { code: 'fitii', label: 'Fitii', lat: -16.7790, lng: -151.0220 },
  ],
  raiatea: [
    { code: 'uturoa', label: 'Uturoa', lat: -16.7311, lng: -151.4467 },
    { code: 'avera', label: 'Avera', lat: -16.7822, lng: -151.4367 },
    { code: 'opoa', label: 'Opoa', lat: -16.8350, lng: -151.3730 },
  ],
  rangiroa: [
    { code: 'avatoru', label: 'Avatoru', lat: -14.9497, lng: -147.7000 },
    { code: 'tiputa', label: 'Tiputa', lat: -14.9756, lng: -147.6217 },
  ],
  fakarava: [
    { code: 'rotoava', label: 'Rotoava', lat: -16.0578, lng: -145.6217 },
    { code: 'tetamanu', label: 'Tetamanu', lat: -16.4840, lng: -145.4470 },
  ],
  'nuku-hiva': [
    { code: 'taiohae', label: 'Taiohae', lat: -8.9112, lng: -140.0995 },
    { code: 'hatiheu', label: 'Hatiheu', lat: -8.8170, lng: -140.0930 },
  ],
}

// ── Idempotent upserts ─────────────────────────────────────────────────────

// `db` accepts the drizzle instance from the API (Pool-backed) or the seed
// CLI (single client). Both have the same query API, so the loose type is fine
// — Drizzle's PoolClient/Pool generics differ but the methods we use match.
type AnyDb = Parameters<typeof drizzle>[0] extends never ? never : ReturnType<typeof drizzle<typeof schema>>

export async function seedGeo(db: AnyDb | any) {
  for (const c of COUNTRIES) {
    await db.insert(schema.countries).values(c).onConflictDoNothing()
  }

  for (const r of PF_REGIONS) {
    const [existing] = await db
      .select({ id: schema.regions.id })
      .from(schema.regions)
      .where(and(eq(schema.regions.countryCode, 'PF'), eq(schema.regions.code, r.code)))
      .limit(1)
    if (!existing) {
      await db.insert(schema.regions).values({ countryCode: 'PF', ...r })
    }
  }

  let cityCount = 0
  for (const [regionCode, citySeeds] of Object.entries(CITIES_BY_REGION)) {
    for (let i = 0; i < citySeeds.length; i++) {
      const c = citySeeds[i]!
      const [existing] = await db
        .select({ id: schema.cities.id })
        .from(schema.cities)
        .where(and(
          eq(schema.cities.countryCode, 'PF'),
          eq(schema.cities.regionCode, regionCode),
          eq(schema.cities.code, c.code),
        ))
        .limit(1)
      if (!existing) {
        await db.insert(schema.cities).values({
          countryCode: 'PF',
          regionCode,
          code: c.code,
          label: c.label,
          latitude: c.lat.toFixed(6),
          longitude: c.lng.toFixed(6),
          sortOrder: i,
        })
      }
      cityCount++
    }
  }

  return { countries: COUNTRIES.length, regions: PF_REGIONS.length, cities: cityCount }
}

// CLI entry: `tsx src/db/seed-geo.ts` — runs only the geo seed.
async function main() {
  const db = drizzle(process.env.DATABASE_URL!, { schema })
  const { countries, regions, cities } = await seedGeo(db)
  console.log(`🌍 ${countries} countries, ${regions} regions, ${cities} cities`)
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('❌ seed-geo failed:', e)
    process.exit(1)
  })
}
