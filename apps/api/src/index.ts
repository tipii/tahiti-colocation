import 'dotenv/config'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { pinoLogger, type PinoLogger } from 'hono-pino'
import { RPCHandler } from '@orpc/server/fetch'

import { auth } from './lib/auth'
import { logger } from './lib/logger'
import { router } from './rpc/router'
import { createContext } from './rpc/context'
import healthRouter from './routes/health'
import imagesRouter from './routes/images'

type Env = { Variables: { logger: PinoLogger } }

const app = new Hono<Env>()

app.use('*', pinoLogger({ pino: logger }))

// Tag the request logger with the user (best-effort, ignores errors)
app.use('*', async (c, next) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (session?.user) {
      c.var.logger.assign({ user: session.user.email ?? session.user.id })
    }
  } catch {}
  await next()
})

app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:8081', 'https://dev.theop.dev', 'https://coolive.app'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
)

// Better Auth
app.all('/api/auth/*', (c) => auth.handler(c.req.raw))

// oRPC
const rpcHandler = new RPCHandler(router)

app.use('/rpc/*', async (c) => {
  const context = await createContext(c.req.raw.headers)
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: '/rpc',
    context,
  })
  if (matched) return new Response(response.body, response)
  return c.json({ error: 'Not found' }, 404)
})

// REST (health + image upload only)
app.route('/api/health', healthRouter)
app.route('/api/images', imagesRouter)

const port = Number(process.env.PORT) || 3001
logger.info(`Coolive API running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})
