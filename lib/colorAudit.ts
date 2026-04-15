// lib/colorAudit.ts
// Dev-only utility: warns when a Three.js scene light color falls outside the locked palette range.
// Does NOT import Three.js — accepts string | plain RGB object to keep this usable without a 3D context.

const MAX_CHROMA = 0.28

function parseChroma(color: unknown): number | null {
  if (typeof color === 'string') {
    if (color.startsWith('oklch(')) {
      // oklch(L C H) — extract C (second space-separated number after the function keyword)
      const match = /oklch\(\s*[\d.]+\s+([\d.]+)/.exec(color)
      if (match) return parseFloat(match[1])
      return null
    }
    // hex or rgb — cannot reliably parse chroma without a full CSS parser; skip
    if (color.startsWith('#') || color.startsWith('rgb')) return null
    return null
  }

  // Duck-typed Three.js Color: { r, g, b } in 0-1 range
  if (
    color !== null &&
    typeof color === 'object' &&
    'r' in color &&
    'g' in color &&
    'b' in color &&
    typeof (color as { r: unknown }).r === 'number' &&
    typeof (color as { g: unknown }).g === 'number' &&
    typeof (color as { b: unknown }).b === 'number'
  ) {
    const { r, g, b } = color as { r: number; g: number; b: number }
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    // Use raw delta (max - min) as chroma proxy.
    // HSL saturation formula inflates to 1.0 for near-white/black (#fff8e8 → s=1.0 despite low chroma).
    return delta
  }

  return null
}

export function assertLightColor(color: unknown, label: string): void {
  if (process.env.NODE_ENV !== 'development') return

  const chroma = parseChroma(color)
  if (chroma === null) return

  if (chroma > MAX_CHROMA) {
    console.warn(
      `[colorAudit] "${label}" chroma ${chroma.toFixed(3)} exceeds MAX_CHROMA ${MAX_CHROMA} — add to accent palette or reduce saturation.`
    )
  }
}
