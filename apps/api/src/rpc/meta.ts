import { asc } from 'drizzle-orm'

import { db } from '../db'
import { amenities } from '../db/schema'
import { pub } from './base'

export const amenitiesList = pub.meta.amenities.handler(async () => {
  const rows = await db
    .select({
      code: amenities.code,
      label: amenities.label,
      icon: amenities.icon,
      sortOrder: amenities.sortOrder,
    })
    .from(amenities)
    .orderBy(asc(amenities.sortOrder), asc(amenities.label))
  return rows
})
