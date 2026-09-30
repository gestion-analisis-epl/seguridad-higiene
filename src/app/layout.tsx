import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { AuthProvider } from '@/presentation/auth/AuthProvider'

const sans = localFont({ src: './fonts/GeistVF.woff', variable: '--font-sans', weight: '100 900', display: 'swap' })
const mono = localFont({ src: './fonts/GeistMonoVF.woff', variable: '--font-mono', weight: '100 900', display: 'swap' })

export const metadata: Metadata = {
  title: 'Seguridad e Higiene',
  description: 'Captura y seguimiento de seguridad e higiene por ciudad',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
