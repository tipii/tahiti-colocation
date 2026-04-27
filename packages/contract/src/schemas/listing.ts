import { z } from 'zod'

// country / region values are sourced from the `countries` / `regions` DB tables
// (served via `geo.countries` and `geo.regions`). Validation at the handler layer
// rejects unknown codes. Schemas only enforce shape + length here.

// Listing kinds. `colocation` is the default flagship use case (shared room rental).
// `sous_location` is short-term sublet of a room within a coloc.
// `location` (full apartment / professional listings) is reserved for post-launch.
export const LISTING_TYPES = ['colocation', 'sous_location'] as const
export const ROOM_TYPES = ['single', 'couple', 'both'] as const
export const LISTING_STATUSES = ['draft', 'published', 'archived'] as const

export const OCCUPATIONS = ['student', 'employed', 'self_employed', 'retired', 'other'] as const
export const SMOKER_CHOICES = ['no', 'outside', 'yes'] as const
export const PET_CHOICES = ['none', 'cat', 'dog', 'other'] as const
export const SCHEDULE_CHOICES = ['day', 'night', 'flexible'] as const
export const LANGUAGE_CHOICES = ['fr', 'en', 'ty'] as const

const countryCode = z.string().length(2)
const regionCode = z.string().min(1).max(50)

export const imageSchema = z.object({
  id: z.string(),
  originalUrl: z.string().nullable(),
  mediumUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  sortOrder: z.number().int(),
})

export const authorSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
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
  // Display labels resolved from the geo tables. Optional so handlers that
  // don't enrich (e.g. raw inserts) still satisfy the schema.
  countryLabel: z.string().optional(),
  regionLabel: z.string().optional(),
  cityLabel: z.string().optional(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  roomType: z.enum(ROOM_TYPES),
  roommateCount: z.number().int().nonnegative(),
  // Slugs from the curated amenity catalog (see `meta.amenities` RPC).
  amenities: z.array(z.string()),
  authorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  images: z.array(imageSchema).optional(),
  author: authorSchema.nullable().optional(),
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
  amenities: z.array(z.string()).optional().default([]),
  status: z.enum(LISTING_STATUSES).optional().default('draft'),
})

export const updateListingSchema = createListingSchema.partial()

export const listingFiltersSchema = z.object({
  country: countryCode.optional(),
  region: regionCode.optional(),
  city: z.string().min(1).max(100).optional(),
  // Geo radius filter — when set, takes precedence over the city eq match
  // and returns listings within `radiusKm` of (centerLat, centerLng).
  centerLat: z.coerce.number().optional(),
  centerLng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().positive().max(500).optional(),
  listingType: z.enum(LISTING_TYPES).optional(),
  roomType: z.enum(ROOM_TYPES).optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  // AND-match: listings must have *all* of these amenity codes.
  amenities: z.array(z.string()).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
})

export const paginatedListingsSchema = z.object({
  data: z.array(listingSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
})
