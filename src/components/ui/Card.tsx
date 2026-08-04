import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', padding = true, onClick }: CardProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'rounded-3xl border border-blush-100/80 bg-white shadow-card',
        padding ? 'p-4' : '',
        onClick ? 'w-full text-left transition hover:border-blush-200 active:scale-[0.99]' : '',
        className,
      ].join(' ')}
    >
      {children}
    </Comp>
  )
}
