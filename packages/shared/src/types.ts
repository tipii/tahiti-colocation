export type {
  User,
  CreateUser,
  Image,
  Listing,
  CreateListing,
  UpdateListing,
  ListingFilters,
} from './schemas'
export type { Island, DurationType, RoomType, ListingStatus } from './constants'

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code: string
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
  error: null
}
