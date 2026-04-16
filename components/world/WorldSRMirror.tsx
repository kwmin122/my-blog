'use client'

import { useWorldStore } from '@/lib/worldStore'

export interface PostSRData {
  slug: string
  title: string
  excerpt: string
  visuals: { id: string; alt: string }[]
}

export default function WorldSRMirror({ posts }: { posts: PostSRData[] }) {
  const activeWaypoint = useWorldStore((s) => s.activeWaypoint)
  const activeSlug = activeWaypoint?.slug ?? null

  const activePost = activeSlug ? posts.find((p) => p.slug === activeSlug) : null
  const liveText = activePost
    ? `현재 위치: ${activePost.title}`
    : '현재 위치: 월드 홈'

  return (
    <div role="region" aria-label="월드 콘텐츠 접근성 미러" className="sr-only">
      {/* Static descriptors — always in AT tree for crawling */}
      {posts.map((post) => (
        <div key={post.slug} id={`sr-post-${post.slug}`}>
          <p role="heading" aria-level={2}>{post.title}</p>
          <p>{post.excerpt}</p>
          {post.visuals.map((v) => (
            <p key={v.id}>{v.alt}</p>
          ))}
        </div>
      ))}
      {/* aria-live region — announces active waypoint changes only */}
      <div aria-live="polite" aria-atomic="true">
        {liveText}
      </div>
    </div>
  )
}
