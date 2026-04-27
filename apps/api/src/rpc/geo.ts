import { and, asc, eq } from 'drizzle-orm'

import { db } from '../db'
import { cities, countries, regions } from '../db/schema'
import { pub } from './base'

export const countriesList = pub.geo.countries.handler(async () => {
  const rows = await db
    .select({ code: countries.code, label: countries.label })
    .from(countries)
    .orderBy(asc(countries.sortOrder), asc(countries.label))
  return rows
})

export const regionsList = pub.geo.regions.handler(async ({ input }) => {
  const rows = await db
    .select({ code: regions.code, label: regions.label })
    .from(regions)
    .where(eq(regions.countryCode, input.country))
    .orderBy(asc(regions.sortOrder), asc(regions.label))
  return rows
})

export const citiesList = pub.geo.cities.handler(async ({ input }) => {
  const conditions = [eq(cities.countryCode, input.country)]
  if (input.region) conditions.push(eq(cities.regionCode, input.region))
  const rows = await db
    .select({
      code: cities.code,
      label: cities.label,
      latitude: cities.latitude,
      longitude: cities.longitude,
    })
    .from(cities)
    .where(and(...conditions))
    .orderBy(asc(cities.sortOrder), asc(cities.label))
  return rows
})
