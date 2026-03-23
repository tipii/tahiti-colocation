import { oc } from '@orpc/contract'
import { z } from 'zod'

import {
  listingSchema,
  createListingSchema,
  updateListingSchema,
  listingFiltersSchema,
  paginatedListingsSchema,
} from '../schemas/listing'

const idInput = z.object({ id: z.string() })
const idOrSlugInput = z.object({ idOrSlug: z.string() })

export const listingContract = {
  list: oc.input(listingFiltersSchema).output(paginatedListingsSchema),
  get: oc.input(idOrSlugInput).output(listingSchema),
  mine: oc.output(z.array(listingSchema)),
  create: oc.input(createListingSchema).output(listingSchema),
  update: oc.input(idInput.merge(updateListingSchema)).output(listingSchema),
  delete: oc.input(idInput).output(z.object({ success: z.boolean() })),
  publish: oc.input(idInput).output(listingSchema),
  archive: oc.input(idInput).output(listingSchema),
}
