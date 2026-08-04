/**
 * Virtual Try-On API servis
 *
 * PLACEHOLDER — ovde se kasnije povezuje spoljašnji Virtual Try-On API
 * (npr. Fashn, Pixelcut, VModel, custom model, itd.)
 *
 * Trenutno vraća mock rezultate radi razvoja UI-ja.
 */

import type { BodyPhoto, Measurements, TryOnPose, TryOnResult, ViewAngle } from '../types'
import { VIEW_ANGLES } from '../types'
import { recommendSize } from './sizeRecommend'

export interface GenerateTryOnParams {
  bodyPhotos: BodyPhoto[]
  measurements: Measurements
  pose: TryOnPose
  clothingImageUrl: string
  productUrl?: string
  productName?: string
  sourceType: 'url' | 'upload'
}

/**
 * Generiše virtuelni try-on rezultat.
 *
 * TODO: Zameniti mock implementaciju pravim API pozivom:
 * 1. Upload body photos + clothing image na API / storage
 * 2. Pozvati try-on endpoint sa merama i izabranom pozom
 * 3. Sačekati rezultat (polling ili webhook)
 * 4. Mapirati response na TryOnResult.views
 */
export async function generateTryOn(params: GenerateTryOnParams): Promise<TryOnResult> {
  // Simulacija mrežnog kašnjenja (API bi trajao 5–30s)
  await delay(2200)

  // --- MOCK IMPLEMENTACIJA ---
  // U produkciji: const response = await fetch(TRY_ON_API_URL, { method: 'POST', body: ... })

  const views: Partial<Record<ViewAngle, string>> = {}
  for (const angle of VIEW_ANGLES) {
    // Mock: koristimo clothing image ili body photo kao placeholder
    // Pravi API bi vratio generisane slike po uglu
    views[angle.id] = params.clothingImageUrl
  }

  // Ako imamo body front foto, koristimo je kao "realističniji" mock
  const frontBody = params.bodyPhotos.find((p) => p.angle === 'front')
  if (frontBody) {
    views.front = frontBody.dataUrl
    views.angle45 = frontBody.dataUrl
  }

  const recommendedSize = recommendSize(params.measurements)

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
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
