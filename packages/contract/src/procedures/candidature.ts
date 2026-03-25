import { oc } from '@orpc/contract'
import { z } from 'zod'
import { candidatureSchema } from '../schemas/candidature'

export const candidatureContract = {
  apply: oc
    .input(z.object({ listingId: z.string(), message: z.string().nullable().optional() }))
    .output(candidatureSchema),
  withdraw: oc
    .input(z.object({ id: z.string() }))
    .output(candidatureSchema),
  accept: oc
    .input(z.object({ id: z.string() }))
    .output(candidatureSchema),
  reject: oc
    .input(z.object({ id: z.string() }))
    .output(candidatureSchema),
  finalize: oc
    .input(z.object({ candidatureId: z.string(), rejectionMessage: z.string().nullable().optional() }))
    .output(candidatureSchema),
  forListing: oc
    .input(z.object({ listingId: z.string() }))
    .output(z.array(candidatureSchema)),
  mine: oc
    .output(z.array(candidatureSchema)),
  count: oc
    .input(z.object({ listingId: z.string() }))
    .output(z.object({ total: z.number().int(), pending: z.number().int() })),
}
