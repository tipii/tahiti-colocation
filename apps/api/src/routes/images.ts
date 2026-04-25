import { Hono } from 'hono'
import { eq, and, asc, ne } from 'drizzle-orm'

import { db } from '../db'
import { images, listings, user } from '../db/schema'
import { requireAuth } from '../lib/auth-middleware'
import { logger } from '../lib/logger'
import {
  generatePresignedUploadUrl,
  getObjectBuffer,
  putObject,
  deleteObject,
  getPublicUrl,
} from '../lib/r2'
import { processImage } from '../lib/image-processing'

const log = logger.child({ module: 'images' })

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/x-adobe-dng', 'image/dng']

type AuthUser = { id: string; name: string; email: string }

type Env = {
  Variables: {
    user: AuthUser
    session: unknown
  }
}

const imagesRouter = new Hono<Env>()

// All routes require auth
imagesRouter.use('*', requireAuth)

// POST /api/images/presign — get a presigned upload URL
imagesRouter.post('/presign', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    entityType: string
    entityId: string
    contentType: string
    fileName: string
  }>()

  const { entityType, entityId, contentType, fileName } = body

  if (!['listing', 'avatar'].includes(entityType)) {
    return c.json({ error: 'Invalid entityType' }, 400)
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    return c.json({ error: 'Invalid content type' }, 400)
  }

  // Verify ownership
  if (entityType === 'listing') {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, entityId))
      .limit(1)
    if (!listing || listing.authorId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  } else if (entityType === 'avatar' && entityId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const imageId = crypto.randomUUID()
  const key = `uploads/${entityType}/${entityId}/${imageId}/${fileName}`

  const [image] = await db
    .insert(images)
    .values({
      id: imageId,
      entityType,
      entityId,
      originalKey: key,
      mimeType: contentType,
      status: 'pending',
      uploadedBy: user.id,
    })
    .returning()

  const uploadUrl = await generatePresignedUploadUrl(key, contentType)

  return c.json({ uploadUrl, imageId: image!.id, key })
})

