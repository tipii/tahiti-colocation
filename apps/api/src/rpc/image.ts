import { eq, and, asc } from 'drizzle-orm'

import { db } from '../db'
import { images } from '../db/schema'
import { getPublicUrl, deleteObject } from '../lib/r2'
import { pub, authed } from './base'

export const list = pub.image.list.handler(async ({ input }) => {
  const results = await db
    .select()
    .from(images)
    .where(and(eq(images.entityType, input.entityType), eq(images.entityId, input.entityId), eq(images.status, 'ready')))
    .orderBy(asc(images.sortOrder))

  return results.map((img) => ({
    id: img.id,
    originalUrl: img.originalKey ? getPublicUrl(img.originalKey) : null,
    mediumUrl: img.mediumKey ? getPublicUrl(img.mediumKey) : null,
    thumbnailUrl: img.thumbnailKey ? getPublicUrl(img.thumbnailKey) : null,
    sortOrder: img.sortOrder,
  }))
})

export const remove = authed.image.delete.handler(async ({ input, context }) => {
  const [image] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, input.id), eq(images.uploadedBy, context.user.id)))
    .limit(1)

  if (!image) throw new Error('Not found')

  const keysToDelete = [image.originalKey, image.mediumKey, image.thumbnailKey].filter(Boolean)
  await Promise.all(keysToDelete.map((key) => deleteObject(key!)))
  await db.delete(images).where(eq(images.id, input.id))

  return { success: true }
})

export const reorder = authed.image.reorder.handler(async ({ input, context }) => {
  await Promise.all(
    input.imageIds.map((id, index) =>
      db.update(images).set({ sortOrder: index }).where(and(eq(images.id, id), eq(images.uploadedBy, context.user.id))),
    ),
  )
  return { success: true }
})
