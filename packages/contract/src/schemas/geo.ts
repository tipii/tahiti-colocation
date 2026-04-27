import { z } from 'zod'

export const countrySchema = z.object({
  code: z.string().length(2),
  label: z.string(),
})

export const regionSchema = z.object({
  code: z.string().min(1).max(50),
  label: z.string(),
})

export const regionsInputSchema = z.object({
  country: z.string().length(2),
})

// Curated cities with centroids. Sourced from the `cities` table.
export const citySchema = z.object({
  code: z.string().min(1).max(100),
  label: z.string(),
  latitude: z.string(),
  longitude: z.string(),
})

export const citiesInputSchema = z.object({
  country: z.string().length(2),
  region: z.string().min(1).max(50).optional(),
})
