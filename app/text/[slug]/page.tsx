import type { Metadata } from 'next'
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
  const { metadata } = await import(`@/content/posts/${slug}.mdx`)
  return {
    title: metadata.title,
    description: metadata.excerpt,
    alternates: {
      canonical: `/text/${slug}`,
    },
  }
}

export default async function TextPage({ params }: Props) {
  const { slug } = await params
  const { default: Post } = await import(`@/content/posts/${slug}.mdx`)
  return (
    <>
      <LCPObserver />
      <article className="prose mx-auto px-4 py-8 max-w-2xl">
        <Post />
      </article>
    </>
  )
}
