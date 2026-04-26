import { oc } from '@orpc/contract'
import { z } from 'zod'
import { OCCUPATIONS, SMOKER_CHOICES, PET_CHOICES, SCHEDULE_CHOICES, LANGUAGE_CHOICES } from '../schemas/listing'

export const USER_MODES = ['seeker', 'provider'] as const

export const NOTIFICATION_EVENTS = [
  'candidature.submitted',
  'candidature.accepted',
  'candidature.finalized',
  'candidature.rejected',
  'candidature.withdrawn',
] as const

export const NOTIFICATION_GROUPS = ['seeker', 'provider'] as const

const prefValueSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
})

export const notificationPrefsSchema = z.record(z.enum(NOTIFICATION_EVENTS), prefValueSchema)

const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  avatar: z.string().nullable(),
  bio: z.string().nullable(),
  mode: z.enum(USER_MODES),
  dob: z.coerce.date().nullable(),
  phone: z.string().nullable(),
  occupation: z.enum(OCCUPATIONS).nullable(),
  occupationDetail: z.string().nullable(),
  languages: z.array(z.enum(LANGUAGE_CHOICES)).nullable(),
  smoker: z.enum(SMOKER_CHOICES).nullable(),
  pets: z.enum(PET_CHOICES).nullable(),
  schedule: z.enum(SCHEDULE_CHOICES).nullable(),
  whatsappOverride: z.string().nullable(),
  facebookUrl: z.string().nullable(),
})

export const userContract = {
  me: oc.output(profileSchema),
  update: oc
    .input(z.object({
      name: z.string().min(1).optional(),
      bio: z.string().nullable().optional(),
      dob: z.coerce.date().nullable().optional(),
      phone: z.string().nullable().optional(),
      occupation: z.enum(OCCUPATIONS).nullable().optional(),
      occupationDetail: z.string().nullable().optional(),
      languages: z.array(z.enum(LANGUAGE_CHOICES)).nullable().optional(),
      smoker: z.enum(SMOKER_CHOICES).nullable().optional(),
      pets: z.enum(PET_CHOICES).nullable().optional(),
      schedule: z.enum(SCHEDULE_CHOICES).nullable().optional(),
      whatsappOverride: z.string().nullable().optional(),
      facebookUrl: z.string().nullable().optional(),
    }))
    .output(profileSchema),
  updateAvatar: oc
    .input(z.object({ avatarUrl: z.string() }))
    .output(profileSchema),
  removeAvatar: oc
    .output(profileSchema),
  setMode: oc
    .input(z.object({ mode: z.enum(USER_MODES) }))
    .output(profileSchema),
  registerPushToken: oc
    .input(z.object({ token: z.string() }))
    .output(z.object({ success: z.boolean() })),
  getNotificationPrefs: oc.output(notificationPrefsSchema),
  updateNotificationPrefs: oc
    .input(z.object({
      group: z.enum(NOTIFICATION_GROUPS),
      channel: z.enum(['email', 'push']),
      enabled: z.boolean(),
    }))
    .output(notificationPrefsSchema),
  exportData: oc.output(z.object({
    user: z.unknown(),
    listings: z.array(z.unknown()),
    candidatures: z.array(z.unknown()),
    favorites: z.array(z.unknown()),
    images: z.array(z.unknown()),
    exportedAt: z.coerce.date(),
  })),
  deleteAccount: oc.output(z.object({ success: z.boolean() })),
}
