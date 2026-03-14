import 'dotenv/config'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { auth } from './lib/auth'
import healthRouter from './routes/health'
import imagesRouter from './routes/images'
import listingsRouter from './routes/listings'

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:8081', 'https://api-dev.theop.dev'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
)

app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw))

app.route('/api/health', healthRouter)
app.route('/api/images', imagesRouter)
app.route('/api/listings', listingsRouter)

const port = Number(process.env.PORT) || 3001
console.log(`Coloc API running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})
