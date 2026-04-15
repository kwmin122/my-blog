import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostSlugs } from '@/lib/posts'
import WorldPostPanel from '@/components/world/WorldPostPanel'
import WorldPostWaypointSync from '@/components/world/WorldPostWaypointSync'

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
    const { metadata } = await import(`@/content/posts/${slug}.mdx`)
    return (
      <><WorldPostPanel slug={slug} title={metadata.title} excerpt={metadata.excerpt} /><WorldPostWaypointSync slug={slug} /></>
    )
  } catch {
    notFound()
  }
}
