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

// Cities aren't normalized (free-text on listings) so we expose the live set
// derived from published listings, optionally scoped to a region.
export const citySchema = z.object({
  name: z.string(),
})

export const citiesInputSchema = z.object({
  country: z.string().length(2),
  region: z.string().min(1).max(50).optional(),
})
