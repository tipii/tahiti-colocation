import { z } from 'zod'

import { USER_ROLES } from './constants'

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(USER_ROLES),
  avatar: z.string().url().nullable(),
  bio: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export const createUserSchema = userSchema.pick({
  email: true,
  name: true,
  role: true,
})

export const listingSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string(),
  price: z.number().int().positive(),
  location: z.string(),
  photos: z.array(z.string().url()),
  providerId: z.string().uuid(),
  createdAt: z.coerce.date(),
})

export const createListingSchema = listingSchema.pick({
  title: true,
  description: true,
  price: true,
  location: true,
  photos: true,
})

export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>
export type Listing = z.infer<typeof listingSchema>
export type CreateListing = z.infer<typeof createListingSchema>
