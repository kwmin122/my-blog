import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostSlugs } from '@/lib/posts'
import WorldPostPanel from '@/components/world/WorldPostPanel'
import WorldPostWaypointSync from '@/components/world/WorldPostWaypointSync'
import MinimalModeContent from '@/components/world/MinimalModeContent'

export async function generateStaticParams() {
  const slugs = getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export const dynamicParams = false

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { metadata } = await import(`@/content/posts/${slug}.mdx`)
    return {
      title: metadata.title,
      alternates: {
        canonical: `/text/${slug}`,
      },
    }
  } catch {
    return {
      alternates: {
        canonical: `/text/${slug}`,
      },
    }
  }
}

export default async function WorldSlugPage({ params }: Props) {
  const { slug } = await params
  try {
    const mod = await import(`@/content/posts/${slug}.mdx`)
    const { metadata } = mod
    const Post = mod.default as React.ComponentType
    const postDate: string | undefined = metadata?.date as string | undefined
    return (
      <>
        <WorldPostPanel slug={slug} title={metadata.title} excerpt={metadata.excerpt} />
        <WorldPostWaypointSync slug={slug} />
        <MinimalModeContent slug={slug} postDate={postDate}>
          <Post />
        </MinimalModeContent>
      </>
    )
  } catch {
    notFound()
  }
}
