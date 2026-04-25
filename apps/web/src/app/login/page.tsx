'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth-client'

export default function LoginPage() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isPending && session) {
      router.replace('/')
    }
  }, [isPending, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await authClient.signIn.email({ email, password })
    if (result.error) {
      setError(result.error.message ?? 'Une erreur est survenue')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleFacebookLogin = () => {
    authClient.signIn.social({ provider: 'facebook', callbackURL: window.location.origin + '/' })
  }

  if (isPending || session) return null

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Se connecter</h1>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous a votre compte Coloc
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                Mot de passe
              </label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-foreground py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-sm text-gray-400">ou</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          onClick={handleFacebookLogin}
          className="w-full rounded-md bg-[#1877F2] py-2 text-sm font-medium text-white hover:bg-[#1565C0]"
        >
          Se connecter avec Facebook
        </button>

        <p className="text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="font-medium text-gray-900 hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </main>
  )
}
