import { eq } from 'drizzle-orm'

import { db } from '../db'
import { candidatures, favorites, images, listings, user } from '../db/schema'
import { logger } from '../lib/logger'
import { getPrefsMap, setGroupChannel } from '../lib/notification-prefs'
import { deleteObject } from '../lib/r2'
import { authed } from './base'

const log = logger.child({ module: 'user' })

function pickProfile(u: typeof user.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image ?? null,
    avatar: u.avatar ?? null,
    bio: u.bio ?? null,
    mode: (u.mode ?? 'seeker') as 'seeker' | 'provider',
    dob: u.dob ? new Date(u.dob) : null,
    phone: u.phone ?? null,
    occupation: u.occupation ?? null,
    occupationDetail: u.occupationDetail ?? null,
    languages: u.languages ?? null,
    smoker: u.smoker ?? null,
    pets: u.pets ?? null,
    schedule: u.schedule ?? null,
    whatsappOverride: u.whatsappOverride ?? null,
    facebookUrl: u.facebookUrl ?? null,
  }
}

export const me = authed.user.me.handler(async ({ context }) => {
  const [found] = await db.select().from(user).where(eq(user.id, context.user.id)).limit(1)
  if (!found) throw new Error('User not found')
  return pickProfile(found)
})

export const update = authed.user.update.handler(async ({ input, context }) => {
  const updates: Partial<typeof user.$inferInsert> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.bio !== undefined) updates.bio = input.bio
  if (input.dob !== undefined) updates.dob = input.dob ? input.dob.toISOString().slice(0, 10) : null
  if (input.phone !== undefined) updates.phone = input.phone
  if (input.occupation !== undefined) updates.occupation = input.occupation
  if (input.occupationDetail !== undefined) updates.occupationDetail = input.occupationDetail
  if (input.languages !== undefined) updates.languages = input.languages
  if (input.smoker !== undefined) updates.smoker = input.smoker
  if (input.pets !== undefined) updates.pets = input.pets
  if (input.schedule !== undefined) updates.schedule = input.schedule
  if (input.whatsappOverride !== undefined) updates.whatsappOverride = input.whatsappOverride
  if (input.facebookUrl !== undefined) updates.facebookUrl = input.facebookUrl

  const [updated] = await db.update(user).set(updates).where(eq(user.id, context.user.id)).returning()
  return pickProfile(updated!)
})

export const updateAvatar = authed.user.updateAvatar.handler(async ({ input, context }) => {
  const [updated] = await db.update(user).set({ avatar: input.avatarUrl }).where(eq(user.id, context.user.id)).returning()
  return pickProfile(updated!)
})

export const removeAvatar = authed.user.removeAvatar.handler(async ({ context }) => {
  const [updated] = await db.update(user).set({ avatar: null }).where(eq(user.id, context.user.id)).returning()
  return pickProfile(updated!)
})

export const setMode = authed.user.setMode.handler(async ({ input, context }) => {
  const [updated] = await db.update(user).set({ mode: input.mode }).where(eq(user.id, context.user.id)).returning()
  return pickProfile(updated!)
})

export const registerPushToken = authed.user.registerPushToken.handler(async ({ input, context }) => {
  await db.update(user).set({ pushToken: input.token }).where(eq(user.id, context.user.id))
  return { success: true }
})

export const getNotificationPrefs = authed.user.getNotificationPrefs.handler(async ({ context }) => {
  return getPrefsMap(context.user.id)
})

export const updateNotificationPrefs = authed.user.updateNotificationPrefs.handler(async ({ input, context }) => {
  return setGroupChannel(context.user.id, input.group, input.channel, input.enabled)
})

export const exportData = authed.user.exportData.handler(async ({ context }) => {
  const userId = context.user.id
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  const [myListings, myCandidatures, myFavorites, myImages] = await Promise.all([
    db.select().from(listings).where(eq(listings.authorId, userId)),
    db.select().from(candidatures).where(eq(candidatures.userId, userId)),
    db.select().from(favorites).where(eq(favorites.userId, userId)),
    db.select().from(images).where(eq(images.uploadedBy, userId)),
  ])
  return {
    user: u ?? null,
    listings: myListings,
    candidatures: myCandidatures,
    favorites: myFavorites,
    images: myImages,
    exportedAt: new Date(),
  }
})

export const deleteAccount = authed.user.deleteAccount.handler(async ({ context }) => {
  const userId = context.user.id

  // 1. Find all R2 objects owned by this user (avatar + listing photos uploaded by them)
  const myImages = await db.select().from(images).where(eq(images.uploadedBy, userId))
  const keys = [...new Set(myImages.flatMap((img) => [img.originalKey, img.mediumKey, img.thumbnailKey].filter(Boolean) as string[]))]

  // 2. Delete R2 objects (best-effort; don't block deletion if some fail)
  await Promise.all(keys.map((k) => deleteObject(k).catch((e) => log.warn({ err: e, key: k }, 'r2 delete failed during account deletion'))))

  // 3. Delete the user row — DB CASCADE wipes sessions, accounts, listings, candidatures, favorites, images
  await db.delete(user).where(eq(user.id, userId))

  log.info({ userId, r2KeysDeleted: keys.length }, 'account deleted')
  return { success: true }
})
