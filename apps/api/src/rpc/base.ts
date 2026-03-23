import { implement } from '@orpc/server'
import { contract } from '@coloc/contract'
import type { Context } from './context'

export const pub = implement(contract).$context<Context>()

export const authed = pub.use(({ context, next }) => {
  if (!context.user) throw new Error('Unauthorized')
  return next({ context: { ...context, user: context.user } })
})
