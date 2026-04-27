import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq } from 'drizzle-orm'
import * as schema from './schema'
import { auth } from '../lib/auth'

const db = drizzle(process.env.DATABASE_URL!, { schema })

// ── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function slug(title: string): string {
  return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function futureDate(daysMin: number, daysMax: number) {
  const d = new Date()
  d.setDate(d.getDate() + rand(daysMin, daysMax))
  return d
}

// ── Data ────────────────────────────────────────────────────────────────────

// Region slugs — must match `regions.code` rows seeded below.
const REGIONS = ['tahiti', 'moorea', 'bora-bora', 'huahine', 'raiatea', 'rangiroa', 'fakarava', 'nuku-hiva'] as const
// 80% colocations, 20% short-term sublets — matches expected real-world mix
const LISTING_TYPES = ['colocation', 'colocation', 'colocation', 'colocation', 'sous_location'] as const
const ROOM_TYPES = ['single', 'couple', 'both'] as const

// Cities per region (keyed by region slug). Add per-country maps when expanding.
const CITIES_BY_REGION: Record<string, string[]> = {
  tahiti: ['Papeete', 'Punaauia', 'Faaa', 'Pirae', 'Arue', 'Mahina', 'Paea', 'Papara', 'Taravao'],
  moorea: ['Afareaitu', 'Haapiti', 'Paopao', 'Teavaro'],
  'bora-bora': ['Vaitape', 'Anau', 'Faanui'],
  huahine: ['Fare', 'Maeva', 'Fitii'],
  raiatea: ['Uturoa', 'Avera', 'Opoa'],
  rangiroa: ['Avatoru', 'Tiputa'],
  fakarava: ['Rotoava', 'Tetamanu'],
  'nuku-hiva': ['Taiohae', 'Hatiheu'],
}

// Approximate centroids per city (lat, lng). Used to seed listing coords.
// Values come from public city-level lookups; precise to ~city-block level.
// Listings then get a ±300m jitter so the map pin never reveals the exact address.
const CITY_CENTROIDS: Record<string, [number, number]> = {
  // Tahiti
  Papeete: [-17.5325, -149.5665],
  Punaauia: [-17.6242, -149.6075],
  Faaa: [-17.5573, -149.6110],
  Pirae: [-17.5246, -149.5374],
  Arue: [-17.5172, -149.5113],
  Mahina: [-17.5040, -149.4760],
  Paea: [-17.6878, -149.5811],
  Papara: [-17.7510, -149.5470],
  Taravao: [-17.7351, -149.3146],
  // Moorea
  Afareaitu: [-17.5570, -149.7989],
  Haapiti: [-17.5540, -149.8730],
  Paopao: [-17.5141, -149.8262],
  Teavaro: [-17.4896, -149.7714],
  // Bora Bora
  Vaitape: [-16.5097, -151.7472],
  Anau: [-16.4910, -151.7220],
  Faanui: [-16.4820, -151.7610],
  // Huahine
  Fare: [-16.7167, -151.0333],
  Maeva: [-16.7239, -151.0114],
  Fitii: [-16.7790, -151.0220],
  // Raiatea
  Uturoa: [-16.7311, -151.4467],
  Avera: [-16.7822, -151.4367],
  Opoa: [-16.8350, -151.3730],
  // Rangiroa
  Avatoru: [-14.9497, -147.7000],
  Tiputa: [-14.9756, -147.6217],
  // Fakarava
  Rotoava: [-16.0578, -145.6217],
  Tetamanu: [-16.4840, -145.4470],
  // Nuku Hiva
  Taiohae: [-8.9112, -140.0995],
  Hatiheu: [-8.8170, -140.0930],
}

// Returns lat/lng strings (the column type is text) jittered by up to ~300m.
// 1 degree of latitude ≈ 111km, so 300m ≈ 0.0027 degrees.
function jitterCoords(city: string): { latitude: string | null; longitude: string | null } {
  const centroid = CITY_CENTROIDS[city]
  if (!centroid) return { latitude: null, longitude: null }
  const [lat, lng] = centroid
  const dLat = (Math.random() - 0.5) * 0.0054 // ~±300m
  // Longitude degrees shrink by cos(lat); at -17° ≈ 0.956
  const dLng = ((Math.random() - 0.5) * 0.0054) / Math.cos((lat * Math.PI) / 180)
  return {
    latitude: (lat + dLat).toFixed(6),
    longitude: (lng + dLng).toFixed(6),
  }
}

