import AuthProvider from "@/components/AuthProvider"
import { TonConnectProvider } from "@/components/TonConnectProvider"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Crash Game',
  description: 'Telegram Mini App for Crash Game',
  manifest: '/telegram-app-manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
    <head>
        <meta name="telegram-web-app-ready" content="true" />
        <meta name="telegram-web-app-status-bar-style" content="black" />
    </head>
      <body className={inter.className}>
        <TonConnectProvider>
          <AuthProvider>{children}</AuthProvider>
        </TonConnectProvider>
      </body>
    </html>
  )
}
