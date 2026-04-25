// Send a test email via Brevo. Usage:
//   pnpm --filter @coloc/api tsx src/scripts/test-email.ts your@email.com
import 'dotenv/config'

const to = process.argv[2]
if (!to) {
  console.error('usage: tsx src/scripts/test-email.ts <recipient@email>')
  process.exit(1)
}

const apiKey = process.env.BREVO_API_KEY
if (!apiKey) {
  console.error('BREVO_API_KEY not set')
  process.exit(1)
}

const res = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'api-key': apiKey,
    accept: 'application/json',
  },
  body: JSON.stringify({
    sender: {
      email: process.env.EMAIL_FROM_ADDRESS ?? 'hello@coolive.app',
      name: process.env.EMAIL_FROM_NAME ?? 'Coolive',
    },
    to: [{ email: to }],
    subject: 'Test Coolive — Brevo OK ?',
    htmlContent: '<p>Si tu reçois ça, Brevo est correctement câblé. 🌴</p>',
  }),
})

console.log('status:', res.status)
console.log('body:', await res.text())
