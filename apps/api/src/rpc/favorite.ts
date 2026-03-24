import { eq, and, asc, desc } from 'drizzle-orm'

import { db } from '../db'
import { favorites, listings, images, user } from '../db/schema'
import { getPublicUrl } from '../lib/r2'
import { authed } from './base'

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

export const list = authed.favorite.list.handler(async ({ context }) => {
  const favs = await db
    .select({ listingId: favorites.listingId })
    .from(favorites)
    .where(eq(favorites.userId, context.user.id))
    .orderBy(desc(favorites.createdAt))

  if (!favs.length) return []

  const results = await db
    .select()
    .from(listings)
    .where(eq(listings.status, 'published'))

  const favIds = new Set(favs.map((f) => f.listingId))
  const favListings = results.filter((l) => favIds.has(l.id))

  return await Promise.all(
    favListings.map(async (listing) => {
      const [listingImages, author] = await Promise.all([
        enrichWithImages(listing.id),
        enrichWithAuthor(listing.authorId),
      ])
      return { ...listing, images: listingImages, author }
    }),
  )
})

export const toggle = authed.favorite.toggle.handler(async ({ input, context }) => {
  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, context.user.id), eq(favorites.listingId, input.listingId)))
    .limit(1)

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id))
    return { favorited: false }
  }

  await db.insert(favorites).values({ userId: context.user.id, listingId: input.listingId })
  return { favorited: true }
})

export const check = authed.favorite.check.handler(async ({ input, context }) => {
  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, context.user.id), eq(favorites.listingId, input.listingId)))
    .limit(1)

  return { favorited: !!existing }
})
