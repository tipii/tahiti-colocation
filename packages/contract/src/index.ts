import { listingContract } from './procedures/listing'
import { imageContract } from './procedures/image'

export const contract = {
  listing: listingContract,
  image: imageContract,
}

// Re-export schemas and types for consumers
export * from './schemas/listing'
export * from './schemas/image'

// The contract type that clients use for full type safety
export type Contract = typeof contract
