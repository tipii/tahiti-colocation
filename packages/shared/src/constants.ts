export const USER_ROLES = ['user', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

// Default country UI assumes when nothing is selected. Hardcoded until 2+ markets.
// Real country / region values live in the `countries` / `regions` DB tables and
// are served via the `geo` RPC namespace.
export const DEFAULT_COUNTRY = 'PF'

export const ROOM_TYPES = ['single', 'couple', 'both'] as const
export type RoomType = (typeof ROOM_TYPES)[number]

// Housing types — start narrow (Maison / Appartement). Add Studio / Villa /
// Fare / Bungalow when needed.
export const HOUSING_TYPES = ['maison', 'appartement'] as const
export type HousingType = (typeof HOUSING_TYPES)[number]

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  maison: 'Maison',
  appartement: 'Appartement',
}

export const LISTING_STATUSES = ['draft', 'published', 'archived'] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

// Listing kinds. `colocation` is the default flagship use case.
// `sous_location` is short-term sublet of a room within a coloc.
// `location` (full apartment / professional listings) is reserved for post-launch.
export const LISTING_TYPES = ['colocation', 'sous_location'] as const
export type ListingType = (typeof LISTING_TYPES)[number]

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  colocation: 'Colocation',
  sous_location: 'Sous-location',
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: 'Solo',
  couple: 'Couple',
  both: 'Solo / Couple',
}
