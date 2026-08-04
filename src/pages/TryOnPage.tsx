import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useApp } from '../context/AppContext'
import { extractProductFromUrl } from '../services/productUrl'
import { generateTryOn } from '../services/tryOnApi'
import { TRY_ON_COST, canAffordTryOn } from '../services/credits'
import { TRY_ON_POSES, type TryOnPose, type TryOnResult } from '../types'

type SourceMode = 'url' | 'upload'

export function TryOnPage() {
  const { bodyProfile, credits, spendTryOnCredit, saveLook } = useApp()
  const navigate = useNavigate()

  const [mode, setMode] = useState<SourceMode>('url')
  const [productUrl, setProductUrl] = useState('')
  const [clothingImage, setClothingImage] = useState<string | null>(null)
  const [productName, setProductName] = useState<string | undefined>()
  const [extractMsg, setExtractMsg] = useState<string | null>(null)
  const [pose, setPose] = useState<TryOnPose>('stojeći-front')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'setup' | 'result'>('setup')
  const [result, setResult] = useState<TryOnResult | null>(null)
  const [viewIndex, setViewIndex] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const viewEntries = result
    ? (Object.entries(result.views) as [string, string][]).filter(([, url]) => !!url)
    : []

  async function handleExtractUrl(e: FormEvent) {
    e.preventDefault()
    setError('')
    setExtractMsg(null)
    setLoading(true)
    try {
      // PLACEHOLDER: productUrl.extractProductFromUrl
      const extracted = await extractProductFromUrl(productUrl)
      if (!extracted.extracted || !extracted.imageUrl) {
        setError(extracted.message ?? 'Nismo uspeli da izvučemo sliku.')
        return
      }
      setClothingImage(extracted.imageUrl)
      setProductName(extracted.productName)
      setExtractMsg(extracted.message ?? null)
    } catch {
      setError('Greška pri obradi linka.')
    } finally {
      setLoading(false)
    }
  }

  function handleUpload(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setClothingImage(reader.result as string)
      setProductName(file.name.replace(/\.[^.]+$/, ''))
      setExtractMsg(null)
      setProductUrl('')
    }
    reader.readAsDataURL(file)
  }

  async function handleGenerate() {
    setError('')
    if (!clothingImage) {
      setError('Prvo dodaj odeću (link ili slika).')
      return
    }
    if (!bodyProfile.completed && bodyProfile.photos.length < 3) {
      setError('Dovrši body profil (fotke + mere) pre try-on-a.')
      return
    }
    if (!canAffordTryOn(credits)) {
      setError('Nemaš dovoljno kredita. Dopuni paket ili pretplatu.')
      return
    }

    setLoading(true)
    try {
      spendTryOnCredit()
      // PLACEHOLDER: tryOnApi.generateTryOn — spoljašnji Virtual Try-On API
      const tryOnResult = await generateTryOn({
        bodyPhotos: bodyProfile.photos,
        measurements: bodyProfile.measurements,
        pose,
        clothingImageUrl: clothingImage,
        productUrl: mode === 'url' ? productUrl : undefined,
        productName,
        sourceType: mode,
      })
      setResult(tryOnResult)
      setViewIndex(0)
      setSaved(false)
      setPhase('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generisanje nije uspelo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePoseAndRegenerate(newPose: TryOnPose) {
    setPose(newPose)
    if (!clothingImage || !result) return
    if (!canAffordTryOn(credits)) {
      setError('Nemaš dovoljno kredita za novu generaciju.')
      return
    }
    setLoading(true)
    setError('')
    try {
      spendTryOnCredit()
      const tryOnResult = await generateTryOn({
        bodyPhotos: bodyProfile.photos,
        measurements: bodyProfile.measurements,
        pose: newPose,
        clothingImageUrl: clothingImage,
        productUrl: result.productUrl,
        productName: result.productName,
        sourceType: result.sourceType,
      })
      setResult(tryOnResult)
      setViewIndex(0)
      setSaved(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generisanje nije uspelo.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!result) return
    saveLook(result)
    setSaved(true)
  }

  if (phase === 'result' && result) {
    const currentView = viewEntries[viewIndex]

    return (
      <div>
        <PageHeader
          title="Tvoj try-on"
          subtitle={result.productName}
          backTo={undefined}
          right={
            result.recommendedSize && (
              <Badge tone="success">Veličina {result.recommendedSize}</Badge>
            )
          }
        />

        <div className="space-y-4 px-4 pt-4">
          {/* 360 carousel */}
          <Card padding={false} className="overflow-hidden">
            <div className="relative aspect-[3/4] bg-blush-100">
              {currentView && (
                <img
                  src={currentView[1]}
                  alt={`Pogled ${currentView[0]}`}
                  className="h-full w-full object-cover"
                />
              )}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-blush-300 border-t-blush-600" />
                  <p className="mt-3 text-sm text-ink-600">Generišem novu pozu…</p>
                </div>
              )}
              <button
                type="button"
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-card"
                onClick={() =>
                  setViewIndex((i) => (i - 1 + viewEntries.length) % viewEntries.length)
                }
                aria-label="Prethodni ugao"
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-card"
                onClick={() => setViewIndex((i) => (i + 1) % viewEntries.length)}
                aria-label="Sledeći ugao"
              >
                ›
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3">
              {viewEntries.map(([key, url], i) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewIndex(i)}
                  className={[
                    'h-16 w-12 shrink-0 overflow-hidden rounded-xl border-2',
                    i === viewIndex ? 'border-blush-500' : 'border-transparent opacity-70',
                  ].join(' ')}
                >
                  <img src={url} alt={key} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <p className="px-3 pb-3 text-center text-xs text-ink-400">
              360° pogled — prevuci ili dodirni uglove (napred, 45°, strana, nazad…)
            </p>
          </Card>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Change pose */}
          <div>
            <h3 className="mb-2 px-1 text-sm font-semibold text-ink-800">Promeni pozu</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TRY_ON_POSES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleChangePoseAndRegenerate(p.id)}
                  className={[
                    'shrink-0 rounded-2xl border px-3 py-2 text-left text-xs transition',
                    pose === p.id
                      ? 'border-blush-500 bg-blush-50 text-blush-800'
                      : 'border-ink-100 bg-white text-ink-600',
                  ].join(' ')}
                >
                  <span className="block font-semibold">{p.label}</span>
                  <span className="text-ink-400">{TRY_ON_COST} kr.</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pb-4">
            <Button fullWidth size="lg" onClick={handleSave} disabled={saved}>
              {saved ? 'Sačuvano u ormar ✓' : 'Sačuvaj u ormar'}
            </Button>
            {saved && (
              <Button fullWidth variant="outline" onClick={() => navigate('/app/ormar')}>
                Otvori ormar
              </Button>
            )}
            <Button
              fullWidth
              variant="ghost"
              onClick={() => {
                setPhase('setup')
                setResult(null)
              }}
            >
              Novi try-on
            </Button>
          </div>

          <p className="pb-6 text-center text-[11px] text-ink-400">
            {/* TODO marker for API */}
            Demo rezultat — Virtual Try-On API biće povezan u services/tryOnApi.ts
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Isprobaj"
        subtitle={`${credits.balance} kredita · ${TRY_ON_COST} po generaciji`}
      />

      <div className="space-y-5 px-4 pt-4">
        {/* Source mode toggle */}
        <div className="flex rounded-2xl bg-white p-1 shadow-card">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={[
              'flex-1 rounded-xl py-2.5 text-sm font-semibold transition',
              mode === 'url' ? 'bg-blush-500 text-white' : 'text-ink-500',
            ].join(' ')}
          >
            Link proizvoda
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={[
              'flex-1 rounded-xl py-2.5 text-sm font-semibold transition',
              mode === 'upload' ? 'bg-blush-500 text-white' : 'text-ink-500',
            ].join(' ')}
          >
            Upload slike
          </button>
        </div>

        {mode === 'url' ? (
          <Card>
            <form onSubmit={handleExtractUrl} className="space-y-3">
              <Input
                label="URL proizvoda"
                type="url"
                placeholder="https://prodavnica.com/proizvod/..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                hint="Nalepi link sa bilo koje online prodavnice"
              />
              <Button type="submit" fullWidth loading={loading} disabled={!productUrl.trim()}>
                Izvuci sliku proizvoda
              </Button>
            </form>
            {extractMsg && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {extractMsg}
              </p>
            )}
          </Card>
        ) : (
          <Card>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blush-200 bg-blush-50/50 py-10 transition hover:border-blush-400">
              <span className="text-3xl text-blush-400">↑</span>
              <span className="mt-2 text-sm font-medium text-ink-700">
                Otpremi sliku odeće
              </span>
              <span className="mt-1 text-xs text-ink-400">PNG, JPG · najbolje na beloj pozadini</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
              />
            </label>
          </Card>
        )}

        {/* Preview clothing */}
        {clothingImage && (
          <Card className="flex items-center gap-3">
            <img
              src={clothingImage}
              alt="Odeća"
              className="h-20 w-16 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">
                {productName ?? 'Odeća spremna'}
              </p>
              <p className="text-xs text-ink-400">Spremno za try-on</p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-blush-600"
              onClick={() => {
                setClothingImage(null)
                setProductName(undefined)
              }}
            >
              Ukloni
            </button>
          </Card>
        )}

        {/* Pose picker */}
        <div>
          <h3 className="mb-2 px-1 text-sm font-semibold text-ink-800">Izaberi pozu</h3>
          <div className="grid grid-cols-1 gap-2">
            {TRY_ON_POSES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPose(p.id)}
                className={[
                  'flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
                  pose === p.id
                    ? 'border-blush-500 bg-blush-50'
                    : 'border-ink-100 bg-white',
                ].join(' ')}
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{p.label}</p>
                  <p className="text-xs text-ink-400">{p.description}</p>
                </div>
                <div
                  className={[
                    'flex h-5 w-5 items-center justify-center rounded-full border-2',
                    pose === p.id ? 'border-blush-500 bg-blush-500' : 'border-ink-200',
                  ].join(' ')}
                >
                  {pose === p.id && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          loading={loading}
          disabled={!clothingImage}
          onClick={handleGenerate}
        >
          {loading ? 'Generišem…' : `Generiši try-on (${TRY_ON_COST} kredit)`}
        </Button>

        {!bodyProfile.completed && (
          <Card className="bg-amber-50/80 !border-amber-100">
            <p className="text-sm text-amber-900">
              Body profil nije kompletan.{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => navigate('/onboarding')}
              >
                Dovrši sada
              </button>
            </p>
          </Card>
        )}

        <p className="pb-6 text-center text-[11px] text-ink-400">
          Placeholdere: services/productUrl.ts · services/tryOnApi.ts
        </p>
      </div>
    </div>
  )
}
