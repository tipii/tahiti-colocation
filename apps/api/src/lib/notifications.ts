// Notification service — Brevo email + Expo Push.
// Event dispatches log to stdout when credentials are missing.

import { logger } from './logger'

const log = logger.child({ module: 'notifications' })

const BREVO_API_KEY = process.env.BREVO_API_KEY
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'hello@coolive.app'
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME ?? 'Coolive'

type Event =
  | { type: 'candidature.submitted'; providerId: string; candidateName: string; listingTitle: string }
  | { type: 'candidature.accepted'; candidateId: string; listingTitle: string }
  | { type: 'candidature.finalized'; candidateId: string; listingTitle: string }
  | { type: 'candidature.rejected'; candidateId: string; listingTitle: string; rejectionMessage: string | null }
  | { type: 'candidature.withdrawn'; providerId: string; candidateName: string; listingTitle: string }

type EmailPayload = { to: string; subject: string; html: string }
type PushPayload = { token: string; title: string; body: string; data?: Record<string, unknown> }

async function sendEmail(payload: EmailPayload) {
  if (!BREVO_API_KEY) {
    log.info({ to: payload.to, subject: payload.subject }, 'email:stub')
    return
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: EMAIL_FROM_ADDRESS, name: EMAIL_FROM_NAME },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.html,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      log.error({ status: res.status, body, to: payload.to, subject: payload.subject }, 'brevo send failed')
      return
    }
    log.info({ to: payload.to, subject: payload.subject }, 'email sent')
  } catch (err) {
    log.error({ err, to: payload.to }, 'brevo send threw')
  }
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

export async function sendEmailVerificationEmail(args: { to: string; name?: string; url: string }) {
  const greeting = args.name ? `Bonjour ${args.name},` : 'Bonjour,'
  await sendEmail({
    to: args.to,
    subject: 'Confirme ton email Coolive',
    html: `
      <p>${greeting}</p>
      <p>Bienvenue sur Coolive ! Confirme ton adresse email en cliquant sur le lien ci-dessous (valide 1 heure) :</p>
      <p><a href="${args.url}">Confirmer mon email</a></p>
      <p>Si tu n'es pas à l'origine de cette inscription, ignore cet email.</p>
      <p>— L'équipe Coolive 🌴</p>
    `,
  })
}

export async function sendPasswordResetEmail(args: { to: string; name?: string; url: string }) {
  const greeting = args.name ? `Bonjour ${args.name},` : 'Bonjour,'
  await sendEmail({
    to: args.to,
    subject: 'Réinitialisation de ton mot de passe Coolive',
    html: `
      <p>${greeting}</p>
      <p>Tu as demandé à réinitialiser ton mot de passe Coolive. Clique sur le lien ci-dessous (valide 1 heure) :</p>
      <p><a href="${args.url}">Réinitialiser mon mot de passe</a></p>
      <p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
      <p>— L'équipe Coolive 🌴</p>
    `,
  })
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
