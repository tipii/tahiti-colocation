// Notification service — placeholders until Resend + Expo credentials are wired.
// Event dispatches are logged; hook real providers in sendEmail / sendPush.

import { logger } from './logger'

const log = logger.child({ module: 'notifications' })

type Event =
  | { type: 'candidature.submitted'; providerId: string; candidateName: string; listingTitle: string }
  | { type: 'candidature.accepted'; candidateId: string; listingTitle: string }
  | { type: 'candidature.finalized'; candidateId: string; listingTitle: string }
  | { type: 'candidature.rejected'; candidateId: string; listingTitle: string; rejectionMessage: string | null }
  | { type: 'candidature.withdrawn'; providerId: string; candidateName: string; listingTitle: string }

type EmailPayload = { to: string; subject: string; html: string }
type PushPayload = { token: string; title: string; body: string; data?: Record<string, unknown> }

async function sendEmail(payload: EmailPayload) {
  // TODO: wire Resend when RESEND_API_KEY is available
  if (!process.env.RESEND_API_KEY) {
    log.info({ to: payload.to, subject: payload.subject }, 'email:stub')
    return
  }
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from: 'noreply@theop.dev', ...payload })
}

async function sendPush(payload: PushPayload) {
  // TODO: wire Expo Push API when EXPO_PUSH_ACCESS_TOKEN is available
  if (!process.env.EXPO_PUSH_ACCESS_TOKEN) {
    log.info({ token: payload.token.slice(0, 12), title: payload.title }, 'push:stub')
    return
  }
  // await fetch('https://exp.host/--/api/v2/push/send', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`,
  //   },
  //   body: JSON.stringify({ to: payload.token, title: payload.title, body: payload.body, data: payload.data }),
  // })
}

import { db } from '../db'
import { user } from '../db/schema'
import { eq } from 'drizzle-orm'

async function recipientChannels(userId: string) {
  const [u] = await db
    .select({ email: user.email, pushToken: user.pushToken })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return { email: u?.email ?? null, pushToken: u?.pushToken ?? null }
}

export async function dispatch(event: Event) {
  switch (event.type) {
    case 'candidature.submitted': {
      const { email } = await recipientChannels(event.providerId)
      if (email) await sendEmail({ to: email, subject: 'Nouvelle candidature', html: `${event.candidateName} a postulé à « ${event.listingTitle} ».` })
      break
    }
    case 'candidature.accepted': {
      const { email, pushToken } = await recipientChannels(event.candidateId)
      if (email) await sendEmail({ to: email, subject: 'Candidature acceptée', html: `Vous êtes retenu·e pour « ${event.listingTitle} ». Contactez l'annonceur.` })
      if (pushToken) await sendPush({ token: pushToken, title: 'Candidature acceptée', body: event.listingTitle })
      break
    }
    case 'candidature.finalized': {
      const { email, pushToken } = await recipientChannels(event.candidateId)
      if (email) await sendEmail({ to: email, subject: 'Vous avez été choisi·e', html: `Félicitations, vous avez été choisi·e pour « ${event.listingTitle} ».` })
      if (pushToken) await sendPush({ token: pushToken, title: 'Vous avez été choisi·e 🌴', body: event.listingTitle })
      break
    }
    case 'candidature.rejected': {
      const { email, pushToken } = await recipientChannels(event.candidateId)
      const body = event.rejectionMessage ?? `Votre candidature pour « ${event.listingTitle} » n'a pas été retenue.`
      if (email) await sendEmail({ to: email, subject: 'Candidature non retenue', html: body })
      if (pushToken) await sendPush({ token: pushToken, title: 'Candidature non retenue', body: event.listingTitle })
      break
    }
    case 'candidature.withdrawn': {
      const { email } = await recipientChannels(event.providerId)
      if (email) await sendEmail({ to: email, subject: 'Candidature retirée', html: `${event.candidateName} a retiré sa candidature pour « ${event.listingTitle} ».` })
      break
    }
  }
}
