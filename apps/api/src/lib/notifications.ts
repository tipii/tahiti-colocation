// Notification service — Brevo email + Expo Push.
// Event dispatches log to stdout when credentials are missing.

import { eq } from 'drizzle-orm'

import { db } from '../db'
import { user } from '../db/schema'
import { logger } from './logger'
import { shouldNotify, type NotificationEvent } from './notification-prefs'

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

// Expo Push — relays to APNs/FCM. Free, no API key required for the basic path.
// Optional EXPO_PUSH_ACCESS_TOKEN raises rate limits.
async function sendPush(payload: PushPayload) {
  // Heuristic: Expo Push tokens look like ExponentPushToken[xxxxxxxx]
  if (!payload.token.startsWith('ExponentPushToken[')) {
    log.warn({ tokenPreview: payload.token.slice(0, 16) }, 'push: token not in Expo format, skipping')
    return
  }
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
    }
    if (process.env.EXPO_PUSH_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`
    }
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: payload.token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      log.error({ status: res.status, body, token: payload.token.slice(0, 16) }, 'expo push failed')
      return
    }
    const json = (await res.json()) as { data?: { status?: string; message?: string } }
    if (json.data?.status === 'error') {
      log.error({ message: json.data.message, token: payload.token.slice(0, 16) }, 'expo push rejected')
      return
    }
    log.info({ title: payload.title, token: payload.token.slice(0, 16) }, 'push sent')
  } catch (err) {
    log.error({ err, token: payload.token.slice(0, 16) }, 'expo push threw')
  }
}

async function recipientChannels(userId: string) {
  const [u] = await db
    .select({ email: user.email, pushToken: user.pushToken })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return { email: u?.email ?? null, pushToken: u?.pushToken ?? null }
}

// Send to a user, gated by their notification prefs for that event.
async function notify(args: {
  userId: string
  event: NotificationEvent
  email?: { subject: string; html: string }
  push?: { title: string; body: string; data?: Record<string, unknown> }
}) {
  const { email, pushToken } = await recipientChannels(args.userId)

  if (args.email && email && (await shouldNotify(args.userId, args.event, 'email'))) {
    await sendEmail({ to: email, ...args.email })
  }
  if (args.push && pushToken && (await shouldNotify(args.userId, args.event, 'push'))) {
    await sendPush({ token: pushToken, ...args.push })
  }
}

// Transactional emails — never gated by user prefs (security/account critical).
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
    case 'candidature.submitted':
      await notify({
        userId: event.providerId,
        event: 'candidature.submitted',
        email: { subject: 'Nouvelle candidature', html: `${event.candidateName} a postulé à « ${event.listingTitle} ».` },
        push: { title: 'Nouvelle candidature', body: `${event.candidateName} — ${event.listingTitle}` },
      })
      break
    case 'candidature.accepted':
      await notify({
        userId: event.candidateId,
        event: 'candidature.accepted',
        email: { subject: 'Candidature acceptée', html: `Tu es retenu·e pour « ${event.listingTitle} ». Contacte l'annonceur depuis l'app.` },
        push: { title: 'Candidature acceptée', body: event.listingTitle },
      })
      break
    case 'candidature.finalized':
      await notify({
        userId: event.candidateId,
        event: 'candidature.finalized',
        email: { subject: 'Tu as été choisi·e', html: `Félicitations, tu as été choisi·e pour « ${event.listingTitle} » 🌴` },
        push: { title: 'Tu as été choisi·e 🌴', body: event.listingTitle },
      })
      break
    case 'candidature.rejected': {
      const body = event.rejectionMessage ?? `Ta candidature pour « ${event.listingTitle} » n'a pas été retenue.`
      await notify({
        userId: event.candidateId,
        event: 'candidature.rejected',
        email: { subject: 'Candidature non retenue', html: body },
        push: { title: 'Candidature non retenue', body: event.listingTitle },
      })
      break
    }
    case 'candidature.withdrawn':
      await notify({
        userId: event.providerId,
        event: 'candidature.withdrawn',
        email: { subject: 'Candidature retirée', html: `${event.candidateName} a retiré sa candidature pour « ${event.listingTitle} ».` },
        push: { title: 'Candidature retirée', body: `${event.candidateName} — ${event.listingTitle}` },
      })
      break
  }
}
