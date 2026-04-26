import { and, eq } from 'drizzle-orm'

import { db } from '../db'
import { notificationPrefs } from '../db/schema'

export const NOTIFICATION_EVENTS = [
  'candidature.submitted',
  'candidature.accepted',
  'candidature.finalized',
  'candidature.rejected',
  'candidature.withdrawn',
] as const
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]

export type NotificationGroup = 'seeker' | 'provider'

// Which events belong to which UI group
export const EVENT_GROUP: Record<NotificationEvent, NotificationGroup> = {
  'candidature.submitted': 'provider',
  'candidature.accepted': 'seeker',
  'candidature.finalized': 'seeker',
  'candidature.rejected': 'seeker',
  'candidature.withdrawn': 'provider',
}

// Defaults applied when no row exists for a (user, event)
export const DEFAULT_PREF = { email: false, push: true } as const

export type PrefValue = { email: boolean; push: boolean }
export type PrefsMap = Record<NotificationEvent, PrefValue>

export function eventsForGroup(group: NotificationGroup): NotificationEvent[] {
  return NOTIFICATION_EVENTS.filter((e) => EVENT_GROUP[e] === group)
}

export async function getPrefsMap(userId: string): Promise<PrefsMap> {
  const rows = await db
    .select()
    .from(notificationPrefs)
    .where(eq(notificationPrefs.userId, userId))

  const map = {} as PrefsMap
  for (const event of NOTIFICATION_EVENTS) {
    const row = rows.find((r) => r.eventType === event)
    map[event] = row
      ? { email: row.emailEnabled, push: row.pushEnabled }
      : { ...DEFAULT_PREF }
  }
  return map
}

export async function shouldNotify(userId: string, event: NotificationEvent, channel: 'email' | 'push'): Promise<boolean> {
  const [row] = await db
    .select()
    .from(notificationPrefs)
    .where(and(eq(notificationPrefs.userId, userId), eq(notificationPrefs.eventType, event)))
    .limit(1)
  if (!row) return DEFAULT_PREF[channel]
  return channel === 'email' ? row.emailEnabled : row.pushEnabled
}

// Update all events for a group/channel in one shot. Materializes rows for any
// missing events so subsequent reads hit the DB instead of falling back to defaults.
export async function setGroupChannel(
  userId: string,
  group: NotificationGroup,
  channel: 'email' | 'push',
  enabled: boolean,
): Promise<PrefsMap> {
  const events = eventsForGroup(group)
  for (const event of events) {
    const existing = await db
      .select()
      .from(notificationPrefs)
      .where(and(eq(notificationPrefs.userId, userId), eq(notificationPrefs.eventType, event)))
      .limit(1)

    if (existing[0]) {
      await db
        .update(notificationPrefs)
        .set({ [channel === 'email' ? 'emailEnabled' : 'pushEnabled']: enabled })
        .where(and(eq(notificationPrefs.userId, userId), eq(notificationPrefs.eventType, event)))
    } else {
      await db.insert(notificationPrefs).values({
        userId,
        eventType: event,
        emailEnabled: channel === 'email' ? enabled : DEFAULT_PREF.email,
        pushEnabled: channel === 'push' ? enabled : DEFAULT_PREF.push,
      })
    }
  }
  return getPrefsMap(userId)
}
