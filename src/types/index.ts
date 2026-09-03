/** Tipovi za OBUCI ME MVP */

export type PhotoAngle = 'front' | 'left' | 'right' | 'back' | 'extra'

export interface BodyPhoto {
  angle: PhotoAngle
  /** data URL ili blob URL — u produkciji bi bio URL sa storage-a */
  dataUrl: string
  uploadedAt: string
}

export interface Measurements {
  heightCm: number | null
  bustCm: number | null
  waistCm: number | null
  hipsCm: number | null
}

export interface BodyProfile {
  photos: BodyPhoto[]
  measurements: Measurements
  completed: boolean
}

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  provider: 'email' | 'google' | 'mock'
  createdAt: string
}

export type TryOnPose =
  | 'hodajući' // legacy (stari ormar) — mapira se na The Catwalk
  | 'poza-1'
  | 'poza-2'
  | 'poza-3'
  | 'poza-4'
  | 'poza-5'

/**
 * Sve poze imaju reference sliku (Grok uzima SAMO stil poziranja).
 * label = ime iz fajla posle crtice, bez "Poza N".
 */
export const TRY_ON_POSES: {
  id: TryOnPose
  label: string
  thumbnail: string
}[] = [
  { id: 'poza-5', label: 'The Catwalk', thumbnail: '/poses/poza-5.jpg' },
  { id: 'poza-1', label: 'Head-Hip', thumbnail: '/poses/poza-1.png' },
  { id: 'poza-2', label: 'Soft Hip', thumbnail: '/poses/poza-2.png' },
  { id: 'poza-3', label: 'Lookback', thumbnail: '/poses/poza-3.png' },
  { id: 'poza-4', label: 'Casual Front', thumbnail: '/poses/poza-4.png' },
]

export type ViewAngle = 'front' | 'angle45' | 'side' | 'back' | 'angle135'

export const VIEW_ANGLES: { id: ViewAngle; label: string }[] = [
  { id: 'front', label: 'Napred' },
  { id: 'angle45', label: '45°' },
  { id: 'side', label: 'Strana' },
  { id: 'angle135', label: '135°' },
  { id: 'back', label: 'Nazad' },
]

export interface TryOnResult {
  id: string
  createdAt: string
  pose: TryOnPose
  /** Izvor: URL proizvoda ili upload */
  sourceType: 'url' | 'upload'
  productUrl?: string
  clothingImageUrl: string
  productName?: string
  /** Mapirano po uglu — mock ili API rezultat */
  views: Partial<Record<ViewAngle, string>>
  recommendedSize?: string
  saved: boolean
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  priceRsd: number
  popular?: boolean
}

export interface SubscriptionPlan {
  id: string
  name: string
  monthlyCredits: number
  priceRsd: number
  description: string
}

export interface CreditsState {
  balance: number
  freeMonthly: number
  freeUsedThisMonth: number
  subscriptionId: string | null
  lastResetMonth: string // YYYY-MM
}
