import 'dotenv/config'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import { putObject } from '../lib/r2'
import { processImage } from '../lib/image-processing'

const db = drizzle(process.env.DATABASE_URL!, { schema })

const PHOTOS_DIR = join(import.meta.dirname, 'seed-photos')
const photoFiles = readdirSync(PHOTOS_DIR).filter((f) => f.endsWith('.jpg'))

let photoIndex = 0

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function nextPhoto(): Buffer {
  const file = photoFiles[photoIndex % photoFiles.length]!
  photoIndex++
  return readFileSync(join(PHOTOS_DIR, file))
}

async function uploadToR2(buffer: Buffer, listingId: string, imageIndex: number, authorId: string): Promise<string> {
  const variants = await processImage(buffer)
  const imageId = crypto.randomUUID()
  const basePath = `images/listing/${listingId}/${imageId}`
  const mediumKey = `${basePath}/medium.webp`
  const thumbnailKey = `${basePath}/thumb.webp`

  await Promise.all([
    putObject(mediumKey, variants.medium.buffer, 'image/webp'),
    putObject(thumbnailKey, variants.thumbnail.buffer, 'image/webp'),
  ])

  await db.insert(schema.images).values({
    id: imageId,
    entityType: 'listing',
    entityId: listingId,
    originalKey: mediumKey,
    mediumKey,
    thumbnailKey,
    mimeType: 'image/webp',
    originalWidth: variants.medium.width,
    originalHeight: variants.medium.height,
    sizeBytes: variants.medium.size,
    sortOrder: imageIndex,
    status: 'ready',
    uploadedBy: authorId,
  })

  return imageId
}

async function seed() {
  console.log(`🖼️  Seeding listing images (${photoFiles.length} local photos)...`)

  const listings = await db
    .select({ id: schema.listings.id, title: schema.listings.title, authorId: schema.listings.authorId })
    .from(schema.listings)

  let totalImages = 0

  for (const listing of listings) {
    const existing = await db.select({ id: schema.images.id }).from(schema.images).where(eq(schema.images.entityId, listing.id)).limit(1)
    if (existing.length > 0) {
      console.log(`  ⏭️  ${listing.title} (skip)`)
      continue
    }

    const numImages = rand(1, 5)
    process.stdout.write(`  📸 ${listing.title} (${numImages})...`)

    for (let i = 0; i < numImages; i++) {
      const buffer = nextPhoto()
      await uploadToR2(buffer, listing.id, i, listing.authorId)
      totalImages++
    }

    console.log(' ✓')
  }

  console.log(`\n✅ ${totalImages} images uploaded to R2`)
  process.exit(0)
}

seed().catch((e) => {
  console.error('❌ Image seed failed:', e)
  process.exit(1)
})
