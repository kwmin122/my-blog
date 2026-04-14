import { readdirSync } from 'node:fs'
import { join } from 'node:path'

export interface PostMetadata {
  title: string
  excerpt: string
  date: string
  category: string
}

/**
 * Returns all post slugs by reading content/posts/*.mdx at build time.
 * Server-only — do not import from client components.
 */
export function getPostSlugs(): string[] {
  const postsDir = join(process.cwd(), 'content', 'posts')
  return readdirSync(postsDir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
}
