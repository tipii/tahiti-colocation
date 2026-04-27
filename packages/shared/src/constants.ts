export const USER_ROLES = ['user', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const ISLANDS = [
  'Tahiti',
  'Moorea',
  'Huahine',
  'Raiatea',
  'Tahaa',
  'Bora Bora',
  'Rangiroa',
  'Fakarava',
  'Nuku Hiva',
  'Hiva Oa',
  'Other',
] as const
export type Island = (typeof ISLANDS)[number]

// Listing kinds. `colocation` is the default flagship use case.
// `sous_location` is short-term sublet of a room within a coloc.
// `location` (full apartment / professional listings) is reserved for post-launch.
export const LISTING_TYPES = ['colocation', 'sous_location'] as const
export type ListingType = (typeof LISTING_TYPES)[number]

export const ROOM_TYPES = ['single', 'couple', 'both'] as const
export type RoomType = (typeof ROOM_TYPES)[number]

export const LISTING_STATUSES = ['draft', 'published', 'archived'] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  colocation: 'Colocation',
  sous_location: 'Sous-location',
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: 'Personne seule',
  couple: 'Couple',
  both: 'Les deux',
}
