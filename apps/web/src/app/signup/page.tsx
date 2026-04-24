'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth-client'

export default function SignupPage() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()
  const [name, setName] = useState('')
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
    const result = await authClient.signUp.email({ email, password, name })
    if (result.error) {
      setError(result.error.message ?? 'Une erreur est survenue')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleFacebookSignup = () => {
    authClient.signIn.social({ provider: 'facebook', callbackURL: window.location.origin + '/' })
  }

  if (isPending || session) return null

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Creer un compte</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Rejoignez Coloc et trouvez votre colocation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">Nom</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Adresse email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
            <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {loading ? 'Creation...' : "S'inscrire"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted-foreground">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button onClick={handleFacebookSignup} className="w-full rounded-md bg-[#1877F2] py-2 text-sm font-medium text-white hover:bg-[#1565C0]">
          S'inscrire avec Facebook
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Deja un compte ?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
        </p>
      </div>
    </main>
  )
}
