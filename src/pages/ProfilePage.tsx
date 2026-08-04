import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useApp } from '../context/AppContext'
import { recommendSize } from '../services/sizeRecommend'
import { SUBSCRIPTION_PLANS } from '../services/credits'

export function ProfilePage() {
  const {
    user,
    bodyProfile,
    credits,
    logout,
    updateName,
    setMeasurements,
  } = useApp()
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [editingMeasures, setEditingMeasures] = useState(false)
  const [height, setHeight] = useState(bodyProfile.measurements.heightCm?.toString() ?? '')
  const [bust, setBust] = useState(bodyProfile.measurements.bustCm?.toString() ?? '')
  const [waist, setWaist] = useState(bodyProfile.measurements.waistCm?.toString() ?? '')
  const [hips, setHips] = useState(bodyProfile.measurements.hipsCm?.toString() ?? '')

  const size = recommendSize(bodyProfile.measurements)
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === credits.subscriptionId)

  function saveName() {
    if (name.trim()) {
      updateName(name.trim())
      setEditingName(false)
    }
  }

  function saveMeasures() {
    setMeasurements({
      heightCm: height ? Number(height) : null,
      bustCm: bust ? Number(bust) : null,
      waistCm: waist ? Number(waist) : null,
      hipsCm: hips ? Number(hips) : null,
    })
    setEditingMeasures(false)
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div>
      <PageHeader title="Profil" subtitle="Nalog, mere i pretplata" />

      <div className="space-y-4 px-4 pt-4 pb-8">
        {/* Account card */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blush-100 font-display text-xl font-semibold text-blush-700">
              {(user?.name?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  <Button size="sm" onClick={saveName}>
                    OK
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="font-semibold text-ink-900"
                    onClick={() => setEditingName(true)}
                  >
                    {user?.name} ✎
                  </button>
                  <p className="truncate text-sm text-ink-500">{user?.email}</p>
                </>
              )}
              <div className="mt-1">
                <Badge tone="ink">
                  {user?.provider === 'google' ? 'Google' : 'Email'} · demo
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Body profile */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Body profil</h2>
            {bodyProfile.completed ? (
              <Badge tone="success">Spreman</Badge>
            ) : (
              <Badge tone="warn">Nepotpuno</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {bodyProfile.photos.length} fotki · preporučena veličina:{' '}
            <strong>{size ?? '—'}</strong>
          </p>

          <div className="mt-3 flex gap-2 overflow-x-auto">
            {bodyProfile.photos.length === 0 ? (
              <p className="text-xs text-ink-400">Nema otpremljenih fotki</p>
            ) : (
              bodyProfile.photos.map((p) => (
                <img
                  key={p.angle}
                  src={p.dataUrl}
                  alt={p.angle}
                  className="h-20 w-14 rounded-xl object-cover"
                />
              ))
            )}
          </div>

          <Link to="/onboarding" className="mt-3 block">
            <Button fullWidth variant="outline" size="sm">
              {bodyProfile.completed ? 'Ažuriraj fotke' : 'Dovrši body profil'}
            </Button>
          </Link>
        </Card>

        {/* Measurements */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Mere (cm)</h2>
            <button
              type="button"
              className="text-sm font-medium text-blush-600"
              onClick={() => setEditingMeasures((v) => !v)}
            >
              {editingMeasures ? 'Otkaži' : 'Izmeni'}
            </button>
          </div>

          {editingMeasures ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Input label="Visina" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
              <Input label="Grudi" type="number" value={bust} onChange={(e) => setBust(e.target.value)} />
              <Input label="Struk" type="number" value={waist} onChange={(e) => setWaist(e.target.value)} />
              <Input label="Kukovi" type="number" value={hips} onChange={(e) => setHips(e.target.value)} />
              <div className="col-span-2">
                <Button fullWidth onClick={saveMeasures}>
                  Sačuvaj mere
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                ['Visina', bodyProfile.measurements.heightCm],
                ['Grudi', bodyProfile.measurements.bustCm],
                ['Struk', bodyProfile.measurements.waistCm],
                ['Kukovi', bodyProfile.measurements.hipsCm],
              ].map(([label, val]) => (
                <div key={label as string} className="rounded-2xl bg-blush-50 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
                  <p className="font-semibold text-ink-900">{val ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Credits & subscription */}
        <Card>
          <h2 className="font-semibold text-ink-900">Krediti i pretplata</h2>
          <p className="mt-1 text-sm text-ink-500">
            Stanje: <strong className="text-blush-600">{credits.balance}</strong> ·{' '}
            {plan ? `Plan: ${plan.name}` : 'Bez pretplate'}
          </p>
          <Link to="/app/krediti" className="mt-3 block">
            <Button fullWidth variant="outline" size="sm">
              Upravljaj kreditima
            </Button>
          </Link>
        </Card>

        <Button fullWidth variant="ghost" onClick={handleLogout}>
          Odjavi se
        </Button>

        <p className="text-center text-[11px] text-ink-400">
          OBUCI ME MVP · mock auth · podaci lokalno u pregledaču
        </p>
      </div>
    </div>
  )
}
