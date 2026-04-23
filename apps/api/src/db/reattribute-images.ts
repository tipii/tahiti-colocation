// Reuse existing R2 image objects by creating DB rows for current listings
// pointing to them. Skips upload + Sharp processing entirely.

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and } from 'drizzle-orm'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

import * as schema from './schema'
import { s3 } from '../lib/r2'

const db = drizzle(process.env.DATABASE_URL!, { schema })
const BUCKET = process.env.R2_BUCKET_NAME!

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function listAllImageKeys(): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'images/listing/',
      ContinuationToken: continuationToken,
    }))
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key)
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (continuationToken)
  return keys
}

type ImagePair = { imageId: string; mediumKey: string; thumbnailKey: string }

function groupPairs(keys: string[]): ImagePair[] {
  // keys look like: images/listing/{listingId}/{imageId}/medium.webp
  const byImage = new Map<string, { medium?: string; thumb?: string }>()
  for (const k of keys) {
    const parts = k.split('/')
    if (parts.length < 5) continue
    const imageId = parts[3]!
    const file = parts[4]!
    const entry = byImage.get(imageId) ?? {}
    if (file === 'medium.webp') entry.medium = k
    else if (file === 'thumb.webp') entry.thumb = k
    byImage.set(imageId, entry)
  }
  const pairs: ImagePair[] = []
  for (const [imageId, entry] of byImage) {
    if (entry.medium && entry.thumb) {
      pairs.push({ imageId, mediumKey: entry.medium, thumbnailKey: entry.thumb })
    }
  }
  return pairs
}

async function run() {
  console.log('🔎 Listing R2 objects...')
  const keys = await listAllImageKeys()
  const pairs = groupPairs(keys)
  console.log(`  Found ${pairs.length} usable image pairs in R2`)

  const listings = await db
    .select({ id: schema.listings.id, title: schema.listings.title, authorId: schema.listings.authorId })
    .from(schema.listings)

  let totalCreated = 0
  let poolIndex = 0

  for (const listing of listings) {
    const existing = await db
      .select({ id: schema.images.id })
      .from(schema.images)
      .where(and(eq(schema.images.entityType, 'listing'), eq(schema.images.entityId, listing.id)))
      .limit(1)
    if (existing.length > 0) {
      console.log(`  ⏭️  ${listing.title} (has images)`)
      continue
    }

    const count = rand(1, 5)
    process.stdout.write(`  🔗 ${listing.title} (${count})...`)

    for (let i = 0; i < count; i++) {
      if (poolIndex >= pairs.length) poolIndex = 0
      const pair = pairs[poolIndex++]!

      await db.insert(schema.images).values({
        entityType: 'listing',
        entityId: listing.id,
        originalKey: pair.mediumKey,
        mediumKey: pair.mediumKey,
        thumbnailKey: pair.thumbnailKey,
        mimeType: 'image/webp',
        sortOrder: i,
        status: 'ready',
        uploadedBy: listing.authorId,
      })
      totalCreated++
    }

    console.log(' ✓')
  }

  console.log(`\n✅ ${totalCreated} image rows created (no R2 upload)`)
  process.exit(0)
}

run().catch((e) => {
  console.error('❌ Reattribute failed:', e)
  process.exit(1)
})
