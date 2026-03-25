import { z } from 'zod'

export const conversationSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  seekerId: z.string(),
  providerId: z.string(),
  lastMessageAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  listingTitle: z.string().optional(),
  otherUser: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().nullable(),
  }).optional(),
  lastMessage: z.string().nullable().optional(),
  unread: z.boolean().optional(),
})

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
  readAt: z.coerce.date().nullable(),
})
