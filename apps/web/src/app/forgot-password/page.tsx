'use client'

import { useState } from 'react'
import Link from 'next/link'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    setLoading(false)
    if (error) {
      setError(error.message ?? 'Une erreur est survenue')
      return
    }
    setSubmitted(true)
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre ton email, on t&apos;envoie un lien pour le réinitialiser.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm text-foreground">
              Si un compte existe pour <span className="font-medium">{email}</span>, tu vas recevoir un email avec le lien de réinitialisation.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Vérifie aussi ton dossier spam.</p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@exemple.com"
                className="mt-1"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
