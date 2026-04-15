// tokens/tokens.ts
// Single source of truth for JS/TS consumers (Three.js lights, GSAP ease strings).
// CSS consumers: use var(--color-*) / var(--ease-*) / var(--lighting-*) directly.

export const tokens = {
  color: {
    base:        'oklch(0.12 0.01 240)',
    surface:     'oklch(0.18 0.02 240)',
    accentNeon:  'oklch(0.82 0.25 140)',
    accentSky:   'oklch(0.78 0.15 220)',
    accentLight: 'oklch(0.90 0.08 60)',
    textPrimary: 'oklch(0.96 0.01 240)',
    textMuted:   'oklch(0.70 0.03 240)',
  },
  spacing: {
    xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem',
  },
  typography: {
    sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem',
    '2xl': '1.5rem', '4xl': '2.25rem',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in:      'cubic-bezier(0.4, 0, 1, 1)',
    out:     'cubic-bezier(0, 0, 0.2, 1)',
    bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  lighting: {
    ambientIntensity:     0.4,
    directionalIntensity: 1.2,
    accentHue:            140,
  },
  // Three.js geometry/material colors — hex accepted here (THREE.Color constructor)
  // tokens/tokens.ts is excluded from the local/no-hardcoded-hex ESLint rule
  scene: {
    sky:        '#a8d4f5',   // fog + background — archipelago sky
    sunlight:   '#fff8e8',   // directional light warm tint
    cloud:      '#f0f4ff',   // cloud sea plane mesh
    islandSand: '#c4a882',   // floating island base geometry
  },
} as const

export type TokenColor    = typeof tokens.color
export type TokenEasing   = typeof tokens.easing
export type TokenLighting = typeof tokens.lighting
export type TokenScene    = typeof tokens.scene

export const baseTone = tokens.color.base
export const accent = {
  neon:  tokens.color.accentNeon,
  sky:   tokens.color.accentSky,
  light: tokens.color.accentLight,
} as const
export type AccentPalette = typeof accent
