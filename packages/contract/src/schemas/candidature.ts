import { z } from 'zod'

export const CANDIDATURE_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn', 'finalized'] as const

export const candidatureSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  userId: z.string(),
  message: z.string().nullable(),
  status: z.enum(CANDIDATURE_STATUSES),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().nullable(),
    bio: z.string().nullable(),
  }).optional(),
  listingTitle: z.string().optional(),
  conversationId: z.string().nullable().optional(),
})
