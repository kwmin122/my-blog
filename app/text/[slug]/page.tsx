import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LCPObserver from '@/components/text/LCPObserver'
import { getPostSlugs } from '@/lib/posts'

export const dynamicParams = false

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { metadata } = await import(`@/content/posts/${slug}.mdx`)
    return {
      title: metadata.title,
      description: metadata.excerpt,
      alternates: {
        canonical: `/text/${slug}`,
      },
    }
  } catch {
    return { alternates: { canonical: `/text/${slug}` } }
  }
}

export default async function TextPage({ params }: Props) {
  const { slug } = await params
  let Post: React.ComponentType
  let postDate: string | undefined
  try {
    const mod = await import(`@/content/posts/${slug}.mdx`)
    Post = mod.default
    postDate = mod.metadata?.date as string | undefined
  } catch {
    notFound()
  }
  return (
    <>
      <LCPObserver />
      <article className="prose mx-auto px-4 py-8 max-w-2xl">
        {postDate && (
          <time dateTime={postDate} className="block text-sm text-[--color-text-muted] mb-4">
            {postDate}
          </time>
        )}
        <Post />
      </article>
    </>
  )
}
