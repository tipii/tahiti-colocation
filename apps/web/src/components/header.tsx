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
    <header className="flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold">
          Coloc
        </Link>
        {!isPending && session && (
          <nav className="flex items-center gap-4">
            <Link href="/listings/mine" className="text-sm text-muted-foreground hover:text-foreground">
              Mes annonces
            </Link>
            <Link href="/listings/new" className="text-sm text-muted-foreground hover:text-foreground">
              Publier
            </Link>
          </nav>
        )}
      </div>
      {!isPending && (
        <nav className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground">{session.user.name}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Se deconnecter
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Se connecter
              </Link>
              <Link href="/signup" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                S'inscrire
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
