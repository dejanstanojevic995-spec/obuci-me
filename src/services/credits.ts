/**
 * Krediti i pretplata — lokalni mock za MVP / beta.
 *
 * TODO: Backend + Stripe / local payment provider
 */

import type { CreditPackage, CreditsState, SubscriptionPlan } from '../types'

/**
 * BETA TEST — kupovina i pretplata zaključani.
 * Svaka testerka (po telefonu/browseru) dobija BETA_STARTING_CREDITS.
 * Kad Stripe bude spreman: PURCHASES_ENABLED = true, BETA_TEST = false.
 */
export const BETA_TEST = true
export const PURCHASES_ENABLED = false
export const BETA_STARTING_CREDITS = 30

/** Bump kad hoćeš da svima resetuješ kredite na BETA_STARTING_CREDITS */
const CREDITS_SCHEMA = 3

export const FREE_MONTHLY_CREDITS = BETA_TEST ? BETA_STARTING_CREDITS : 5
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
const SCHEMA_KEY = 'obuci-me:credits-schema'

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
    const schema = Number(localStorage.getItem(SCHEMA_KEY) || '0')

    // Nova beta šema → forsira start kredite (gasi starih 9999 iz TEST_MODE)
    if (BETA_TEST && schema < CREDITS_SCHEMA) {
      const seeded = defaultCredits()
      saveCredits(seeded)
      localStorage.setItem(SCHEMA_KEY, String(CREDITS_SCHEMA))
      return seeded
    }

    const raw = localStorage.getItem(CREDITS_KEY)
    if (!raw) {
      const fresh = defaultCredits()
      saveCredits(fresh)
      localStorage.setItem(SCHEMA_KEY, String(CREDITS_SCHEMA))
      return fresh
    }
    const state = JSON.parse(raw) as CreditsState
    return maybeResetMonthly(state)
  } catch {
    return defaultCredits()
  }
}

export function saveCredits(state: CreditsState) {
  localStorage.setItem(CREDITS_KEY, JSON.stringify(state))
}

/** Resetuje besplatne mesečne kredite na početku meseca (samo van bete / kad kupovina radi) */
function maybeResetMonthly(state: CreditsState): CreditsState {
  // U beti ne dodajemo automatski mesečne kredite — fiksni budžet za test
  if (BETA_TEST || !PURCHASES_ENABLED) return state

  const month = currentMonth()
  if (state.lastResetMonth === month) return state

  const next: CreditsState = {
    ...state,
    freeUsedThisMonth: 0,
    lastResetMonth: month,
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
  if (!PURCHASES_ENABLED) {
    throw new Error('Kupovina je privremeno zaključana tokom beta testa.')
  }
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
  if (!PURCHASES_ENABLED) {
    throw new Error('Pretplata je privremeno zaključana tokom beta testa.')
  }
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
