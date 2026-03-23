import { oc } from '@orpc/contract'
import { z } from 'zod'

import { imageSchema } from '../schemas/listing'
import { imageListInputSchema, imageDeleteInputSchema, imageReorderInputSchema, successSchema } from '../schemas/image'

export const imageContract = {
  list: oc.input(imageListInputSchema).output(z.array(imageSchema)),
  delete: oc.input(imageDeleteInputSchema).output(successSchema),
  reorder: oc.input(imageReorderInputSchema).output(successSchema),
}
