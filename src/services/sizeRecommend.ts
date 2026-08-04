/**
 * Osnovna preporuka veličine na osnovu mera korisnice.
 * Jednostavna EU tabela (ženske veličine) — MVP verzija.
 */

import type { Measurements } from '../types'

/** EU ženske veličine — orijentacione vrednosti u cm */
const SIZE_CHART: { size: string; bust: [number, number]; waist: [number, number]; hips: [number, number] }[] = [
  { size: 'XS', bust: [78, 82], waist: [60, 64], hips: [84, 88] },
  { size: 'S', bust: [82, 86], waist: [64, 68], hips: [88, 92] },
  { size: 'M', bust: [86, 92], waist: [68, 74], hips: [92, 98] },
  { size: 'L', bust: [92, 98], waist: [74, 80], hips: [98, 104] },
  { size: 'XL', bust: [98, 106], waist: [80, 88], hips: [104, 112] },
  { size: 'XXL', bust: [106, 114], waist: [88, 96], hips: [112, 120] },
]

/**
 * Preporučuje EU veličinu na osnovu grudi/struka/kukova.
 * Koristi prosek skorova — ako mere nisu unete, vraća undefined.
 */
export function recommendSize(m: Measurements): string | undefined {
  const { bustCm, waistCm, hipsCm } = m
  if (bustCm == null && waistCm == null && hipsCm == null) {
    return undefined
  }

  let bestSize = 'M'
  let bestScore = Infinity

  for (const row of SIZE_CHART) {
    let score = 0
    let count = 0

    if (bustCm != null) {
      score += distanceToRange(bustCm, row.bust)
      count++
    }
    if (waistCm != null) {
      score += distanceToRange(waistCm, row.waist)
      count++
    }
    if (hipsCm != null) {
      score += distanceToRange(hipsCm, row.hips)
      count++
    }

    const avg = count > 0 ? score / count : Infinity
    if (avg < bestScore) {
      bestScore = avg
      bestSize = row.size
    }
  }

  return bestSize
}

function distanceToRange(value: number, range: [number, number]): number {
  if (value >= range[0] && value <= range[1]) return 0
  if (value < range[0]) return range[0] - value
  return value - range[1]
}

export function getSizeChart() {
  return SIZE_CHART
}
