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
  | 'hodajući'
  | 'poza-1'
  | 'poza-2'
  | 'poza-3'
  | 'poza-4'

/** thumbnail = putanja u /public (null = nema pose-slike, samo tekst) */
export const TRY_ON_POSES: {
  id: TryOnPose
  label: string
  description: string
  thumbnail: string | null
}[] = [
  {
    id: 'hodajući',
    label: 'Hodajući napred',
    description: 'Korak ka kameri — bez pose-slike, samo tekst',
    thumbnail: null,
  },
  {
    id: 'poza-1',
    label: 'Poza 1',
    description: 'Stojeći, ruka uz lice',
    thumbnail: '/poses/poza-1.png',
  },
  {
    id: 'poza-2',
    label: 'Poza 2',
    description: 'Profil, ruka uz kosu',
    thumbnail: '/poses/poza-2.png',
  },
  {
    id: 'poza-3',
    label: 'Poza 3',
    description: 'Sedeći, pogled preko ramena',
    thumbnail: '/poses/poza-3.png',
  },
  {
    id: 'poza-4',
    label: 'Poza 4',
    description: 'Čučeći / sedeći na podu',
    thumbnail: '/poses/poza-4.png',
  },
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
