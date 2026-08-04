import type { ReactNode } from 'react'

export function Badge({
  children,
  tone = 'blush',
}: {
  children: ReactNode
  tone?: 'blush' | 'ink' | 'success' | 'warn'
}) {
  const tones = {
    blush: 'bg-blush-100 text-blush-700',
    ink: 'bg-ink-100 text-ink-700',
    success: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-800',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
