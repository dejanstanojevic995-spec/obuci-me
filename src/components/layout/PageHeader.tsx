import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string | number
  right?: ReactNode
}

export function PageHeader({ title, subtitle, backTo, right }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-blush-100/60 bg-blush-50/90 px-4 pb-3 pt-4 backdrop-blur-md">
      <div className="flex items-start gap-3">
        {backTo !== undefined && (
          <button
            type="button"
            onClick={() => {
              if (typeof backTo === 'number') navigate(backTo)
              else navigate(backTo)
            }}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-ink-700 shadow-card"
            aria-label="Nazad"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}
