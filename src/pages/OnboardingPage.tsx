import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import type { BodyPhoto, PhotoAngle } from '../types'

const ANGLES: {
  angle: PhotoAngle
  label: string
  hint: string
  example: string
  required: boolean
}[] = [
  {
    angle: 'front',
    label: 'Napred',
    hint: 'Gledaš pravo u kameru',
    example: '/onboarding/front.jpg?v=3',
    required: true,
  },
  {
    angle: 'left',
    label: 'Levo',
    hint: 'Tvoj levi bok ka kameri (profil)',
    example: '/onboarding/left.jpg?v=3',
    required: true,
  },
  {
    angle: 'right',
    label: 'Desno',
    hint: 'Tvoj desni bok ka kameri (profil)',
    example: '/onboarding/right.jpg?v=3',
    required: true,
  },
  {
    angle: 'back',
    label: 'Nazad',
    hint: 'Leđa ka kameri, glava odvraćena',
    example: '/onboarding/back.jpg?v=3',
    required: true,
  },
]

const PHOTO_TIPS = [
  'Stoj uspravno, u udobnoj odeći koja prati telo',
  'Dobro osvetljenje (dnevno svetlo je najbolje)',
  'Jednobojna, mirna pozadina',
  'Cela figura u kadru — od glave do stopala',
  'Bez jakih senki na telu',
]

