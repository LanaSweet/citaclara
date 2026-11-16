import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'CitaClara',
  description: 'Agenda de citas para clínicas',
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-ES" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
