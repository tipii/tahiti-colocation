import { authClient } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const cookies = authClient.getCookie()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { Cookie: cookies } : {}),
      ...options?.headers,
    },
    credentials: 'omit',
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}
