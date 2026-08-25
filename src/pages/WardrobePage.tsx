import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useApp } from '../context/AppContext'
import { TRY_ON_POSES } from '../types'
import { getLookThumbnail } from '../services/lookImage'

export function WardrobePage() {
  const { wardrobe, removeLook } = useApp()

  return (
    <div>
      <PageHeader title="Ormar" subtitle="Tvoji sačuvani try-on lookovi" />

      <div className="px-4 pt-4">
        {wardrobe.length === 0 ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blush-100 text-2xl text-blush-500">
              ♡
            </div>
            <h2 className="mt-4 font-semibold text-ink-900">Ormar je prazan</h2>
            <p className="mt-1 max-w-xs text-sm text-ink-500">
              Kada sačuvaš try-on, pojaviće se ovde da možeš da se vratiš i uporediš lookove.
            </p>
            <Link to="/app/try-on" className="mt-5">
              <Button>Isprobaj nešto</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-6">
            {wardrobe.map((look) => {
              const poseLabel =
                TRY_ON_POSES.find((p) => p.id === look.pose)?.label ?? look.pose
              return (
                <div
                  key={look.id}
                  className="overflow-hidden rounded-3xl border border-blush-100 bg-white shadow-card"
                >
                  <Link to={`/app/ormar/${look.id}`}>
                    <div className="flex aspect-[3/4] items-center justify-center bg-blush-50">
                      {getLookThumbnail(look) ? (
                        <img
                          src={getLookThumbnail(look)!}
                          alt={look.productName ?? 'Look'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="px-2 text-center text-[11px] text-ink-400">
                          Slika istekla — otvori i napravi novi try-on
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="space-y-1.5 p-2.5">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {look.productName ?? 'Look'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone="ink">{poseLabel}</Badge>
                      {look.recommendedSize && (
                        <Badge tone="success">{look.recommendedSize}</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-400">
                      {new Date(look.createdAt).toLocaleDateString('sr-RS')}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeLook(look.id)}
                      className="text-xs font-medium text-red-500"
                    >
                      Obriši
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
