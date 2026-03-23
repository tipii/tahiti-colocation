import { z } from 'zod'
import { imageSchema } from './listing'

export const imageListInputSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
})

export const imageDeleteInputSchema = z.object({
  id: z.string(),
})

export const imageReorderInputSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  imageIds: z.array(z.string()),
})

export const successSchema = z.object({
  success: z.boolean(),
})

export { imageSchema }
