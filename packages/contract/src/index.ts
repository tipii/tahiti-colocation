import { listingContract } from './procedures/listing'
import { imageContract } from './procedures/image'
import { favoriteContract } from './procedures/favorite'
import { chatContract } from './procedures/chat'
import { candidatureContract } from './procedures/candidature'
import { userContract } from './procedures/user'

export const contract = {
  listing: listingContract,
  image: imageContract,
  favorite: favoriteContract,
  chat: chatContract,
  candidature: candidatureContract,
  user: userContract,
}

// Re-export schemas and types for consumers
export * from './schemas/listing'
export * from './schemas/image'
export * from './schemas/chat'
export * from './schemas/candidature'

// The contract type that clients use for full type safety
export type Contract = typeof contract
