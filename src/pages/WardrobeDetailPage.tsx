import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { TRY_ON_POSES } from '../types'
import { collectLookViews } from '../services/lookImage'

export function WardrobeDetailPage() {
  const { id } = useParams()
  const { wardrobe, removeLook } = useApp()
  const look = wardrobe.find((l) => l.id === id)
  const [viewIndex, setViewIndex] = useState(0)

  if (!look) {
    return <Navigate to="/app/ormar" replace />
  }

  const viewEntries = collectLookViews(look)
  const current = viewEntries[viewIndex]
  const poseLabel = TRY_ON_POSES.find((p) => p.id === look.pose)?.label ?? look.pose

  return (
    <div>
      <PageHeader
        title={look.productName ?? 'Look'}
        subtitle={poseLabel}
        backTo="/app/ormar"
      />

      <div className="space-y-4 px-4 pt-4 pb-8">
        <Card padding={false} className="overflow-hidden">
          <div className="relative aspect-[3/4] bg-blush-100">
            {current ? (
              <img
                src={current[1]}
                alt={String(current[0])}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="text-sm font-medium text-ink-700">Try-on slika nije sačuvana</p>
                <p className="text-xs text-ink-400">
                  Stariji lookovi su imali privremeni link koji je istekao. Napravi novi try-on i
                  sačuvaj ponovo.
                </p>
              </div>
            )}
            {viewEntries.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-card"
                  onClick={() =>
                    setViewIndex((i) => (i - 1 + viewEntries.length) % viewEntries.length)
                  }
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-card"
                  onClick={() => setViewIndex((i) => (i + 1) % viewEntries.length)}
                >
                  ›
                </button>
              </>
            )}
          </div>
          {viewEntries.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {viewEntries.map(([key, url], i) => (
                <button
                  key={String(key)}
                  type="button"
                  onClick={() => setViewIndex(i)}
                  className={[
                    'h-16 w-12 shrink-0 overflow-hidden rounded-xl border-2',
                    i === viewIndex ? 'border-blush-500' : 'border-transparent opacity-70',
                  ].join(' ')}
                >
                  <img src={url} alt={String(key)} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-wrap gap-2">
          <Badge>{poseLabel}</Badge>
          {look.recommendedSize && (
            <Badge tone="success">Preporuka: {look.recommendedSize}</Badge>
          )}
          <Badge tone="ink">{new Date(look.createdAt).toLocaleString('sr-RS')}</Badge>
        </div>

        {look.productUrl && (
          <a
            href={look.productUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm text-blush-600 underline"
          >
            {look.productUrl}
          </a>
        )}

        <Link to="/app/try-on">
          <Button fullWidth>Novi try-on</Button>
        </Link>
        <Button
          fullWidth
          variant="danger"
          onClick={() => {
            removeLook(look.id)
          }}
        >
          Obriši iz ormara
        </Button>
      </div>
    </div>
  )
}
