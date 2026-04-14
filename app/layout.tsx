import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import WorldCanvasLoader from '@/components/world/WorldCanvasLoader'
import './globals.css'

const SmoothScrollProvider = dynamic(
  () => import('@/components/providers/SmoothScrollProvider'),
  { ssr: false },
)

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
        <SmoothScrollProvider>
          <main id="page-content">{children}</main>
        </SmoothScrollProvider>
      </body>
    </html>
  )
}