const USERS = [
  { name: 'Hinano Tetuanui', email: 'hinano@coloc.pf' },
  { name: 'Maui Teriitahi', email: 'maui@coloc.pf' },
  { name: 'Vaiana Pomare', email: 'vaiana@coloc.pf' },
  { name: 'Teva Raapoto', email: 'teva@coloc.pf' },
  { name: 'Moea Teheiura', email: 'moea@coloc.pf' },
  { name: 'Heirani Taaora', email: 'heirani@coloc.pf' },
  { name: 'Teiki Faatau', email: 'teiki@coloc.pf' },
  { name: 'Moeata Tuihani', email: 'moeata@coloc.pf' },
  { name: 'Raiarii Puhetini', email: 'raiarii@coloc.pf' },
  { name: 'Heipua Temarii', email: 'heipua@coloc.pf' },
]

const PASSWORD = 'coloc2026'

const TITLES = [
  'Chambre vue lagon a {city}',
  'Coloc chill a {city}',
  'Suite avec piscine a {city}',
  'Studio bord de mer a {city}',
  'Fare traditionnel a {city}',
  'Chambre dans villa a {city}',
  'Coloc jeunes actifs a {city}',
  'Bungalow partage a {city}',
  'Chambre calme a {city}',
  'Coloc ambiance tropicale a {city}',
  'Chambre avec jardin a {city}',
  'Suite privee a {city}',
  'Coloc proche plage a {city}',
  'Chambre meublee a {city}',
  'Maison partagee a {city}',
]

const DESCRIPTIONS = [
  'Magnifique chambre dans une colocation conviviale. La maison est situee a quelques minutes de la plage. Ambiance decontractee, colocataires sympas. Cuisine equipee et espace commun spacieux.',
  'Belle chambre lumineuse avec acces direct au jardin tropical. Quartier calme et residentiel. Ideal pour quelqu\'un qui cherche la tranquillite tout en etant proche des commodites.',
  'Chambre spacieuse dans une villa avec piscine partagee. Vue imprenable sur le lagon. Les colocataires sont respectueux et l\'ambiance est familiale. Parking disponible.',
  'Petit studio independant dans une propriete partagee. Vous aurez votre propre espace tout en profitant des espaces communs (jardin, terrasse, barbecue).',
  'Chambre dans un fare polynesien authentique. Experience unique de la vie locale. Le fare est entoure de cocotiers et a 5 minutes a pied du lagon.',
  'Grande chambre dans une colocation internationale. Parfait pour les digital nomads ou les jeunes professionnels. Wifi fibre, espace de travail partage.',
  'Chambre confortable dans une maison familiale. Ambiance chaleureuse et accueillante. Les repas sont parfois partages entre colocataires. Animaux bienvenus.',
  'Chambre avec salle de bain privee dans une residence securisee. Proche des transports et des commerces. Ideal pour une personne seule ou un couple.',
]

// ── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding database...')

  // ── Geo (countries + regions) ─────────────────────────────────────────────
  await db.insert(schema.countries).values([
    { code: 'PF', label: 'Polynésie française', sortOrder: 0 },
  ]).onConflictDoNothing()

  const PF_REGION_ROWS = [
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
  for (const r of PF_REGION_ROWS) {
    const [existing] = await db
      .select({ id: schema.regions.id })
      .from(schema.regions)
      .where(and(eq(schema.regions.countryCode, 'PF'), eq(schema.regions.code, r.code)))
      .limit(1)
    if (!existing) {
      await db.insert(schema.regions).values({ countryCode: 'PF', ...r })
    }
  }
  console.log(`  🌍 1 country, ${PF_REGION_ROWS.length} regions`)

  // Use Better Auth's own password hasher
  const { hashPassword } = await import('better-auth/crypto')
  const hashedPassword = await hashPassword(PASSWORD)

  const userIds: string[] = []

  for (const u of USERS) {
    const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, u.email)).limit(1)
    if (existing) {
      userIds.push(existing.id)
      console.log(`  👤 ${u.name} (exists)`)
      continue
    }

    const res = await auth.api.signUpEmail({
      body: { email: u.email, password: PASSWORD, name: u.name },
    })

    const birthYear = 1985 + rand(0, 20)
    const birthMonth = rand(1, 12).toString().padStart(2, '0')
    const birthDay = rand(1, 28).toString().padStart(2, '0')
    const phoneDigits = rand(10000000, 99999999)

    await db
      .update(schema.user)
      .set({
        emailVerified: true,
        role: 'user',
        bio: pick([
          'Passionné de voile et de plongée, je cherche une coloc chill proche du lagon.',
          'Arrivée récente en Polynésie, je télétravaille et j\'aime cuisiner.',
          'Local·e, je cherche un bon deal pour partager les frais.',
          'Étudiante sérieuse, non-fumeuse, sans animaux.',
          'Digital nomad, WiFi fibre indispensable.',
        ]),
        dob: `${birthYear}-${birthMonth}-${birthDay}`,
        phone: `+689${phoneDigits}`,
        occupation: pick(['student', 'employed', 'self_employed', 'retired', 'other'] as const),
        occupationDetail: pick(['Infirmier·e CHPF', 'Développeur·se', 'Enseignant·e', 'Commerçant·e', 'Restauration', null]),
        languages: pick([['fr'], ['fr', 'en'], ['fr', 'ty'], ['fr', 'en', 'ty']] as const) as any,
        smoker: pick(['no', 'outside', 'yes'] as const),
        pets: pick(['none', 'none', 'cat', 'dog', 'other'] as const),
        schedule: pick(['day', 'night', 'flexible'] as const),
      })
      .where(eq(schema.user.id, res.user.id))

    userIds.push(res.user.id)
    console.log(`  👤 ${u.name}`)
  }

  // Create listings (any user can create)
  const providerIds = userIds.slice(0, 6) // first 6 users create listings
  let listingCount = 0

  for (let i = 0; i < 30; i++) {
    const region = pick(REGIONS)
    const city = pick(CITIES_BY_REGION[region]!)
    const titleTemplate = pick(TITLES)
    const title = titleTemplate.replace('{city}', city)
    const listingSlug = `${slug(title)}-${rand(100, 999)}`
    const authorId = pick(providerIds)
    const listingType = pick(LISTING_TYPES)
    const price = pick([45000, 55000, 65000, 75000, 80000, 95000, 110000, 120000, 150000, 180000])
    const { latitude, longitude } = jitterCoords(city)

    await db.insert(schema.listings).values({
      title,
      slug: listingSlug,
      description: pick(DESCRIPTIONS),
      price,
      status: 'published',
      views: rand(5, 250),
      listingType,
      availableFrom: futureDate(1, 60),
      availableTo: listingType === 'sous_location' ? futureDate(61, 120) : null,
      country: 'PF',
      region,
      city,
      latitude,
      longitude,
      roomType: pick(ROOM_TYPES),
      roommateCount: pick([0, 1, 1, 2, 2, 3]),
      privateBathroom: Math.random() > 0.5,
      privateToilets: Math.random() > 0.5,
      pool: Math.random() > 0.7,
      parking: Math.random() > 0.4,
      airConditioning: Math.random() > 0.5,
      petsAccepted: Math.random() > 0.6,
      authorId,
    })

    listingCount++
  }

  console.log(`  🏠 ${listingCount} listings created`)

  // Create some favorites
  const seekerIds = userIds.slice(6) // last 4 users get favorites
  const allListings = await db.select({ id: schema.listings.id }).from(schema.listings)
  let favCount = 0

  for (const seekerId of seekerIds) {
    const numFavs = rand(3, 8)
    const shuffled = [...allListings].sort(() => Math.random() - 0.5).slice(0, numFavs)
    for (const listing of shuffled) {
      await db.insert(schema.favorites).values({
        userId: seekerId,
        listingId: listing.id,
      })
      favCount++
    }
  }

  console.log(`  ❤️  ${favCount} favorites created`)

  // Create some candidatures
  let candCount = 0
  const CAND_MESSAGES = [
    'Ia ora na ! Je cherche une coloc calme, la chambre est-elle toujours disponible ?',
    'Bonjour, infirmier au CHPF, horaires stables. La place m\'intéresse beaucoup.',
    'Salut ! Je suis digital nomad, WiFi indispensable. Dispo à partir du 1er.',
    'Bonjour, étudiante sérieuse, non-fumeuse, sans animaux.',
  ]
  const CAND_STATUSES = ['pending', 'pending', 'accepted', 'rejected'] as const

  for (const seekerId of seekerIds) {
    const numCands = rand(1, 3)
    const shuffled = [...allListings].sort(() => Math.random() - 0.5).slice(0, numCands)

    for (const listing of shuffled) {
      const [fullListing] = await db.select().from(schema.listings).where(eq(schema.listings.id, listing.id)).limit(1)
      if (!fullListing || fullListing.authorId === seekerId) continue

      await db.insert(schema.candidatures).values({
        listingId: listing.id,
        userId: seekerId,
        message: pick(CAND_MESSAGES),
        status: pick(CAND_STATUSES),
        isCouple: Math.random() > 0.85,
        preferredMoveInDate: futureDate(10, 90).toISOString().slice(0, 10),
      })
      candCount++
    }
  }

  console.log(`  📝 ${candCount} candidatures created`)
  console.log('✅ Seed complete!')
  process.exit(0)
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
