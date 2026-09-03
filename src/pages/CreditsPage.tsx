import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useApp } from '../context/AppContext'
import {
  BETA_TEST,
  CREDIT_PACKAGES,
  FREE_MONTHLY_CREDITS,
  PURCHASES_ENABLED,
  SUBSCRIPTION_PLANS,
  purchasePackage,
  subscribePlan,
} from '../services/credits'

export function CreditsPage() {
  const { credits, setCredits } = useApp()
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function buy(packageId: string) {
    if (!PURCHASES_ENABLED) {
      setMessage('Kupovina je zaključana tokom beta testa. Krediti su ograničeni za testiranje.')
      return
    }
    setLoading(packageId)
    setMessage('')
    try {
      const next = await purchasePackage(credits, packageId)
      setCredits(next)
      setMessage('Demo: krediti su dodati. Pravo plaćanje stiže kasnije.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Kupovina nije uspela.')
    } finally {
      setLoading(null)
    }
  }

  async function subscribe(planId: string) {
    if (!PURCHASES_ENABLED) {
      setMessage('Pretplata je zaključana tokom beta testa.')
      return
    }
    setLoading(planId)
    setMessage('')
    try {
      const next = await subscribePlan(credits, planId)
      setCredits(next)
      setMessage('Demo: pretplata aktivirana. Pravo plaćanje stiže kasnije.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Pretplata nije uspela.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <PageHeader title="Krediti" subtitle="Paketi i mesečna pretplata" backTo="/app" />

      <div className="space-y-4 px-4 pt-4 pb-8">
        <Card className="bg-gradient-to-br from-blush-500 to-blush-700 !border-0 text-white">
          <p className="text-sm text-white/80">Trenutno stanje</p>
          <p className="mt-1 font-display text-4xl font-semibold">{credits.balance}</p>
          <p className="mt-1 text-sm text-white/75">
            {BETA_TEST
              ? `Beta test · start ${FREE_MONTHLY_CREDITS} kredita · iskorišćeno: ${credits.freeUsedThisMonth}`
              : `${FREE_MONTHLY_CREDITS} besplatnih mesečno · iskorišćeno ovog meseca: ${credits.freeUsedThisMonth}`}
          </p>
        </Card>

        {!PURCHASES_ENABLED && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Trenutno ne možeš da kupiš dodatne kredite ni pretplatu. Kad nestanu, javi nam
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-blush-200 bg-blush-50 px-4 py-3 text-sm text-blush-800">
            {message}
          </div>
        )}

        <div>
          <h2 className="mb-2 px-1 font-semibold text-ink-900">Paketi kredita</h2>
          <div className="space-y-2">
            {CREDIT_PACKAGES.map((pack) => (
              <Card key={pack.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink-900">{pack.name}</p>
                    {pack.popular && <Badge>Popularno</Badge>}
                  </div>
                  <p className="text-sm text-ink-500">
                    {pack.credits} kredita · {pack.priceRsd.toLocaleString('sr-RS')} RSD
                  </p>
                </div>
                <Button
                  size="sm"
                  loading={loading === pack.id}
                  disabled={!PURCHASES_ENABLED}
                  onClick={() => buy(pack.id)}
                >
                  {PURCHASES_ENABLED ? 'Kupi' : 'Uskoro'}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 px-1 font-semibold text-ink-900">Mesečna pretplata</h2>
          <div className="space-y-2">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const active = credits.subscriptionId === plan.id
              return (
                <Card
                  key={plan.id}
                  className={active ? '!border-blush-400 bg-blush-50/50' : ''}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink-900">{plan.name}</p>
                        {active && <Badge tone="success">Aktivno</Badge>}
                      </div>
                      <p className="text-sm text-ink-500">{plan.description}</p>
                      <p className="mt-1 text-sm font-medium text-ink-800">
                        {plan.priceRsd.toLocaleString('sr-RS')} RSD / mesec
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={active ? 'outline' : 'primary'}
                      disabled={active || !PURCHASES_ENABLED}
                      loading={loading === plan.id}
                      onClick={() => subscribe(plan.id)}
                    >
                      {active ? 'Aktivno' : PURCHASES_ENABLED ? 'Pretplati se' : 'Uskoro'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-400">
          {PURCHASES_ENABLED
            ? 'Demo plaćanje — povezati Stripe ili lokalni payment provider'
            : 'Beta · plaćanje biće dostupno posle testa'}
        </p>
      </div>
    </div>
  )
}
