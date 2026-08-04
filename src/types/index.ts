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
  | 'stojeći-front'
  | 'stojeći-bočno'
  | 'hodajući'
  | 'ruke-u-bok'
  | 'sedeći'

export const TRY_ON_POSES: { id: TryOnPose; label: string; description: string }[] = [
  { id: 'stojeći-front', label: 'Stojeći napred', description: 'Klasičan frontalni pogled' },
  { id: 'stojeći-bočno', label: 'Stojeći sa strane', description: 'Profil tela' },
  { id: 'hodajući', label: 'Hodajući', description: 'Dinamičan korak' },
  { id: 'ruke-u-bok', label: 'Ruke u bok', description: 'Samouverena poza' },
  { id: 'sedeći', label: 'Sedeći', description: 'Opuštena poza' },
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
