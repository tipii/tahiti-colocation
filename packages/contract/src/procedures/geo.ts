import { oc } from '@orpc/contract'
import { z } from 'zod'

import { countrySchema, regionSchema, regionsInputSchema } from '../schemas/geo'

export const geoContract = {
  countries: oc.output(z.array(countrySchema)),
  regions: oc.input(regionsInputSchema).output(z.array(regionSchema)),
}
