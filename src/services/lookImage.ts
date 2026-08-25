import type { TryOnResult, ViewAngle } from '../types'
import { VIEW_ANGLES } from '../types'

/** Prva dostupna try-on slika (ne mora biti "front"). */
export function getPrimaryLookImage(look: Pick<TryOnResult, 'views' | 'clothingImageUrl'>): string | null {
  for (const a of VIEW_ANGLES) {
    const u = look.views?.[a.id]
    if (typeof u === 'string' && u.length > 8) return u
  }
  // bilo koji drugi key u views
  for (const u of Object.values(look.views || {})) {
    if (typeof u === 'string' && u.length > 8) return u
  }
  return null
}

/** Za thumbnail: try-on slika, inače null (NE clothing — da ne zbuni korisnika). */
export function getLookThumbnail(look: TryOnResult): string | null {
  return getPrimaryLookImage(look)
}

export function collectLookViews(look: TryOnResult): [ViewAngle | string, string][] {
  const out: [string, string][] = []
  const seen = new Set<string>()
  for (const a of VIEW_ANGLES) {
    const u = look.views?.[a.id]
    if (typeof u === 'string' && u.length > 8 && !seen.has(u)) {
      seen.add(u)
      out.push([a.id, u])
    }
  }
  for (const [k, u] of Object.entries(look.views || {})) {
    if (typeof u === 'string' && u.length > 8 && !seen.has(u)) {
      seen.add(u)
      out.push([k, u])
    }
  }
  return out
}
