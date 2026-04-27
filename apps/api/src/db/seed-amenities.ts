import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

// ── Reference data ──────────────────────────────────────────────────────────
//
// Amenities catalog. Like geo, this is constant data shipping with the app —
// safe to seed in any environment, including production. Adding a new amenity
// = inserting a row here.
//
// Icon strings are Feather icon names (kebab-case). Web converts to Lucide
// PascalCase (e.g. 'rotate-cw' → 'RotateCw'); both libraries share most
// names. Unknown names fall back to a generic dot, won't crash.

export type AmenitySeed = { code: string; label: string; icon: string; sortOrder: number }

export const AMENITIES: AmenitySeed[] = [
  { code: 'wifi', label: 'Wifi', icon: 'wifi', sortOrder: 0 },
  { code: 'kitchen_equipped', label: 'Cuisine équipée', icon: 'coffee', sortOrder: 1 },
  { code: 'private_bathroom', label: 'Salle de bain privée', icon: 'droplet', sortOrder: 2 },
  { code: 'private_toilets', label: 'Toilettes privées', icon: 'square', sortOrder: 3 },
  { code: 'air_conditioning', label: 'Climatisation', icon: 'wind', sortOrder: 4 },
  { code: 'parking', label: 'Parking', icon: 'truck', sortOrder: 5 },
  { code: 'pool', label: 'Piscine', icon: 'sunset', sortOrder: 6 },
  { code: 'terrace', label: 'Terrasse', icon: 'home', sortOrder: 7 },
  { code: 'garden', label: 'Jardin', icon: 'sun', sortOrder: 8 },
  { code: 'beach_access', label: 'Accès plage', icon: 'umbrella', sortOrder: 9 },
  { code: 'workspace', label: 'Espace de travail', icon: 'briefcase', sortOrder: 10 },
  { code: 'tv', label: 'Télévision', icon: 'tv', sortOrder: 11 },
  { code: 'washing_machine', label: 'Lave-linge', icon: 'rotate-cw', sortOrder: 12 },
  { code: 'elevator', label: 'Ascenseur', icon: 'arrow-up', sortOrder: 13 },
  { code: 'pets_accepted', label: 'Animaux acceptés', icon: 'heart', sortOrder: 14 },
]

type AnyDb = ReturnType<typeof drizzle>

export async function seedAmenities(db: AnyDb | any) {
  for (const a of AMENITIES) {
    await db.insert(schema.amenities).values(a).onConflictDoNothing()
  }
  return { count: AMENITIES.length }
}

async function main() {
  const db = drizzle(process.env.DATABASE_URL!, { schema })
  const { count } = await seedAmenities(db)
  console.log(`✨ ${count} amenities`)
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('❌ seed-amenities failed:', e)
    process.exit(1)
  })
}
