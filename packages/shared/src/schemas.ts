import { z } from 'zod'

import { DURATION_TYPES, ISLANDS, LISTING_STATUSES, ROOM_TYPES, USER_ROLES } from './constants'

export const userSchema = z.object({
  id: z.string(),
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
  durationType: z.enum(DURATION_TYPES),
  availableFrom: z.coerce.date(),
  availableTo: z.coerce.date().nullable(),
  island: z.enum(ISLANDS),
  commune: z.string(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  roomType: z.enum(ROOM_TYPES),
  numberOfPeople: z.number().int().positive(),
  privateBathroom: z.boolean(),
  privateToilets: z.boolean(),
  pool: z.boolean(),
  parking: z.boolean(),
  airConditioning: z.boolean(),
  petsAccepted: z.boolean(),
  showPhone: z.boolean(),
  contactEmail: z.string().email().nullable(),
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
  durationType: z.enum(DURATION_TYPES),
  availableFrom: z.coerce.date(),
  availableTo: z.coerce.date().nullable().optional(),
  island: z.enum(ISLANDS),
  commune: z.string().min(1).max(100),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  roomType: z.enum(ROOM_TYPES),
  numberOfPeople: z.number().int().positive(),
  privateBathroom: z.boolean().optional().default(false),
  privateToilets: z.boolean().optional().default(false),
  pool: z.boolean().optional().default(false),
  parking: z.boolean().optional().default(false),
  airConditioning: z.boolean().optional().default(false),
  petsAccepted: z.boolean().optional().default(false),
  showPhone: z.boolean().optional().default(false),
  contactEmail: z.string().email().nullable().optional(),
  status: z.enum(LISTING_STATUSES).optional().default('draft'),
})

export const updateListingSchema = createListingSchema.partial()

export const listingFiltersSchema = z.object({
  island: z.enum(ISLANDS).optional(),
  durationType: z.enum(DURATION_TYPES).optional(),
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
