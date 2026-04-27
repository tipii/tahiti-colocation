import { eq, and, sql, desc, ne } from 'drizzle-orm'

import { db } from '../db'
import { candidatures, countries, listings, regions, user } from '../db/schema'
import { logger } from '../lib/logger'
import { dispatch } from '../lib/notifications'
import { authed } from './base'

const log = logger.child({ module: 'candidature' })

function computeAge(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

async function enrichCandidature(c: typeof candidatures.$inferSelect, includeUser = true, includeListingTitle = false) {
  const result: any = { ...c }

  if (includeUser) {
    const [u] = await db
      .select({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        dob: user.dob,
        occupation: user.occupation,
        occupationDetail: user.occupationDetail,
        languages: user.languages,
        smoker: user.smoker,
        pets: user.pets,
        schedule: user.schedule,
      })
      .from(user)
      .where(eq(user.id, c.userId))
      .limit(1)
    result.user = u
      ? {
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          bio: u.bio,
          age: computeAge(u.dob),
          occupation: u.occupation ?? null,
          occupationDetail: u.occupationDetail ?? null,
          languages: u.languages ?? null,
          smoker: u.smoker ?? null,
          pets: u.pets ?? null,
          schedule: u.schedule ?? null,
        }
      : undefined
  }

  if (includeListingTitle) {
    const [l] = await db
      .select({ title: listings.title, city: listings.city, region: listings.region, country: listings.country })
      .from(listings)
      .where(eq(listings.id, c.listingId))
      .limit(1)
    result.listingTitle = l?.title
    result.listingCity = l?.city
    result.listingRegion = l?.region
    result.listingCountry = l?.country

    if (l?.country && l?.region) {
      const [cn] = await db.select({ label: countries.label }).from(countries).where(eq(countries.code, l.country)).limit(1)
      const [rg] = await db
        .select({ label: regions.label })
        .from(regions)
        .where(and(eq(regions.countryCode, l.country), eq(regions.code, l.region)))
        .limit(1)
      result.listingCountryLabel = cn?.label ?? l.country
      result.listingRegionLabel = rg?.label ?? l.region
    }

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

  return result
}

// ── Seeker actions ──────────────────────────────────────────────────────────

export const apply = authed.candidature.apply.handler(async ({ input, context }) => {
  const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1)
  if (!listing) throw new Error('Listing not found')
  if (listing.authorId === context.user.id) throw new Error('Cannot apply to your own listing')
  if (listing.status !== 'published') throw new Error('Listing is not available')

  const [candidate] = await db.select().from(user).where(eq(user.id, context.user.id)).limit(1)
  if (!candidate?.emailVerified) throw new Error('Email non confirmé. Vérifie ta boîte mail avant de postuler.')
  if (!candidate?.phone) throw new Error('Phone number required before applying')

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
      isCouple: input.isCouple ?? false,
      preferredMoveInDate: input.preferredMoveInDate
        ? input.preferredMoveInDate.toISOString().slice(0, 10)
        : null,
    })
    .returning()

  dispatch({
    type: 'candidature.submitted',
    providerId: listing.authorId,
    candidateName: candidate.name,
    listingTitle: listing.title,
    listingId: listing.id,
  }).catch((e) => log.error({ err: e }, 'notification dispatch failed'))

  return enrichCandidature(created!)
})

export const withdraw = authed.candidature.withdraw.handler(async ({ input, context }) => {
  const [c] = await db.select().from(candidatures).where(eq(candidatures.id, input.id)).limit(1)
  if (!c) throw new Error('Not found')
  if (c.userId !== context.user.id) throw new Error('Forbidden')
  if (c.status !== 'pending' && c.status !== 'accepted') throw new Error('Cannot withdraw this candidature')

  const [updated] = await db
    .update(candidatures)
    .set({ status: 'withdrawn' })
    .where(eq(candidatures.id, input.id))
    .returning()

  const [listing] = await db.select().from(listings).where(eq(listings.id, c.listingId)).limit(1)
  if (listing) {
    dispatch({
      type: 'candidature.withdrawn',
      providerId: listing.authorId,
      candidateName: context.user.name,
      listingTitle: listing.title,
      listingId: listing.id,
    }).catch((e) => log.error({ err: e }, 'notification dispatch failed'))
  }

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

  const [updated] = await db
    .update(candidatures)
    .set({ status: 'accepted' })
    .where(eq(candidatures.id, input.id))
    .returning()

  dispatch({
    type: 'candidature.accepted',
    candidateId: c.userId,
    listingTitle: listing.title,
    candidatureId: c.id,
  }).catch((e) => log.error({ err: e }, 'notification dispatch failed'))

  return enrichCandidature(updated!)
})

