import type { Metadata } from 'next'
import WorldCanvasLoader from '@/components/world/WorldCanvasLoader'
import SmoothScrollProviderWrapper from '@/components/providers/SmoothScrollProviderWrapper'
import { UIOverlay } from '@/components/ui/UIGlassPanel'
import WorldCursor from '@/components/world/WorldCursor'
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
        <a
          href="#page-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:outline-none"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)', boxShadow: 'var(--focus-ring)' }}
        >
          본문으로 건너뛰기
        </a>
        <WorldCanvasLoader />
        <UIOverlay>
          <WorldCursor />
          <SmoothScrollProviderWrapper>
            <main id="page-content">{children}</main>
          </SmoothScrollProviderWrapper>
        </UIOverlay>
      </body>
    </html>
  )
}
