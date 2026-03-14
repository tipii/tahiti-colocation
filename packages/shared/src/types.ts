export type { User, CreateUser, Listing, CreateListing } from './schemas'
export type { UserRole } from './constants'

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
