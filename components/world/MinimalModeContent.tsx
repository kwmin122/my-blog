'use client'

import { useWorldStore } from '@/lib/worldStore'

export default function MinimalModeContent({
  slug,
  postDate,
  children,
}: {
  slug: string
  postDate?: string
  children: React.ReactNode
}) {
  const minimalMode = useWorldStore((s) => s.minimalMode)

  if (!minimalMode) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        overflowY: 'auto',
        background: 'var(--color-bg)',
        padding: '2rem',
      }}
    >
      <article className="prose mx-auto max-w-2xl">
        {postDate && (
          <time dateTime={postDate} className="block text-sm text-[--color-text-muted] mb-4">
            {postDate}
          </time>
        )}
        {children}
        <a
          href={`/text/${slug}`}
          className="block mt-8 text-sm underline"
          style={{ color: 'var(--color-accent-neon)' }}
        >
          정본 페이지에서 읽기 →
        </a>
      </article>
    </div>
  )
}
