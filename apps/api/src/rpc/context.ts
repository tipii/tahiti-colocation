import { auth } from '../lib/auth'

export interface Context {
  user: { id: string; name: string; email: string; role?: string } | null
}

export async function createContext(headers: Headers): Promise<Context> {
  try {
    const session = await auth.api.getSession({ headers })
    if (!session?.user) return { user: null }
    const u = session.user
    return { user: { id: u.id, name: u.name, email: u.email, role: u.role ?? undefined } }
  } catch {
    return { user: null }
  }
}
