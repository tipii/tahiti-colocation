'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth-client'

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
      <Link href="/" className="text-xl font-bold">
        Coloc
      </Link>
      {!isPending && (
        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <span className="text-sm text-gray-600">{session.user.name}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Se deconnecter
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm hover:text-gray-800">
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
              >
                S'inscrire
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
