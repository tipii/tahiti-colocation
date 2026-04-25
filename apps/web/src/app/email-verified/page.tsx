'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function EmailVerifiedPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    // Auto-attempt to open the app on mobile after a short delay
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      const t = setTimeout(() => {
        window.location.href = 'coolive://email-verified'
      }, 800)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl">🌴</h1>
        <h2 className="text-2xl font-bold">Email confirmé</h2>
        <p className="text-sm text-muted-foreground">
          Merci, ton adresse email est validée. Tu peux maintenant postuler et publier des annonces.
        </p>

        {isMobile ? (
          <div className="space-y-3">
            <a
              href="coolive://email-verified"
              className="block w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Ouvrir l&apos;app Coolive
            </a>
            <p className="text-xs text-muted-foreground">
              Si rien ne se passe, tu n&apos;as peut-être pas l&apos;app installée.
            </p>
            <Link href="/" className="inline-block text-sm text-primary hover:underline">
              Continuer sur le site
            </Link>
          </div>
        ) : (
          <Link href="/" className="inline-block text-sm font-medium text-primary hover:underline">
            Aller au site
          </Link>
        )}
      </div>
    </main>
  )
}
