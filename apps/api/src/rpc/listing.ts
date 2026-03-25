import { eq, and, asc, desc, gte, lte, sql, or, ilike } from 'drizzle-orm'

import { db } from '../db'
import { images, listings, user } from '../db/schema'
import { getPublicUrl, deleteObject } from '../lib/r2'
import { pub, authed } from './base'

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function uniqueSlug(title: string, excludeId?: string) {
  const base = generateSlug(title)
  let slug = base
  let counter = 1
  while (true) {
    const where = excludeId
      ? and(eq(listings.slug, slug), sql`${listings.id} != ${excludeId}`)
      : eq(listings.slug, slug)
    const [existing] = await db.select({ id: listings.id }).from(listings).where(where).limit(1)
    if (!existing) return slug
    slug = `${base}-${++counter}`
  }
}

async function enrichWithImages(listingId: string) {
  const imgs = await db
    .select()
    .from(images)
    .where(and(eq(images.entityType, 'listing'), eq(images.entityId, listingId), eq(images.status, 'ready')))
    .orderBy(asc(images.sortOrder))

  return imgs.map((img) => ({
    id: img.id,
    originalUrl: img.originalKey ? getPublicUrl(img.originalKey) : null,
    mediumUrl: img.mediumKey ? getPublicUrl(img.mediumKey) : null,
    thumbnailUrl: img.thumbnailKey ? getPublicUrl(img.thumbnailKey) : null,
    sortOrder: img.sortOrder,
  }))
}

async function enrichWithAuthor(authorId: string) {
  const [author] = await db
    .select({ id: user.id, name: user.name, avatar: user.avatar })
    .from(user)
    .where(eq(user.id, authorId))
    .limit(1)
  return author ?? null
}

async function enrichListing(listing: typeof listings.$inferSelect) {
  const [listingImages, author] = await Promise.all([
    enrichWithImages(listing.id),
    enrichWithAuthor(listing.authorId),
  ])
  return { ...listing, images: listingImages, author }
}

function isOwnerOrAdmin(userId: string, authorId: string, role?: string) {
  return userId === authorId || role === 'admin'
}

// ── Procedures ──────────────────────────────────────────────────────────────

export const list = pub.listing.list.handler(async ({ input }) => {
  const page = input.page ?? 1
  const limit = input.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = [eq(listings.status, 'published')]
  if (input.search) {
    const term = `%${input.search}%`
    conditions.push(or(ilike(listings.title, term), ilike(listings.commune, term), ilike(listings.description, term))!)
  }
  if (input.island) conditions.push(eq(listings.island, input.island))
  if (input.durationType) conditions.push(eq(listings.durationType, input.durationType))
  if (input.roomType) {
    // "both" matches any room type, so only filter for "single" or "couple"
    if (input.roomType === 'single') {
      conditions.push(or(eq(listings.roomType, 'single'), eq(listings.roomType, 'both'))!)
    } else if (input.roomType === 'couple') {
      conditions.push(or(eq(listings.roomType, 'couple'), eq(listings.roomType, 'both'))!)
    }
  }
  if (input.minPrice) conditions.push(gte(listings.price, input.minPrice))
  if (input.maxPrice) conditions.push(lte(listings.price, input.maxPrice))
  if (input.pool) conditions.push(eq(listings.pool, true))
  if (input.parking) conditions.push(eq(listings.parking, true))
  if (input.airConditioning) conditions.push(eq(listings.airConditioning, true))
  if (input.petsAccepted) conditions.push(eq(listings.petsAccepted, true))

  const where = and(...conditions)

  const [results, countResult] = await Promise.all([
    db.select().from(listings).where(where).orderBy(desc(listings.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(listings).where(where),
  ])

  const count = countResult[0]?.count ?? 0
  const enriched = await Promise.all(results.map(enrichListing))

  return {
    data: enriched,
    meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  }
})

export const get = pub.listing.get.handler(async ({ input, context }) => {
  const [listing] = await db
    .select()
    .from(listings)
    .where(or(eq(listings.id, input.idOrSlug), eq(listings.slug, input.idOrSlug)))
    .limit(1)

  if (!listing) throw new Error('Not found')

  if (listing.status !== 'published') {
    if (!context.user || !isOwnerOrAdmin(context.user.id, listing.authorId, context.user.role)) {
      throw new Error('Not found')
    }
  }

  db.update(listings).set({ views: sql`${listings.views} + 1` }).where(eq(listings.id, listing.id)).then().catch(() => {})

  return await enrichListing(listing)
})

export const mine = authed.listing.mine.handler(async ({ context }) => {
  const results = await db
    .select()
    .from(listings)
    .where(eq(listings.authorId, context.user.id))
    .orderBy(desc(listings.createdAt))

  return await Promise.all(results.map(enrichListing))
})

export const create = authed.listing.create.handler(async ({ input, context }) => {
  const slug = await uniqueSlug(input.title)
  const [created] = await db
    .insert(listings)
    .values({ ...input, slug, authorId: context.user.id })
    .returning()
  return created!
})

export const update = authed.listing.update.handler(async ({ input, context }) => {
  const { id, ...data } = input
  const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1)
  if (!existing) throw new Error('Not found')
  if (!isOwnerOrAdmin(context.user.id, existing.authorId, context.user.role)) throw new Error('Forbidden')

  const updates = { ...data } as Partial<typeof listings.$inferInsert>
  if (data.title && data.title !== existing.title) updates.slug = await uniqueSlug(data.title, id)

  const [updated] = await db.update(listings).set(updates).where(eq(listings.id, id)).returning()
  return await enrichListing(updated!)
})

export const remove = authed.listing.delete.handler(async ({ input, context }) => {
  const [existing] = await db.select().from(listings).where(eq(listings.id, input.id)).limit(1)
  if (!existing) throw new Error('Not found')
  if (!isOwnerOrAdmin(context.user.id, existing.authorId, context.user.role)) throw new Error('Forbidden')

  const listingImages = await db.select().from(images).where(and(eq(images.entityType, 'listing'), eq(images.entityId, input.id)))
  const keysToDelete = listingImages.flatMap((img) => [img.originalKey, img.mediumKey, img.thumbnailKey].filter(Boolean))
  await Promise.all(keysToDelete.map((key) => deleteObject(key!)))
  await db.delete(images).where(and(eq(images.entityType, 'listing'), eq(images.entityId, input.id)))
  await db.delete(listings).where(eq(listings.id, input.id))

  return { success: true }
})

export const publish = authed.listing.publish.handler(async ({ input, context }) => {
  const [existing] = await db.select().from(listings).where(eq(listings.id, input.id)).limit(1)
  if (!existing) throw new Error('Not found')
  if (existing.authorId !== context.user.id) throw new Error('Forbidden')
  const [updated] = await db.update(listings).set({ status: 'published' }).where(eq(listings.id, input.id)).returning()
  return updated!
})

export const archive = authed.listing.archive.handler(async ({ input, context }) => {
  const [existing] = await db.select().from(listings).where(eq(listings.id, input.id)).limit(1)
  if (!existing) throw new Error('Not found')
  if (!isOwnerOrAdmin(context.user.id, existing.authorId, context.user.role)) throw new Error('Forbidden')
  const [updated] = await db.update(listings).set({ status: 'archived' }).where(eq(listings.id, input.id)).returning()
  return updated!
})
