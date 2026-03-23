'use client'

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { ContractRouterClient } from '@orpc/contract'
import type { Contract } from '@coloc/contract'

const link = new RPCLink({
  url: typeof window !== 'undefined' ? `${window.location.origin}/rpc` : 'http://localhost:3000/rpc',
  headers: () => ({}),
  fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
})

export const client: ContractRouterClient<Contract> = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