export const reject = authed.candidature.reject.handler(async ({ input, context }) => {
  const [c] = await db.select().from(candidatures).where(eq(candidatures.id, input.id)).limit(1)
  if (!c) throw new Error('Not found')

  const [listing] = await db.select().from(listings).where(eq(listings.id, c.listingId)).limit(1)
  if (!listing || listing.authorId !== context.user.id) throw new Error('Forbidden')
  if (c.status !== 'pending' && c.status !== 'accepted') throw new Error('Cannot reject this candidature')

  const [updated] = await db
    .update(candidatures)
    .set({ status: 'rejected', rejectionMessage: input.rejectionMessage ?? null })
    .where(eq(candidatures.id, input.id))
    .returning()

  dispatch({
    type: 'candidature.rejected',
    candidateId: c.userId,
    listingTitle: listing.title,
    rejectionMessage: input.rejectionMessage ?? null,
    candidatureId: c.id,
  }).catch((e) => log.error({ err: e }, 'notification dispatch failed'))

  return enrichCandidature(updated!)
})

export const finalize = authed.candidature.finalize.handler(async ({ input, context }) => {
  const [chosen] = await db.select().from(candidatures).where(eq(candidatures.id, input.candidatureId)).limit(1)
  if (!chosen) throw new Error('Not found')

  const [listing] = await db.select().from(listings).where(eq(listings.id, chosen.listingId)).limit(1)
  if (!listing || listing.authorId !== context.user.id) throw new Error('Forbidden')
  if (chosen.status !== 'accepted') throw new Error('Can only finalize an accepted candidature')

  const [updated] = await db
    .update(candidatures)
    .set({ status: 'finalized' })
    .where(eq(candidatures.id, input.candidatureId))
    .returning()

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
    await db
      .update(candidatures)
      .set({ status: 'rejected', rejectionMessage: input.rejectionMessage ?? null })
      .where(eq(candidatures.id, other.id))

    dispatch({
      type: 'candidature.rejected',
      candidateId: other.userId,
      listingTitle: listing.title,
      rejectionMessage: input.rejectionMessage ?? null,
      candidatureId: other.id,
    }).catch((e) => log.error({ err: e }, 'notification dispatch failed'))
  }

  await db.update(listings).set({ status: 'archived' }).where(eq(listings.id, chosen.listingId))

  dispatch({
    type: 'candidature.finalized',
    candidateId: chosen.userId,
    listingTitle: listing.title,
    candidatureId: chosen.id,
  }).catch((e) => log.error({ err: e }, 'notification dispatch failed'))

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

// ── Contact reveal (status-gated) ───────────────────────────────────────────

export const contact = authed.candidature.contact.handler(async ({ input, context }) => {
  const [c] = await db.select().from(candidatures).where(eq(candidatures.id, input.id)).limit(1)
  if (!c) throw new Error('Not found')
  if (c.status !== 'accepted' && c.status !== 'finalized') throw new Error('Contact not available')

  const [listing] = await db.select().from(listings).where(eq(listings.id, c.listingId)).limit(1)
  if (!listing) throw new Error('Not found')

  const isCandidate = c.userId === context.user.id
  const isProvider = listing.authorId === context.user.id
  if (!isCandidate && !isProvider) throw new Error('Forbidden')

  const otherUserId = isCandidate ? listing.authorId : c.userId
  const [other] = await db
    .select({
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      whatsappOverride: user.whatsappOverride,
      facebookUrl: user.facebookUrl,
    })
    .from(user)
    .where(eq(user.id, otherUserId))
    .limit(1)

  if (!other) throw new Error('Contact not found')

  const whatsapp = other.whatsappOverride ?? other.phone

  return {
    name: other.name,
    avatar: other.avatar ?? null,
    email: other.email ?? null,
    phone: other.phone ?? null,
    whatsapp: whatsapp ?? null,
    facebookUrl: other.facebookUrl ?? null,
  }
})
