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

export const DURATION_TYPES = ['sous_location', 'location'] as const
export type DurationType = (typeof DURATION_TYPES)[number]

export const ROOM_TYPES = ['single', 'couple', 'both'] as const
export type RoomType = (typeof ROOM_TYPES)[number]

export const LISTING_STATUSES = ['draft', 'published', 'archived'] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const DURATION_LABELS: Record<DurationType, string> = {
  sous_location: 'Sous-location',
  location: 'Location',
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: 'Personne seule',
  couple: 'Couple',
  both: 'Les deux',
}
