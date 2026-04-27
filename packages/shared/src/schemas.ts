import { z } from 'zod'

import { LISTING_TYPES, LISTING_STATUSES, ROOM_TYPES } from './constants'

const countryCode = z.string().length(2)
const regionCode = z.string().min(1).max(50)

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string(),
  avatar: z.string().url().nullable(),
  bio: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export const createUserSchema = userSchema.pick({
  email: true,
  name: true,
})

export const imageSchema = z.object({
  id: z.string(),
  originalUrl: z.string().nullable(),
  mediumUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  sortOrder: z.number().int(),
})

export const listingSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  slug: z.string(),
  description: z.string(),
  price: z.number().int().positive(),
  status: z.enum(LISTING_STATUSES),
  views: z.number().int(),
  listingType: z.enum(LISTING_TYPES),
  availableFrom: z.coerce.date(),
  availableTo: z.coerce.date().nullable(),
  country: countryCode,
  region: regionCode,
  city: z.string(),
  countryLabel: z.string().optional(),
  regionLabel: z.string().optional(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  roomType: z.enum(ROOM_TYPES),
  roommateCount: z.number().int().nonnegative(),
  privateBathroom: z.boolean(),
  privateToilets: z.boolean(),
  pool: z.boolean(),
  parking: z.boolean(),
  airConditioning: z.boolean(),
  petsAccepted: z.boolean(),
  authorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  images: z.array(imageSchema).optional(),
  author: userSchema.pick({ id: true, name: true, avatar: true }).optional(),
})

export const createListingSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  price: z.number().int().positive(),
  listingType: z.enum(LISTING_TYPES),
  availableFrom: z.coerce.date(),
  availableTo: z.coerce.date().nullable().optional(),
  country: countryCode.optional().default('PF'),
  region: regionCode,
  city: z.string().min(1).max(100),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  roomType: z.enum(ROOM_TYPES),
  roommateCount: z.number().int().nonnegative(),
  privateBathroom: z.boolean().optional().default(false),
  privateToilets: z.boolean().optional().default(false),
  pool: z.boolean().optional().default(false),
  parking: z.boolean().optional().default(false),
  airConditioning: z.boolean().optional().default(false),
  petsAccepted: z.boolean().optional().default(false),
  status: z.enum(LISTING_STATUSES).optional().default('draft'),
})

export const updateListingSchema = createListingSchema.partial()

export const listingFiltersSchema = z.object({
  country: countryCode.optional(),
  region: regionCode.optional(),
  listingType: z.enum(LISTING_TYPES).optional(),
  roomType: z.enum(ROOM_TYPES).optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  status: z.enum(LISTING_STATUSES).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
})

export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>
export type Image = z.infer<typeof imageSchema>
export type Listing = z.infer<typeof listingSchema>
export type CreateListing = z.infer<typeof createListingSchema>
export type UpdateListing = z.infer<typeof updateListingSchema>
export type ListingFilters = z.infer<typeof listingFiltersSchema>
