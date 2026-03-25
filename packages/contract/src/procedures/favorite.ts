import { oc } from '@orpc/contract'
import { z } from 'zod'
import { listingSchema } from '../schemas/listing'

export const favoriteContract = {
  list: oc.output(z.array(listingSchema)),
  ids: oc.output(z.array(z.string())),
  toggle: oc.input(z.object({ listingId: z.string() })).output(z.object({ favorited: z.boolean() })),
}
