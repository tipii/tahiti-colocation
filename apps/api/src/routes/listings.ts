import { Hono } from 'hono'

import { db } from '../db'
import { listings } from '../db/schema'

const listingsRouter = new Hono()

listingsRouter.get('/', async (c) => {
  const allListings = await db.select().from(listings)
  return c.json({ data: allListings, error: null })
})

export default listingsRouter
