import { eq, and, asc, desc, gte, lte, sql, or } from 'drizzle-orm'

import { db } from '../db'
import { cities, countries, images, listings, regions, user } from '../db/schema'
import { getPublicUrl, deleteObject } from '../lib/r2'
import { pub, authed } from './base'

async function assertGeo(country: string, region: string, city: string) {
  const [c] = await db.select({ code: countries.code }).from(countries).where(eq(countries.code, country)).limit(1)
  if (!c) throw new Error(`Unknown country: ${country}`)
  const [r] = await db
    .select({ code: regions.code })
    .from(regions)
    .where(and(eq(regions.countryCode, country), eq(regions.code, region)))
    .limit(1)
  if (!r) throw new Error(`Unknown region "${region}" for country ${country}`)
  const [ct] = await db
    .select({ code: cities.code })
    .from(cities)
    .where(and(eq(cities.countryCode, country), eq(cities.regionCode, region), eq(cities.code, city)))
    .limit(1)
  if (!ct) throw new Error(`Unknown city "${city}" for region "${region}"`)
}

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

async function resolveGeoLabels(country: string, region: string, city: string) {
  const [c] = await db.select({ label: countries.label }).from(countries).where(eq(countries.code, country)).limit(1)
  const [r] = await db
    .select({ label: regions.label })
    .from(regions)
    .where(and(eq(regions.countryCode, country), eq(regions.code, region)))
    .limit(1)
  const [ct] = await db
    .select({ label: cities.label })
    .from(cities)
    .where(and(eq(cities.countryCode, country), eq(cities.regionCode, region), eq(cities.code, city)))
    .limit(1)
  return {
    countryLabel: c?.label ?? country,
    regionLabel: r?.label ?? region,
    // Free-text legacy fallback: if the listing's `city` value isn't in the
    // cities table, we display the raw value as the label so old data still renders.
    cityLabel: ct?.label ?? city,
  }
}

async function enrichListing(listing: typeof listings.$inferSelect) {
  const [listingImages, author, geoLabels] = await Promise.all([
    enrichWithImages(listing.id),
    enrichWithAuthor(listing.authorId),
    resolveGeoLabels(listing.country, listing.region, listing.city),
  ])
  return { ...listing, images: listingImages, author, ...geoLabels }
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
  if (input.country) conditions.push(eq(listings.country, input.country))
  if (input.region) conditions.push(eq(listings.region, input.region))

  // Geo radius takes precedence over city eq match — picking a city + radius
  // means "within X km of city centroid", which usually spans neighbouring
  // communes. When only a city (no radius) is set, fall back to eq match.
  const hasRadius = input.radiusKm != null && input.centerLat != null && input.centerLng != null
  if (hasRadius) {
    // Haversine: 6371 km * acos(...). lat/lng columns are text, cast to float.
    // Filter out listings without coords to avoid NULL math poisoning the result.
    conditions.push(sql`${listings.latitude} IS NOT NULL AND ${listings.longitude} IS NOT NULL`)
    conditions.push(sql`6371 * acos(
      sin(radians(${input.centerLat})) * sin(radians(${listings.latitude}::float)) +
      cos(radians(${input.centerLat})) * cos(radians(${listings.latitude}::float)) *
      cos(radians(${listings.longitude}::float - ${input.centerLng}))
    ) < ${input.radiusKm}`)
  } else if (input.city) {
    conditions.push(eq(listings.city, input.city))
  }

  if (input.listingType) conditions.push(eq(listings.listingType, input.listingType))
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
  const [author] = await db.select().from(user).where(eq(user.id, context.user.id)).limit(1)
  if (!author?.emailVerified) throw new Error('Email non confirmé. Vérifie ta boîte mail avant de publier.')

  await assertGeo(input.country, input.region, input.city)

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

  if (data.country || data.region || data.city) {
    await assertGeo(
      data.country ?? existing.country,
      data.region ?? existing.region,
      data.city ?? existing.city,
    )
  }

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
  const [author] = await db.select().from(user).where(eq(user.id, context.user.id)).limit(1)
  if (!author?.emailVerified) throw new Error('Email non confirmé. Vérifie ta boîte mail avant de publier.')

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
