import { z } from 'zod'
import { OCCUPATIONS, SMOKER_CHOICES, PET_CHOICES, SCHEDULE_CHOICES, LANGUAGE_CHOICES } from './listing'

export const CANDIDATURE_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn', 'finalized'] as const

export const candidateProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  bio: z.string().nullable(),
  age: z.number().int().nullable(),
  occupation: z.enum(OCCUPATIONS).nullable(),
  occupationDetail: z.string().nullable(),
  languages: z.array(z.enum(LANGUAGE_CHOICES)).nullable(),
  smoker: z.enum(SMOKER_CHOICES).nullable(),
  pets: z.enum(PET_CHOICES).nullable(),
  schedule: z.enum(SCHEDULE_CHOICES).nullable(),
})

export const candidatureSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  userId: z.string(),
  message: z.string().nullable(),
  status: z.enum(CANDIDATURE_STATUSES),
  isCouple: z.boolean(),
  preferredMoveInDate: z.coerce.date().nullable(),
  rejectionMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  user: candidateProfileSchema.optional(),
  listingTitle: z.string().optional(),
  listingCity: z.string().optional(),
  listingCityLabel: z.string().optional(),
  listingRegion: z.string().optional(),
  listingRegionLabel: z.string().optional(),
  listingCountry: z.string().optional(),
  listingCountryLabel: z.string().optional(),
  listingImage: z.string().nullable().optional(),
})

export const contactPayloadSchema = z.object({
  name: z.string(),
  avatar: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  facebookUrl: z.string().nullable(),
})
