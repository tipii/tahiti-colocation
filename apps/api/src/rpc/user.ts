import { eq } from 'drizzle-orm'

import { db } from '../db'
import { user } from '../db/schema'
import { authed } from './base'

function pickProfile(u: typeof user.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
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
