export const USER_ROLES = ['seeker', 'provider'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
