import type { Metadata } from 'next'
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
          {children}
        </Providers>
      </body>
    </html>
  )
}
