import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const VALID_CATEGORIES = ['일기', '공부', '일지'] as const
export type ValidCategory = (typeof VALID_CATEGORIES)[number]

export interface AltVisual {
  id: string
  alt: string
}

export interface AltData {
  visuals: AltVisual[]
}

export function validatePostsMeta(): void {
  const postsDir = join(process.cwd(), 'content', 'posts')
  const slugs = readdirSync(postsDir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))

  if (slugs.length < 5) {
    throw new Error(
      `[CONT-02] posts ${slugs.length}/5 — 5편 이상 필요. 현재: ${slugs.join(', ')}`
    )
  }

  const counts: Record<string, number> = {}
  for (const slug of slugs) {
    const text = readFileSync(join(postsDir, `${slug}.mdx`), 'utf-8')
    const m = text.match(/category:\s*['"](.+?)['"]/)
    const cat = m?.[1]
    if (!cat || !(VALID_CATEGORIES as readonly string[]).includes(cat)) {
      throw new Error(
        `[CONT-02] ${slug}: category '${cat ?? '(없음)'}' 유효하지 않음. 허용값: ${VALID_CATEGORIES.join(', ')}`
      )
    }
    if (!existsSync(join(postsDir, `${slug}.alt.json`))) {
      throw new Error(`[CONT-03] ${slug}: ${slug}.alt.json 누락`)
    }
    counts[cat] = (counts[cat] ?? 0) + 1
  }

  for (const cat of VALID_CATEGORIES) {
    if (!counts[cat]) {
      throw new Error(`[CONT-02] '${cat}' 카테고리 글 없음. 각 카테고리 1편 이상 필요.`)
    }
  }
}

export function getAltData(slug: string): AltData {
  const altPath = join(process.cwd(), 'content', 'posts', `${slug}.alt.json`)
  if (!existsSync(altPath)) return { visuals: [] }
  const raw = readFileSync(altPath, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<AltData>
  return { visuals: parsed.visuals ?? [] }
}
