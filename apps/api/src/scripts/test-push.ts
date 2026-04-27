// Send a test push to a user. Usage:
//   pnpm --filter @coloc/api tsx src/scripts/test-push.ts <user-email>
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'

import * as schema from '../db/schema'

const email = process.argv[2]
if (!email) {
  console.error('usage: tsx src/scripts/test-push.ts <user-email>')
  process.exit(1)
}

const db = drizzle(process.env.DATABASE_URL!, { schema })

const [u] = await db
  .select({ pushToken: schema.user.pushToken, name: schema.user.name })
  .from(schema.user)
  .where(eq(schema.user.email, email))
  .limit(1)

if (!u?.pushToken) {
  console.error(`no push token for ${email}`)
  process.exit(1)
}

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  accept: 'application/json',
  'accept-encoding': 'gzip, deflate',
}
if (process.env.EXPO_PUSH_ACCESS_TOKEN) {
  headers.Authorization = `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`
}

const res = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    to: u.pushToken,
    title: 'Test Coolive 🌴',
    body: `Salut ${u.name ?? ''} — push direct depuis le serveur dev.`.trim(),
    sound: 'default',
  }),
})

console.log('status:', res.status)
console.log('body:', await res.text())
process.exit(0)
