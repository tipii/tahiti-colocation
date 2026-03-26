import { eq, and, sql, desc, ne } from 'drizzle-orm'

import { db } from '../db'
import { candidatures, conversations, listings, messages, user } from '../db/schema'
import { authed } from './base'

async function enrichCandidature(c: typeof candidatures.$inferSelect, includeUser = true, includeListingTitle = false) {
  const result: any = { ...c }

  if (includeUser) {
    const [u] = await db
      .select({ id: user.id, name: user.name, avatar: user.avatar, bio: user.bio })
      .from(user)
      .where(eq(user.id, c.userId))
      .limit(1)
    result.user = u ?? undefined
  }

  if (includeListingTitle) {
    const [l] = await db
      .select({ title: listings.title, commune: listings.commune, island: listings.island })
      .from(listings)
      .where(eq(listings.id, c.listingId))
      .limit(1)
    result.listingTitle = l?.title
    result.listingCommune = l?.commune
    result.listingIsland = l?.island

    // Get listing thumbnail
    const { images } = await import('../db/schema')
    const { asc } = await import('drizzle-orm')
    const { getPublicUrl } = await import('../lib/r2')
    const [img] = await db
      .select({ mediumKey: images.mediumKey })
      .from(images)
      .where(and(eq(images.entityType, 'listing'), eq(images.entityId, c.listingId), eq(images.status, 'ready')))
      .orderBy(asc(images.sortOrder))
      .limit(1)
    result.listingImage = img?.mediumKey ? getPublicUrl(img.mediumKey) : null
  }

  // Find linked conversation
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.candidatureId, c.id))
    .limit(1)
  result.conversationId = conv?.id ?? null

  return result
}

// ── Seeker actions ──────────────────────────────────────────────────────────

export const apply = authed.candidature.apply.handler(async ({ input, context }) => {
  // Check listing exists and user is not the owner
  const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1)
  if (!listing) throw new Error('Listing not found')
  if (listing.authorId === context.user.id) throw new Error('Cannot apply to your own listing')
  if (listing.status !== 'published') throw new Error('Listing is not available')

  // Check no duplicate pending candidature
  const [existing] = await db
    .select()
    .from(candidatures)
    .where(and(eq(candidatures.listingId, input.listingId), eq(candidatures.userId, context.user.id), eq(candidatures.status, 'pending')))
    .limit(1)
  if (existing) throw new Error('Already applied')

  const [created] = await db
    .insert(candidatures)
    .values({
      listingId: input.listingId,
      userId: context.user.id,
      message: input.message ?? null,
      status: 'pending',
    })
    .returning()

  return enrichCandidature(created!)
})

export const withdraw = authed.candidature.withdraw.handler(async ({ input, context }) => {
  const [c] = await db.select().from(candidatures).where(eq(candidatures.id, input.id)).limit(1)
  if (!c) throw new Error('Not found')
  if (c.userId !== context.user.id) throw new Error('Forbidden')
  if (c.status !== 'pending') throw new Error('Can only withdraw pending candidatures')

  const [updated] = await db
    .update(candidatures)
    .set({ status: 'withdrawn' })
    .where(eq(candidatures.id, input.id))
    .returning()

  return enrichCandidature(updated!)
})

export const mine = authed.candidature.mine.handler(async ({ context }) => {
  const results = await db
    .select()
    .from(candidatures)
    .where(eq(candidatures.userId, context.user.id))
    .orderBy(desc(candidatures.createdAt))

  return Promise.all(results.map((c) => enrichCandidature(c, false, true)))
})

// ── Provider actions ────────────────────────────────────────────────────────

export const accept = authed.candidature.accept.handler(async ({ input, context }) => {
  const [c] = await db.select().from(candidatures).where(eq(candidatures.id, input.id)).limit(1)
  if (!c) throw new Error('Not found')

  const [listing] = await db.select().from(listings).where(eq(listings.id, c.listingId)).limit(1)
  if (!listing || listing.authorId !== context.user.id) throw new Error('Forbidden')
  if (c.status !== 'pending') throw new Error('Can only accept pending candidatures')

  // Accept candidature
  const [updated] = await db
    .update(candidatures)
    .set({ status: 'accepted' })
    .where(eq(candidatures.id, input.id))
    .returning()

  // Auto-create conversation
  await db.insert(conversations).values({
    listingId: c.listingId,
    seekerId: c.userId,
    providerId: context.user.id,
    candidatureId: c.id,
  })

  return enrichCandidature(updated!)
})

export const reject = authed.candidature.reject.handler(async ({ input, context }) => {
  const [c] = await db.select().from(candidatures).where(eq(candidatures.id, input.id)).limit(1)
  if (!c) throw new Error('Not found')

  const [listing] = await db.select().from(listings).where(eq(listings.id, c.listingId)).limit(1)
  if (!listing || listing.authorId !== context.user.id) throw new Error('Forbidden')
  if (c.status !== 'pending') throw new Error('Can only reject pending candidatures')

  const [updated] = await db
    .update(candidatures)
    .set({ status: 'rejected' })
    .where(eq(candidatures.id, input.id))
    .returning()

  return enrichCandidature(updated!)
})

export const finalize = authed.candidature.finalize.handler(async ({ input, context }) => {
  const [chosen] = await db.select().from(candidatures).where(eq(candidatures.id, input.candidatureId)).limit(1)
  if (!chosen) throw new Error('Not found')

  const [listing] = await db.select().from(listings).where(eq(listings.id, chosen.listingId)).limit(1)
  if (!listing || listing.authorId !== context.user.id) throw new Error('Forbidden')
  if (chosen.status !== 'accepted') throw new Error('Can only finalize an accepted candidature')

  // Set chosen as finalized
  const [updated] = await db
    .update(candidatures)
    .set({ status: 'finalized' })
    .where(eq(candidatures.id, input.candidatureId))
    .returning()

  // Reject all other non-withdrawn candidatures for this listing
  const others = await db
    .select()
    .from(candidatures)
    .where(and(
      eq(candidatures.listingId, chosen.listingId),
      ne(candidatures.id, input.candidatureId),
      ne(candidatures.status, 'withdrawn'),
      ne(candidatures.status, 'rejected'),
    ))

  for (const other of others) {
    await db.update(candidatures).set({ status: 'rejected' }).where(eq(candidatures.id, other.id))

    // Send rejection message to chat if conversation exists and rejectionMessage provided
    if (input.rejectionMessage) {
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.candidatureId, other.id))
        .limit(1)

      if (conv) {
        await db.insert(messages).values({
          conversationId: conv.id,
          senderId: context.user.id,
          content: input.rejectionMessage,
        })
        await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conv.id))
      }
    }
  }

  // Archive the listing
  await db.update(listings).set({ status: 'archived' }).where(eq(listings.id, chosen.listingId))

  return enrichCandidature(updated!)
})

export const forListing = authed.candidature.forListing.handler(async ({ input, context }) => {
  const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1)
  if (!listing || listing.authorId !== context.user.id) throw new Error('Forbidden')

  const results = await db
    .select()
    .from(candidatures)
    .where(eq(candidatures.listingId, input.listingId))
    .orderBy(desc(candidatures.createdAt))

  return Promise.all(results.map((c) => enrichCandidature(c, true, false)))
})

export const count = authed.candidature.count.handler(async ({ input, context }) => {
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(candidatures)
    .where(eq(candidatures.listingId, input.listingId))

  const [pendingResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(candidatures)
    .where(and(eq(candidatures.listingId, input.listingId), eq(candidatures.status, 'pending')))

  return { total: totalResult?.count ?? 0, pending: pendingResult?.count ?? 0 }
})
