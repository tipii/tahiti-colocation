import { listingContract } from './procedures/listing'
import { imageContract } from './procedures/image'
import { favoriteContract } from './procedures/favorite'
import { candidatureContract } from './procedures/candidature'
import { userContract } from './procedures/user'
import { geoContract } from './procedures/geo'
import { metaContract } from './procedures/meta'

export const contract = {
  listing: listingContract,
  image: imageContract,
  favorite: favoriteContract,
  candidature: candidatureContract,
  user: userContract,
  geo: geoContract,
  meta: metaContract,
}

// Re-export schemas and types for consumers
export * from './schemas/listing'
export * from './schemas/image'
export * from './schemas/candidature'
export * from './schemas/geo'
export * from './schemas/amenity'

// The contract type that clients use for full type safety
export type Contract = typeof contract
