import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { Navigate } from 'react-router-dom'

export function LandingPage() {
  const { user, isReady } = useApp()

  if (isReady && user) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blush-100 via-blush-50 to-cream-100">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-8 pt-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blush-500 text-white shadow-soft">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8l2 4-6 11L6 8l2-4Z" />
            </svg>
          </div>
          <span className="font-display text-xl font-semibold tracking-wide text-ink-900">
            OBUCI ME
          </span>
        </div>

        {/* Hero */}
        <div className="mt-12 flex flex-1 flex-col">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-600">
            Virtuelni try-on
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            Vidi kako ti stoji
            <span className="text-blush-600"> pre kupovine</span>
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-500">
            Nalepi link odeće sa bilo koje prodavnice, unesi svoje mere i fotke — mi ti
            pokazujemo kako izgleda na tebi, iz više uglova.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {['360° pogled', '5 poza', 'Preporuka veličine', 'Lični ormar'].map((f) => (
              <span
                key={f}
                className="rounded-full border border-blush-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-ink-600 backdrop-blur"
              >
                {f}
              </span>
            ))}
          </div>

          {/* Visual mock card */}
          <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-white/60 bg-white/50 p-5 shadow-soft backdrop-blur">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blush-200/40 blur-2xl" />
            <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-blush-300/30 blur-2xl" />
            <div className="relative grid grid-cols-3 gap-3">
              {['Napred', '45°', 'Strana'].map((label, i) => (
                <div
                  key={label}
                  className="aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-blush-100 to-blush-200"
                  style={{ opacity: 1 - i * 0.12 }}
                >
                  <div className="flex h-full flex-col items-center justify-end p-2">
                    <div className="mb-auto mt-6 h-10 w-10 rounded-full bg-white/50" />
                    <div className="mb-2 h-16 w-12 rounded-t-full bg-white/40" />
                    <span className="text-[10px] font-medium text-blush-800/70">{label}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="relative mt-4 text-center text-xs text-ink-400">
              Primer 360° pregleda try-on rezultata
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-3">
          <Link to="/registracija">
            <Button fullWidth size="lg">
              Kreiraj nalog besplatno
            </Button>
          </Link>
          <Link to="/prijava">
            <Button fullWidth size="lg" variant="outline">
              Već imam nalog
            </Button>
          </Link>
          <p className="text-center text-xs text-ink-400">
            5 besplatnih try-on-a mesečno · Bez instalacije iz prodavnice
          </p>
        </div>
      </div>
    </div>
  )
}
