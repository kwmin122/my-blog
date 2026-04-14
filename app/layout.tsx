import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import './globals.css'

const WorldCanvas = dynamic(
  () => import('@/components/world/WorldCanvas'),
  { ssr: false }
)

export const metadata: Metadata = {
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
        <WorldCanvas />
        <main id="page-content">{children}</main>
      </body>
    </html>
  )
}
