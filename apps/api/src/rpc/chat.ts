import { eq, and, or, desc, gt, sql, isNull } from 'drizzle-orm'

import { db } from '../db'
import { conversations, messages, listings, user } from '../db/schema'
import { authed } from './base'

async function enrichConversation(conv: typeof conversations.$inferSelect, userId: string) {
  const [listing] = await db
    .select({ title: listings.title })
    .from(listings)
    .where(eq(listings.id, conv.listingId))
    .limit(1)

  const otherUserId = conv.seekerId === userId ? conv.providerId : conv.seekerId
  const [otherUser] = await db
    .select({ id: user.id, name: user.name, avatar: user.avatar })
    .from(user)
    .where(eq(user.id, otherUserId))
    .limit(1)

  const [lastMsg] = await db
    .select({ content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(desc(messages.createdAt))
    .limit(1)

  const [unreadResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conv.id),
        isNull(messages.readAt),
        sql`${messages.senderId} != ${userId}`,
      ),
    )

  return {
    ...conv,
    listingTitle: listing?.title,
    otherUser: otherUser ?? undefined,
    lastMessage: lastMsg?.content ?? null,
    unread: (unreadResult?.count ?? 0) > 0,
  }
}

export const getOrCreate = authed.chat.getOrCreate.handler(async ({ input, context }) => {
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1)

  if (!listing) throw new Error('Listing not found')
  if (listing.authorId === context.user.id) throw new Error('Cannot message yourself')

  // Check existing conversation
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.listingId, input.listingId), eq(conversations.seekerId, context.user.id)))
    .limit(1)

  if (existing) return enrichConversation(existing, context.user.id)

  // Create new
  const [created] = await db
    .insert(conversations)
    .values({
      listingId: input.listingId,
      seekerId: context.user.id,
      providerId: listing.authorId,
    })
    .returning()

  return enrichConversation(created!, context.user.id)
})

export const list = authed.chat.list.handler(async ({ context }) => {
  const results = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.seekerId, context.user.id), eq(conversations.providerId, context.user.id)))
    .orderBy(desc(conversations.lastMessageAt))

  return Promise.all(results.map((c) => enrichConversation(c, context.user.id)))
})

export const getMessages = authed.chat.messages.handler(async ({ input, context }) => {
  // Verify user is part of conversation
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, input.conversationId))
    .limit(1)

  if (!conv) throw new Error('Conversation not found')
  if (conv.seekerId !== context.user.id && conv.providerId !== context.user.id) {
    throw new Error('Forbidden')
  }

  // Mark messages as read
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, input.conversationId),
        isNull(messages.readAt),
        sql`${messages.senderId} != ${context.user.id}`,
      ),
    )

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, input.conversationId))
    .orderBy(messages.createdAt)
})

export const send = authed.chat.send.handler(async ({ input, context }) => {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, input.conversationId))
    .limit(1)

  if (!conv) throw new Error('Conversation not found')
  if (conv.seekerId !== context.user.id && conv.providerId !== context.user.id) {
    throw new Error('Forbidden')
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      senderId: context.user.id,
      content: input.content,
    })
    .returning()

  // Update lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, input.conversationId))

  return message!
})

export const unreadCount = authed.chat.unreadCount.handler(async ({ context }) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        or(eq(conversations.seekerId, context.user.id), eq(conversations.providerId, context.user.id)),
        isNull(messages.readAt),
        sql`${messages.senderId} != ${context.user.id}`,
      ),
    )

  return { count: result?.count ?? 0 }
})
