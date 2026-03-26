import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import * as schema from './schema'

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

const ISLANDS = ['Tahiti', 'Moorea', 'Bora Bora', 'Huahine', 'Raiatea', 'Rangiroa', 'Fakarava', 'Nuku Hiva'] as const
const DURATIONS = ['sous_location', 'location'] as const
const ROOM_TYPES = ['single', 'couple', 'both'] as const

const COMMUNES: Record<string, string[]> = {
  Tahiti: ['Papeete', 'Punaauia', 'Faaa', 'Pirae', 'Arue', 'Mahina', 'Paea', 'Papara', 'Taravao'],
  Moorea: ['Afareaitu', 'Haapiti', 'Paopao', 'Teavaro'],
  'Bora Bora': ['Vaitape', 'Anau', 'Faanui'],
  Huahine: ['Fare', 'Maeva', 'Fitii'],
  Raiatea: ['Uturoa', 'Avera', 'Opoa'],
  Rangiroa: ['Avatoru', 'Tiputa'],
  Fakarava: ['Rotoava', 'Tetamanu'],
  'Nuku Hiva': ['Taiohae', 'Hatiheu'],
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
  'Chambre vue lagon a {commune}',
  'Coloc chill a {commune}',
  'Suite avec piscine a {commune}',
  'Studio bord de mer a {commune}',
  'Fare traditionnel a {commune}',
  'Chambre dans villa a {commune}',
  'Coloc jeunes actifs a {commune}',
  'Bungalow partage a {commune}',
  'Chambre calme a {commune}',
  'Coloc ambiance tropicale a {commune}',
  'Chambre avec jardin a {commune}',
  'Suite privee a {commune}',
  'Coloc proche plage a {commune}',
  'Chambre meublee a {commune}',
  'Maison partagee a {commune}',
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

  // Use Better Auth's own password hasher
  const { hashPassword } = await import('better-auth/crypto')
  const hashedPassword = await hashPassword(PASSWORD)

  const userIds: string[] = []

  for (const u of USERS) {
    const id = crypto.randomUUID()

    // Check if user exists
    const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, u.email)).limit(1)
    if (existing) {
      userIds.push(existing.id)
      console.log(`  👤 ${u.name} (exists)`)
      continue
    }

    await db.insert(schema.user).values({
      id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create account (credential)
    await db.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    userIds.push(id)
    console.log(`  👤 ${u.name}`)
  }

  // Create listings (any user can create)
  const providerIds = userIds.slice(0, 6) // first 6 users create listings
  let listingCount = 0

  for (let i = 0; i < 30; i++) {
    const island = pick(ISLANDS)
    const commune = pick(COMMUNES[island]!)
    const titleTemplate = pick(TITLES)
    const title = titleTemplate.replace('{commune}', commune)
    const listingSlug = `${slug(title)}-${rand(100, 999)}`
    const authorId = pick(providerIds)
    const duration = pick(DURATIONS)
    const price = pick([45000, 55000, 65000, 75000, 80000, 95000, 110000, 120000, 150000, 180000])

    await db.insert(schema.listings).values({
      title,
      slug: listingSlug,
      description: pick(DESCRIPTIONS),
      price,
      status: 'published',
      views: rand(5, 250),
      durationType: duration,
      availableFrom: futureDate(1, 60),
      availableTo: duration === 'sous_location' ? futureDate(61, 120) : null,
      island,
      commune,
      roomType: pick(ROOM_TYPES),
      numberOfPeople: pick([1, 1, 1, 2, 2, 3]),
      privateBathroom: Math.random() > 0.5,
      privateToilets: Math.random() > 0.5,
      pool: Math.random() > 0.7,
      parking: Math.random() > 0.4,
      airConditioning: Math.random() > 0.5,
      petsAccepted: Math.random() > 0.6,
      showPhone: Math.random() > 0.5,
      contactEmail: Math.random() > 0.5 ? `${pick(['contact', 'info', 'coloc'])}@${commune.toLowerCase()}.pf` : null,
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

  // Create some conversations + messages
  let convCount = 0
  let msgCount = 0

  for (const seekerId of seekerIds) {
    const numConvs = rand(1, 3)
    const shuffled = [...allListings].sort(() => Math.random() - 0.5).slice(0, numConvs)

    for (const listing of shuffled) {
      const [fullListing] = await db.select().from(schema.listings).where(eq(schema.listings.id, listing.id)).limit(1)
      if (!fullListing || fullListing.authorId === seekerId) continue

      const convId = crypto.randomUUID()
      await db.insert(schema.conversations).values({
        id: convId,
        listingId: listing.id,
        seekerId,
        providerId: fullListing.authorId,
        lastMessageAt: new Date(),
      })
      convCount++

      const messages = [
        { senderId: seekerId, content: 'Ia ora na ! La chambre est toujours disponible ?' },
        { senderId: fullListing.authorId, content: 'Ia ora na ! Oui bien sur, tu peux passer visiter quand tu veux.' },
        { senderId: seekerId, content: 'Super, je suis dispo ce weekend. Samedi matin ca te va ?' },
        { senderId: fullListing.authorId, content: 'Parfait, je t\'attends samedi a 10h. A bientot !' },
      ]

      const numMsgs = rand(2, messages.length)
      for (let j = 0; j < numMsgs; j++) {
        const delay = j * rand(300, 3600) * 1000
        await db.insert(schema.messages).values({
          conversationId: convId,
          senderId: messages[j]!.senderId,
          content: messages[j]!.content,
          createdAt: new Date(Date.now() - (numMsgs - j) * 3600000 + delay),
        })
        msgCount++
      }
    }
  }

  console.log(`  💬 ${convCount} conversations, ${msgCount} messages`)
  console.log('✅ Seed complete!')
  process.exit(0)
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
