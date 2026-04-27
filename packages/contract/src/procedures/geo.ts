import { oc } from '@orpc/contract'
import { z } from 'zod'

import { citiesInputSchema, citySchema, countrySchema, regionSchema, regionsInputSchema } from '../schemas/geo'

export const geoContract = {
  countries: oc.output(z.array(countrySchema)),
  regions: oc.input(regionsInputSchema).output(z.array(regionSchema)),
  cities: oc.input(citiesInputSchema).output(z.array(citySchema)),
}
