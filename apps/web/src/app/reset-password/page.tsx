'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-destructive">Lien invalide ou expiré.</p>
        <Link href="/forgot-password" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Mot de passe trop court (8 caractères minimum)')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas')
    setLoading(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)
    if (error) {
      setError(error.message ?? 'Une erreur est survenue')
      return
    }
    setDone(true)
    setTimeout(() => router.replace('/login'), 2000)
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-foreground">Mot de passe mis à jour. Redirection vers la connexion…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="text-sm font-medium">Nouveau mot de passe</label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1" />
      </div>
      <div>
        <label htmlFor="confirm" className="text-sm font-medium">Confirmer</label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="mt-1" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Mise à jour…' : 'Mettre à jour'}</Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Chargement…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  )
}
