import { oc } from '@orpc/contract'
import { z } from 'zod'

const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  avatar: z.string().nullable(),
  bio: z.string().nullable(),
})

export const userContract = {
  me: oc.output(profileSchema),
  update: oc
    .input(z.object({
      name: z.string().min(1).optional(),
      bio: z.string().nullable().optional(),
    }))
    .output(profileSchema),
  updateAvatar: oc
    .input(z.object({ avatarUrl: z.string() }))
    .output(profileSchema),
  removeAvatar: oc
    .output(profileSchema),
}
