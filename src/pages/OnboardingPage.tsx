import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import type { BodyPhoto, PhotoAngle } from '../types'

const ANGLES: { angle: PhotoAngle; label: string; required: boolean }[] = [
  { angle: 'front', label: 'Napred', required: true },
  { angle: 'left', label: 'Levo', required: true },
  { angle: 'right', label: 'Desno', required: true },
  { angle: 'back', label: 'Nazad', required: true },
  { angle: 'extra', label: 'Dodatna', required: false },
]

const PHOTO_TIPS = [
  'Stoj uspravno, u udobnoj odeći koja prati telo',
  'Dobro osvetljenje (dnevno svetlo je najbolje)',
  'Jednobojna, mirna pozadina',
  'Cela figura u kadru — od glave do stopala',
  'Bez jakih senki na telu',
]

export function OnboardingPage() {
  const { user, isReady, bodyProfile, setPhotos, setMeasurements, markBodyComplete } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [photos, setLocalPhotos] = useState<BodyPhoto[]>(bodyProfile.photos)
  const [height, setHeight] = useState(bodyProfile.measurements.heightCm?.toString() ?? '')
  const [bust, setBust] = useState(bodyProfile.measurements.bustCm?.toString() ?? '')
  const [waist, setWaist] = useState(bodyProfile.measurements.waistCm?.toString() ?? '')
  const [hips, setHips] = useState(bodyProfile.measurements.hipsCm?.toString() ?? '')

  if (isReady && !user) {
    return <Navigate to="/prijava" replace />
  }

  function handleFile(angle: PhotoAngle, file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setLocalPhotos((prev) => {
        const rest = prev.filter((p) => p.angle !== angle)
        return [
          ...rest,
          { angle, dataUrl, uploadedAt: new Date().toISOString() },
        ]
      })
    }
    reader.readAsDataURL(file)
  }

  function savePhotosAndNext() {
    setPhotos(photos)
    setStep(3)
  }

  function finish() {
    const measurements = {
      heightCm: height ? Number(height) : null,
      bustCm: bust ? Number(bust) : null,
      waistCm: waist ? Number(waist) : null,
      hipsCm: hips ? Number(hips) : null,
    }
    setPhotos(photos)
    setMeasurements(measurements)
    markBodyComplete()
    navigate('/app')
  }

  const requiredDone = ANGLES.filter((a) => a.required).every((a) =>
    photos.some((p) => p.angle === a.angle),
  )

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-blush-50 pb-10">
      <PageHeader
        title={
          step === 1 ? 'Tvoje telo' : step === 2 ? 'Tvoje fotke' : 'Tvoje mere'
        }
        subtitle={`Korak ${step} od 3`}
        backTo={step === 1 ? '/app' : undefined}
      />

      {/* Progress */}
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
                Trebaće ti <strong>3–5 full-body fotki</strong> iz različitih uglova. Fotke
                ostaju privatne i koriste se samo za try-on.
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
              Otpremi najmanje 4 ugla (napred, levo, desno, nazad). Dodatna je opciona.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ANGLES.map(({ angle, label, required }) => {
                const existing = photos.find((p) => p.angle === angle)
                return (
                  <label
                    key={angle}
                    className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-blush-200 bg-white transition hover:border-blush-400"
                  >
                    {existing ? (
                      <img
                        src={existing.dataUrl}
                        alt={label}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <span className="text-2xl text-blush-300">+</span>
                        <span className="mt-1 text-sm font-medium text-ink-600">{label}</span>
                        {required && (
                          <span className="mt-0.5 text-[10px] text-ink-400">obavezno</span>
                        )}
                      </>
                    )}
                    {existing && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                        {label}
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFile(angle, e.target.files?.[0] ?? null)}
                    />
                  </label>
                )
              })}
            </div>
            <Button fullWidth size="lg" disabled={!requiredDone} onClick={savePhotosAndNext}>
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
