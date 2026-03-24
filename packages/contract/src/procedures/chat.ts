import { oc } from '@orpc/contract'
import { z } from 'zod'
import { conversationSchema, messageSchema } from '../schemas/chat'

export const chatContract = {
  getOrCreate: oc
    .input(z.object({ listingId: z.string() }))
    .output(conversationSchema),
  list: oc
    .output(z.array(conversationSchema)),
  messages: oc
    .input(z.object({ conversationId: z.string() }))
    .output(z.array(messageSchema)),
  send: oc
    .input(z.object({ conversationId: z.string(), content: z.string().min(1) }))
    .output(messageSchema),
  unreadCount: oc
    .output(z.object({ count: z.number().int() })),
}
