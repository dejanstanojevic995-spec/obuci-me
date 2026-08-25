/**
 * Virtual Try-On — Grok Imagine (xAI) preko lokalnog backend-a
 *
 * Štednja: 1 generacija = 1 frontalna slika (ne 5 uglova).
 * Backend: server/index.js → POST /api/try-on → xAI /v1/images/edits
 */

import type { BodyPhoto, Measurements, TryOnPose, TryOnResult, ViewAngle } from '../types'
import { recommendSize } from './sizeRecommend'

export interface GenerateTryOnParams {
  bodyPhotos: BodyPhoto[]
  measurements: Measurements
  pose: TryOnPose
  clothingImageUrl: string
  productUrl?: string
  productName?: string
  sourceType: 'url' | 'upload'
  garmentType?: string
  garmentLabelSr?: string
  changeOnly?: string
  keepFromCustomer?: string[]
}

/** Max duža strana pre slanja API-ju (manji payload = brže + jeftinije) */
const MAX_EDGE = 1024
const JPEG_QUALITY = 0.82

/**
 * Generiše virtuelni try-on rezultat preko Grok Imagine.
 * Bira body fotku po pozi + uvek šalje face-lock crop sa front fotke.
 */
export type TryOnGenerateResult = TryOnResult & {
  costLabel?: string
  pipeline?: string
}

export async function generateTryOn(params: GenerateTryOnParams): Promise<TryOnGenerateResult> {
  const person = pickPersonPhotoForPose(params.bodyPhotos, params.pose)
  const frontForFace =
    params.bodyPhotos.find((p) => p.angle === 'front') || person

  if (!person?.dataUrl) {
    throw new Error('Nedostaje body fotka. Dovrši onboarding (front fotka).')
  }
  if (!params.clothingImageUrl) {
    throw new Error('Nedostaje slika odeće.')
  }

  const [personImage, clothingImage, faceImage] = await Promise.all([
    compressImageDataUrl(person.dataUrl),
    compressImageDataUrl(params.clothingImageUrl),
    cropFaceRegion(frontForFace!.dataUrl),
  ])

  const res = await fetch('/api/try-on', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personImage,
      clothingImage,
      faceImage: faceImage || undefined,
      pose: params.pose,
      productName: params.productName,
      productUrl: params.productUrl,
      personAngle: person.angle,
      garmentType: params.garmentType,
      garmentLabelSr: params.garmentLabelSr,
      changeOnly: params.changeOnly,
      keepFromCustomer: params.keepFromCustomer,
    }),
  })

  let payload: {
    error?: string
    imageUrl?: string
    detail?: unknown
    pipeline?: string
    warning?: string
    usage?: {
      step1Ticks?: number
      step2Ticks?: number
      totalTicks?: number
      approxUsd?: number
    }
  }
  try {
    payload = await res.json()
  } catch {
    throw new Error('Server nije dostupan. Pokreni: npm run server (port 3001).')
  }

  if (!res.ok || !payload.imageUrl) {
    const msg = payload.error || `Try-on nije uspeo (${res.status})`
    throw new Error(msg)
  }

  if (payload.usage) {
    console.info(
      '[try-on cost]',
      'pipeline=',
      payload.pipeline,
      'step1$≈',
      ((payload.usage.step1Ticks || 0) / 1e10).toFixed(4),
      'step2$≈',
      ((payload.usage.step2Ticks || 0) / 1e10).toFixed(4),
      'total$≈',
      payload.usage.approxUsd,
    )
  }
  if (payload.warning) {
    console.warn('[try-on]', payload.warning)
  }

  const recommendedSize = recommendSize(params.measurements)
  const viewKey = viewKeyForPose(params.pose)

  // Uvek stavi i pod "front" — ormar/detail očekuju glavnu sliku
  const views: Partial<Record<ViewAngle, string>> = {
    front: payload.imageUrl,
  }
  if (viewKey !== 'front') {
    views[viewKey] = payload.imageUrl
  }

  const costLabel = payload.usage
    ? `Trošak ≈ $${Number(payload.usage.approxUsd || 0).toFixed(4)} (1. poziv ≈ $${((payload.usage.step1Ticks || 0) / 1e10).toFixed(4)}, 2. ≈ $${((payload.usage.step2Ticks || 0) / 1e10).toFixed(4)})`
    : undefined

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    pose: params.pose,
    sourceType: params.sourceType,
    productUrl: params.productUrl,
    clothingImageUrl: params.clothingImageUrl,
    productName: params.productName ?? 'Proizvod',
    views,
    recommendedSize,
    saved: false,
    costLabel,
    pipeline: payload.pipeline,
  }
}

/** Za bočnu pozu koristi left/right body fotku ako je korisnik uploadovao. */
function pickPersonPhotoForPose(
  photos: BodyPhoto[],
  pose: TryOnPose,
): BodyPhoto | undefined {
  const by = (angle: BodyPhoto['angle']) => photos.find((p) => p.angle === angle)

  if (pose === 'stojeći-bočno') {
    return by('left') || by('right') || by('front') || photos[0]
  }
  if (pose === 'sedeći') {
    // sedeća: front i dalje najbolja baza
    return by('front') || photos[0]
  }
  // front, hodajući, ruke-u-bok
  return by('front') || photos[0]
}

function viewKeyForPose(pose: TryOnPose): ViewAngle {
  switch (pose) {
    case 'stojeći-bočno':
      return 'side'
    case 'hodajući':
      return 'angle45'
    case 'ruke-u-bok':
      return 'front'
    case 'sedeći':
      return 'angle135'
    case 'stojeći-front':
    default:
      return 'front'
  }
}

/**
 * Iseče gornji-centralni deo front fotke ≈ lice/glava.
 * Šalje se kao Image 3 (face lock) da se lice ne "odluta".
 */
async function cropFaceRegion(src: string): Promise<string | null> {
  try {
    const img = await loadImage(src)
    const { width: w, height: h } = img
    if (w < 32 || h < 32) return null

    // Full-body: lice je gore-centar. Portrait selfie: veći deo.
    const isTall = h / w > 1.25
    const cropW = Math.round(w * (isTall ? 0.52 : 0.62))
    const cropH = Math.round(h * (isTall ? 0.3 : 0.42))
    const sx = Math.max(0, Math.round((w - cropW) / 2))
    const sy = Math.max(0, Math.round(h * (isTall ? 0.03 : 0.02)))
    const sw = Math.min(cropW, w - sx)
    const sh = Math.min(cropH, h - sy)

    // Skaliraj face crop na ~768px da model bolje vidi detalje
    const maxFace = 768
    const scale = Math.min(1, maxFace / Math.max(sw, sh))
    const dw = Math.max(1, Math.round(sw * scale))
    const dh = Math.max(1, Math.round(sh * scale))

    const canvas = document.createElement('canvas')
    canvas.width = dw
    canvas.height = dh
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)
    return canvas.toDataURL('image/jpeg', 0.9)
  } catch {
    return null
  }
}

/**
 * Smanjuje data URL / remote image na max edge + JPEG radi manjeg payload-a.
 * Ako failuje, vraća original.
 */
async function compressImageDataUrl(src: string): Promise<string> {
  // Već mali remote URL — ostavi (backend prosleđuje xAI-u)
  if (src.startsWith('http://') || src.startsWith('https://')) {
    // Ako je prevelik data URL path — ovo nije data. Remote ostaje.
    if (!src.startsWith('data:')) return src
  }

  try {
    const img = await loadImage(src)
    const { width, height } = img
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return src
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } catch {
    return src
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Ne mogu da učitam sliku'))
    img.src = src
  })
}
