import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'

import { Header } from '@/components/header'
import { Providers } from './providers'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Coolive — La coloc en Polynésie',
  description: 'Ta coloc, sans prise de tête. Trouve ou propose une chambre partagée en Polynésie française.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <Header />
          <div className="min-h-[calc(100vh-65px)]">{children}</div>
          <footer className="mt-12 border-t border-border/50 px-6 py-6 text-xs text-muted-foreground">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <span>
                © {new Date().getFullYear()} Coolive · Made with ♥ by{' '}
                <a href="https://tarima.dev" target="_blank" rel="noreferrer" className="hover:text-primary">tarima.dev</a>
              </span>
              <nav className="flex gap-4">
                <Link href="/privacy" className="hover:text-primary">Confidentialité</Link>
                <Link href="/terms" className="hover:text-primary">Conditions</Link>
                <a href="mailto:hello@tarima.dev" className="hover:text-primary">Contact</a>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
