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
