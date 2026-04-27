import { z } from 'zod'

export const amenitySchema = z.object({
  code: z.string().min(1).max(50),
  label: z.string(),
  // Feather icon name (kebab-case). Web converts to Lucide PascalCase.
  icon: z.string(),
  sortOrder: z.number().int(),
})