/** Kompresija da localStorage ne pukne (roze prazan ekran). */
async function compressPhotoFile(file: File, maxEdge = 1024, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // fallback FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

export function OnboardingPage() {
  const { user, isReady, bodyProfile, setPhotos, setMeasurements, markBodyComplete } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [photos, setLocalPhotos] = useState<BodyPhoto[]>(
    () => bodyProfile.photos.filter((p) => p.angle !== 'extra'),
  )
  const [height, setHeight] = useState(bodyProfile.measurements.heightCm?.toString() ?? '')
  const [bust, setBust] = useState(bodyProfile.measurements.bustCm?.toString() ?? '')
  const [waist, setWaist] = useState(bodyProfile.measurements.waistCm?.toString() ?? '')
  const [hips, setHips] = useState(bodyProfile.measurements.hipsCm?.toString() ?? '')
  const [busyAngle, setBusyAngle] = useState<PhotoAngle | null>(null)
  const [error, setError] = useState('')

  if (isReady && !user) {
    return <Navigate to="/prijava" replace />
  }

  async function handleFile(angle: PhotoAngle, file: File | null) {
    if (!file) return
    setError('')
    setBusyAngle(angle)
    try {
      const dataUrl = await compressPhotoFile(file)
      setLocalPhotos((prev) => {
        const rest = prev.filter((p) => p.angle !== angle)
        return [...rest, { angle, dataUrl, uploadedAt: new Date().toISOString() }]
      })
    } catch {
      setError('Slika nije učitana. Probaj manju fotografiju.')
    } finally {
      setBusyAngle(null)
    }
  }

  function savePhotosAndNext() {
    setError('')
    try {
      setPhotos(photos)
      // Odloži step da React stigne da snimi state bez crash-a
      requestAnimationFrame(() => setStep(3))
    } catch {
      setError('Fotke su prevelike za čuvanje. Probaj ponovo (kompresujemo ih automatski).')
    }
  }

  function finish() {
    const measurements = {
      heightCm: height ? Number(height) : null,
      bustCm: bust ? Number(bust) : null,
      waistCm: waist ? Number(waist) : null,
      hipsCm: hips ? Number(hips) : null,
    }
    try {
      setPhotos(photos)
      setMeasurements(measurements)
      markBodyComplete()
      navigate('/app')
    } catch {
      setError('Greška pri čuvanju. Probaj ponovo.')
    }
  }

  const requiredDone = ANGLES.filter((a) => a.required).every((a) =>
    photos.some((p) => p.angle === a.angle),
  )

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-blush-50 pb-10">
      <PageHeader
        title={step === 1 ? 'Tvoje telo' : step === 2 ? 'Tvoje fotke' : 'Tvoje mere'}
        subtitle={`Korak ${step} od 3`}
        backTo={step === 1 ? '/app' : undefined}
      />

      <div className="flex gap-2 px-5 pt-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-blush-500' : 'bg-blush-200'}`}
          />
        ))}
      </div>

      <div className="px-5 pt-6">
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <h2 className="font-semibold text-ink-900">Kako da se lepo fotografišeš</h2>
              <ul className="mt-3 space-y-2.5">
                {PHOTO_TIPS.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-ink-600">
                    <span className="mt-0.5 text-blush-500">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="bg-blush-50/50">
              <p className="text-sm text-ink-600">
                Trebaće ti <strong>4 full-body fotke</strong>: napred, levo, desno i nazad. Na
                sledećem koraku vidiš primer za svaki ugao. Fotke ostaju privatne.
              </p>
            </Card>
            <Button fullWidth size="lg" onClick={() => setStep(2)}>
              Razumem, nastavi
            </Button>
            <Button fullWidth variant="ghost" onClick={() => navigate('/app')}>
              Preskoči za sada
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              Za svaki ugao: pogledaj <strong>primer</strong>, pa izaberi iz galerije ili kameru.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ANGLES.map(({ angle, label, hint, example }) => {
                const existing = photos.find((p) => p.angle === angle)
                const galleryId = `photo-gallery-${angle}`
                const cameraId = `photo-camera-${angle}`
                return (
                  <div
                    key={angle}
                    className="overflow-hidden rounded-3xl border border-blush-100 bg-white shadow-card"
                  >
                    <div className="relative aspect-[3/4] bg-blush-50">
                      <img
                        src={existing?.dataUrl ?? example}
                        alt={existing ? label : `Primer: ${label}`}
                        className={[
                          'h-full w-full object-cover',
                          existing ? '' : 'opacity-90',
                        ].join(' ')}
                      />
                      {!existing && (
                        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                          PRIMER
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                        {label}
                      </span>
                      {busyAngle === angle && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-xs font-medium text-ink-700">
                          Učitavam…
                        </div>
                      )}
                    </div>
                    <p className="px-2 pt-1.5 text-[10px] leading-snug text-ink-400">{hint}</p>
                    <div className="mt-1 grid grid-cols-2 gap-px border-t border-blush-100 bg-blush-100">
                      <label
                        htmlFor={galleryId}
                        className="cursor-pointer bg-white px-1 py-2.5 text-center text-[11px] font-semibold text-blush-700 active:bg-blush-50"
                      >
                        Galerija
                      </label>
                      <label
                        htmlFor={cameraId}
                        className="cursor-pointer bg-white px-1 py-2.5 text-center text-[11px] font-semibold text-ink-700 active:bg-blush-50"
                      >
                        Kamera
                      </label>
                    </div>
                    <input
                      id={galleryId}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void handleFile(angle, e.target.files?.[0] ?? null)
                        e.target.value = ''
                      }}
                    />
                    <input
                      id={cameraId}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        void handleFile(angle, e.target.files?.[0] ?? null)
                        e.target.value = ''
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button fullWidth size="lg" disabled={!requiredDone || !!busyAngle} onClick={savePhotosAndNext}>
              Sačuvaj fotke i nastavi
            </Button>
            <Button fullWidth variant="ghost" onClick={() => setStep(1)}>
              Nazad
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              Unesi mere u centimetrima. Koristimo ih za try-on i preporuku veličine.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Visina (cm)"
                type="number"
                inputMode="numeric"
                placeholder="168"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
              <Input
                label="Grudi (cm)"
                type="number"
                inputMode="numeric"
                placeholder="88"
                value={bust}
                onChange={(e) => setBust(e.target.value)}
              />
              <Input
                label="Struk (cm)"
                type="number"
                inputMode="numeric"
                placeholder="70"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
              />
              <Input
                label="Kukovi (cm)"
                type="number"
                inputMode="numeric"
                placeholder="96"
                value={hips}
                onChange={(e) => setHips(e.target.value)}
              />
            </div>
            <Card className="bg-cream-100">
              <p className="text-xs text-ink-500">
                Savet: meri preko tanke majice, traka paralelno sa podom. Ako nisi sigurna,
                možeš kasnije da izmeniš u profilu.
              </p>
            </Card>
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button
              fullWidth
              size="lg"
              onClick={finish}
              disabled={!height || !bust || !waist || !hips}
            >
              Završi i kreni
            </Button>
            <Button fullWidth variant="ghost" onClick={() => setStep(2)}>
              Nazad
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
