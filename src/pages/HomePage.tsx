import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useApp } from '../context/AppContext'

export function HomePage() {
  const { user, bodyProfile, credits, wardrobe } = useApp()
  const firstName = user?.name?.split(' ')[0] ?? 'ti'

  return (
    <div>
      <PageHeader
        title={`Zdravo, ${firstName}`}
        subtitle="Sprema za isprobavanje?"
        right={
          <Link
            to="/app/krediti"
            className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 shadow-card"
          >
            <span className="text-sm font-bold text-blush-600">{credits.balance}</span>
            <span className="text-xs text-ink-400">kredita</span>
          </Link>
        }
      />

      <div className="space-y-4 px-4 pt-5">
        {/* CTA try-on */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-blush-500 to-blush-700 !border-0 text-white">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-8 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative">
            <Badge tone="blush">
              <span className="text-blush-800">1 kredit = 1 try-on</span>
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-semibold">Isprobaj odeću sada</h2>
            <p className="mt-1 text-sm text-white/80">
              Nalepi link ili otpremi sliku — vidi kako ti stoji iz 360°.
            </p>
            <Link to="/app/try-on" className="mt-4 block">
              <Button
                fullWidth
                size="lg"
                className="!bg-white !text-blush-700 hover:!bg-blush-50"
              >
                Pokreni try-on
              </Button>
            </Link>
          </div>
        </Card>

        {/* Body profile status */}
        {!bodyProfile.completed ? (
          <Card>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                !
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-ink-900">Dovrši body profil</h3>
                <p className="mt-0.5 text-sm text-ink-500">
                  Fotke i mere su potrebne za tačan try-on.
                </p>
                <Link to="/onboarding" className="mt-3 inline-block">
                  <Button size="sm">Nastavi setup</Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink-900">Body profil spreman</h3>
                <p className="text-sm text-ink-500">
                  {bodyProfile.photos.length} fotki ·{' '}
                  {bodyProfile.measurements.heightCm ?? '—'} cm
                </p>
              </div>
              <Badge tone="success">OK</Badge>
            </div>
          </Card>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/app/ormar">
            <Card className="h-full">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Ormar</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">{wardrobe.length}</p>
              <p className="text-sm text-ink-500">sačuvanih lookova</p>
            </Card>
          </Link>
          <Link to="/app/krediti">
            <Card className="h-full">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Krediti</p>
              <p className="mt-1 text-2xl font-bold text-blush-600">{credits.balance}</p>
              <p className="text-sm text-ink-500">dostupno</p>
            </Card>
          </Link>
        </div>

        {/* Recent */}
        {wardrobe.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="font-semibold text-ink-900">Nedavno sačuvano</h3>
              <Link to="/app/ormar" className="text-sm font-medium text-blush-600">
                Vidi sve
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {wardrobe.slice(0, 5).map((look) => (
                <Link
                  key={look.id}
                  to={`/app/ormar/${look.id}`}
                  className="w-28 shrink-0 overflow-hidden rounded-2xl border border-blush-100 bg-white shadow-card"
                >
                  <div className="aspect-[3/4] bg-blush-100">
                    <img
                      src={Object.values(look.views).find((u) => typeof u === 'string' && u.length > 8) ?? look.clothingImageUrl}
                      alt={look.productName ?? 'Look'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="truncate px-2 py-1.5 text-xs font-medium text-ink-700">
                    {look.productName ?? 'Look'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