// POST /api/images/upload — direct upload (file goes through API to R2)
imagesRouter.post('/upload', async (c) => {
  const user = c.get('user')
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const entityType = formData.get('entityType') as string
  const entityId = formData.get('entityId') as string

  if (!file || !entityType || !entityId) {
    return c.json({ error: `Missing file, entityType, or entityId. Got: file=${!!file}, entityType=${entityType}, entityId=${entityId}` }, 400)
  }

  if (!['listing', 'avatar'].includes(entityType)) {
    return c.json({ error: 'Invalid entityType' }, 400)
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: `Invalid content type: ${file.type}` }, 400)
  }

  // Verify ownership
  if (entityType === 'listing') {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, entityId))
      .limit(1)
    if (!listing || listing.authorId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  } else if (entityType === 'avatar' && entityId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const imageId = crypto.randomUUID()
  const key = `uploads/${entityType}/${entityId}/${imageId}/${file.name}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload to R2
  await putObject(key, buffer, file.type)

  // Create DB record
  const [image] = await db
    .insert(images)
    .values({
      id: imageId,
      entityType,
      entityId,
      originalKey: key,
      mimeType: file.type,
      status: 'pending',
      uploadedBy: user.id,
    })
    .returning()

  // Process — only medium + thumbnail, skip original to save storage
  const variants = await processImage(buffer)
  const basePath = `images/${entityType}/${entityId}/${imageId}`
  const mediumKey = `${basePath}/medium.webp`
  const thumbnailKey = `${basePath}/thumb.webp`

  await Promise.all([
    putObject(mediumKey, variants.medium.buffer, 'image/webp'),
    putObject(thumbnailKey, variants.thumbnail.buffer, 'image/webp'),
  ])

  await deleteObject(key)

  const [updated] = await db
    .update(images)
    .set({
      originalKey: mediumKey,
      mediumKey,
      thumbnailKey,
      originalWidth: variants.medium.width,
      originalHeight: variants.medium.height,
      sizeBytes: variants.medium.size,
      status: 'ready',
    })
    .where(eq(images.id, imageId))
    .returning()

  // For avatars: delete any prior avatar images for this user
  if (entityType === 'avatar') {
    const prior = await db
      .select()
      .from(images)
      .where(and(eq(images.entityType, 'avatar'), eq(images.entityId, entityId), ne(images.id, imageId)))
    if (prior.length > 0) {
      const keys = prior.flatMap((img) => [img.originalKey, img.mediumKey, img.thumbnailKey].filter(Boolean) as string[])
      await Promise.all([...new Set(keys)].map((k) => deleteObject(k).catch((e) => log.warn({ err: e, key: k }, 'r2 delete failed'))))
      await db.delete(images).where(and(eq(images.entityType, 'avatar'), eq(images.entityId, entityId), ne(images.id, imageId)))
      log.info({ userId: entityId, removed: prior.length }, 'replaced previous avatar(s)')
    }
  }

  return c.json({
    ...updated,
    mediumUrl: getPublicUrl(mediumKey),
    thumbnailUrl: getPublicUrl(thumbnailKey),
  })
})

// POST /api/images/:imageId/confirm — process uploaded image
imagesRouter.post('/:imageId/confirm', async (c) => {
  const user = c.get('user')
  const imageId = c.req.param('imageId')

  const [image] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, imageId), eq(images.uploadedBy, user.id)))
    .limit(1)

  if (!image) {
    return c.json({ error: 'Image not found' }, 404)
  }

  if (image.status !== 'pending') {
    return c.json({ error: 'Image already processed' }, 400)
  }

  // Download original from R2
  const inputBuffer = await getObjectBuffer(image.originalKey)

  // Process — only medium + thumbnail
  const variants = await processImage(inputBuffer)

  const basePath = `images/${image.entityType}/${image.entityId}/${imageId}`
  const mediumKey = `${basePath}/medium.webp`
  const thumbnailKey = `${basePath}/thumb.webp`

  await Promise.all([
    putObject(mediumKey, variants.medium.buffer, 'image/webp'),
    putObject(thumbnailKey, variants.thumbnail.buffer, 'image/webp'),
  ])

  await deleteObject(image.originalKey)

  const [updated] = await db
    .update(images)
    .set({
      originalKey: mediumKey,
      mediumKey,
      thumbnailKey,
      originalWidth: variants.medium.width,
      originalHeight: variants.medium.height,
      sizeBytes: variants.medium.size,
      status: 'ready',
    })
    .where(eq(images.id, imageId))
    .returning()

  return c.json({
    ...updated,
    mediumUrl: getPublicUrl(mediumKey),
    thumbnailUrl: getPublicUrl(thumbnailKey),
  })
})

// DELETE /api/images/:imageId
imagesRouter.delete('/:imageId', async (c) => {
  const user = c.get('user')
  const imageId = c.req.param('imageId')

  const [image] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, imageId), eq(images.uploadedBy, user.id)))
    .limit(1)

  if (!image) {
    return c.json({ error: 'Image not found' }, 404)
  }

  // Delete R2 objects
  const keysToDelete = [image.originalKey, image.mediumKey, image.thumbnailKey].filter(Boolean)
  await Promise.all(keysToDelete.map((key) => deleteObject(key!)))

  await db.delete(images).where(eq(images.id, imageId))

  return c.json({ success: true })
})

// GET /api/images?entityType=listing&entityId=xxx
imagesRouter.get('/', async (c) => {
  const entityType = c.req.query('entityType')
  const entityId = c.req.query('entityId')

  if (!entityType || !entityId) {
    return c.json({ error: 'entityType and entityId required' }, 400)
  }

  const results = await db
    .select()
    .from(images)
    .where(
      and(
        eq(images.entityType, entityType),
        eq(images.entityId, entityId),
        eq(images.status, 'ready'),
      ),
    )
    .orderBy(asc(images.sortOrder))

  return c.json({
    data: results.map((img) => ({
      ...img,
      originalUrl: img.originalKey ? getPublicUrl(img.originalKey) : null,
      mediumUrl: img.mediumKey ? getPublicUrl(img.mediumKey) : null,
      thumbnailUrl: img.thumbnailKey ? getPublicUrl(img.thumbnailKey) : null,
    })),
  })
})

// PUT /api/images/reorder
imagesRouter.put('/reorder', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    entityType: string
    entityId: string
    imageIds: string[]
  }>()

  const { imageIds } = body

  await Promise.all(
    imageIds.map((id, index) =>
      db
        .update(images)
        .set({ sortOrder: index })
        .where(and(eq(images.id, id), eq(images.uploadedBy, user.id))),
    ),
  )

  return c.json({ success: true })
})

export default imagesRouter
