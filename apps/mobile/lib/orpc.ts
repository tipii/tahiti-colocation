import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { ContractRouterClient } from '@orpc/contract'
import type { Contract } from '@coloc/contract'

import { authClient } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

const link = new RPCLink({
  url: `${API_URL}/rpc`,
  headers: async () => {
    const cookies = authClient.getCookie()
    return cookies ? { Cookie: cookies } : {}
  },
})

export const client: ContractRouterClient<Contract> = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
