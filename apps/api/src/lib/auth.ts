import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'

import { db } from '../db'
import * as schema from '../db/schema'
import { sendEmailVerificationEmail, sendPasswordResetEmail } from './notifications'

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  trustedOrigins: ['http://localhost:3000', 'https://dev.theop.dev', 'https://api-coloc.theop.dev', 'https://coolive.app', 'coolive://', 'mobile://', 'exp://'],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/send-verification-email': { window: 60, max: 1 },
      '/request-password-reset': { window: 60, max: 1 },
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60 * 60, max: 5 },
    },
  },
  plugins: [expo()],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, token }: { user: { email: string; name?: string }; token: string }) => {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        url: `${WEB_URL}/reset-password?token=${token}`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60, // 1 hour
    sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string }; url: string; token: string }) => {
      // Better Auth's default url has callbackURL=baseURL (the API). Override to land on the web success page.
      const finalUrl = url.replace(/callbackURL=[^&]*/, `callbackURL=${encodeURIComponent(`${WEB_URL}/email-verified`)}`)
      await sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        url: finalUrl,
      })
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID ?? '',
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? '',
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID ?? '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
      redirectURI: process.env.FACEBOOK_REDIRECT_URI,
    },
  },
  account: {
    skipStateCookieCheck: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
      },
      bio: {
        type: 'string',
        required: false,
      },
      avatar: {
        type: 'string',
        required: false,
      },
    },
  },
})
