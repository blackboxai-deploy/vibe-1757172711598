import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Carrom Pool AI Aim',
  description: 'Professional carrom game with AI-powered aiming assistance, trajectory prediction, and visual overlays',
  keywords: [
    'carrom',
    'pool',
    'ai',
    'aim',
    'trajectory',
    'physics',
    'game',
    'board game',
    'carrom board',
    'artificial intelligence'
  ],
  authors: [{ name: 'BLACKBOX AI' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#f59e0b',
  openGraph: {
    title: 'Carrom Pool AI Aim',
    description: 'Professional carrom game with AI-powered aiming assistance',
    type: 'website',
    locale: 'en_US',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}