/**
 * Krediti i pretplata — lokalni mock za MVP.
 *
 * TODO: Backend + Stripe / local payment provider
 */

import type { CreditPackage, CreditsState, SubscriptionPlan } from '../types'

export const FREE_MONTHLY_CREDITS = 5
export const TRY_ON_COST = 1

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pack-10', name: 'Starter', credits: 10, priceRsd: 490 },
  { id: 'pack-30', name: 'Popularni', credits: 30, priceRsd: 1190, popular: true },
  { id: 'pack-100', name: 'Premium', credits: 100, priceRsd: 3490 },
]

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'sub-basic',
    name: 'Basic',
    monthlyCredits: 20,
    priceRsd: 990,
    description: '20 try-on-a mesečno',
  },
  {
    id: 'sub-plus',
    name: 'Plus',
    monthlyCredits: 60,
    priceRsd: 1990,
    description: '60 try-on-a mesečno + prioritet',
  },
]

const CREDITS_KEY = 'obuci-me:credits'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function defaultCredits(): CreditsState {
  return {
    balance: FREE_MONTHLY_CREDITS,
    freeMonthly: FREE_MONTHLY_CREDITS,
    freeUsedThisMonth: 0,
    subscriptionId: null,
    lastResetMonth: currentMonth(),
  }
}

export function loadCredits(): CreditsState {
  try {
    const raw = localStorage.getItem(CREDITS_KEY)
    if (!raw) return defaultCredits()
    const state = JSON.parse(raw) as CreditsState
    return maybeResetMonthly(state)
  } catch {
    return defaultCredits()
  }
}

export function saveCredits(state: CreditsState) {
  localStorage.setItem(CREDITS_KEY, JSON.stringify(state))
}

/** Resetuje besplatne mesečne kredite na početku meseca */
function maybeResetMonthly(state: CreditsState): CreditsState {
  const month = currentMonth()
  if (state.lastResetMonth === month) return state

  const next: CreditsState = {
    ...state,
    freeUsedThisMonth: 0,
    lastResetMonth: month,
    // Dodaj free monthly kredite (ne resetuj kupljene)
    balance: state.balance + state.freeMonthly,
  }
  saveCredits(next)
  return next
}

export function canAffordTryOn(state: CreditsState): boolean {
  return state.balance >= TRY_ON_COST
}

export function spendCredit(state: CreditsState): CreditsState {
  if (!canAffordTryOn(state)) {
    throw new Error('Nemaš dovoljno kredita.')
  }
  const next: CreditsState = {
    ...state,
    balance: state.balance - TRY_ON_COST,
    freeUsedThisMonth: Math.min(state.freeMonthly, state.freeUsedThisMonth + 1),
  }
  saveCredits(next)
  return next
}

/**
 * Mock kupovina paketa kredita.
 * TODO: Stripe Checkout / local payment
 */
export async function purchasePackage(
  state: CreditsState,
  packageId: string,
): Promise<CreditsState> {
  await delay(900)
  const pack = CREDIT_PACKAGES.find((p) => p.id === packageId)
  if (!pack) throw new Error('Paket nije pronađen.')
  const next: CreditsState = {
    ...state,
    balance: state.balance + pack.credits,
  }
  saveCredits(next)
  return next
}

/**
 * Mock pretplata.
 * TODO: Stripe Subscriptions
 */
export async function subscribePlan(
  state: CreditsState,
  planId: string,
): Promise<CreditsState> {
  await delay(900)
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
  if (!plan) throw new Error('Plan nije pronađen.')
  const next: CreditsState = {
    ...state,
    subscriptionId: planId,
    freeMonthly: plan.monthlyCredits,
    balance: state.balance + plan.monthlyCredits,
  }
  saveCredits(next)
  return next
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
