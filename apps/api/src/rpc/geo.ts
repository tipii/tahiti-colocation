import { and, asc, eq } from 'drizzle-orm'

import { db } from '../db'
import { countries, listings, regions } from '../db/schema'
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
  const conditions = [eq(listings.country, input.country), eq(listings.status, 'published')]
  if (input.region) conditions.push(eq(listings.region, input.region))
  const rows = await db
    .selectDistinct({ city: listings.city })
    .from(listings)
    .where(and(...conditions))
    .orderBy(asc(listings.city))
  return rows.map((r) => ({ name: r.city }))
})
