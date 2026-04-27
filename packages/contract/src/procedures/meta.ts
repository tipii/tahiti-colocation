import { oc } from '@orpc/contract'
import { z } from 'zod'

import { amenitySchema } from '../schemas/amenity'

export const metaContract = {
  amenities: oc.output(z.array(amenitySchema)),
}
