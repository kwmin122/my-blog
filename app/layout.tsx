import type { Metadata } from 'next'
import WorldCanvasLoader from '@/components/world/WorldCanvasLoader'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://webbuild-gray.vercel.app'
  ),
  title: 'World',
  description: 'Personal blog — single continuous 3D world',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <WorldCanvasLoader />
        <main id="page-content">{children}</main>
      </body>
    </html>
  )
}
