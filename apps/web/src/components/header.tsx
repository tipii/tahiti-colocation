'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function Header() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between border-b border-border/50 bg-card px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-primary">
          Coloc Tahiti
        </Link>
        {!isPending && session && (
          <nav className="flex items-center gap-4">
            <Link href="/listings/mine" className="text-sm text-muted-foreground hover:text-secondary">
              Mes annonces
            </Link>
            <Link href="/listings/new" className="text-sm text-muted-foreground hover:text-secondary">
              Publier
            </Link>
          </nav>
        )}
      </div>
      {!isPending && (
        <nav className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground">{session.user?.name ?? session.user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Se deconnecter
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Se connecter
              </Link>
              <Link href="/signup" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                S'inscrire
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
