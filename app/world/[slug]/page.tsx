import type { Metadata } from 'next'
import { getPostSlugs } from '@/lib/posts'
import WorldPostPanel from '@/components/world/WorldPostPanel'

export async function generateStaticParams() {
  const slugs = getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const { slug } = params
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

export default async function WorldSlugPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = params
  const { metadata } = await import(`@/content/posts/${slug}.mdx`)

  return (
    <WorldPostPanel slug={slug} title={metadata.title} excerpt={metadata.excerpt} />
  )
}
