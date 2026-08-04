import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-ink-700">{label}</span>
      )}
      <input
        id={inputId}
        className={[
          'h-12 w-full rounded-2xl border bg-white px-4 text-ink-900 placeholder:text-ink-300',
          'transition focus:outline-none focus:ring-2 focus:ring-blush-400/50 focus:border-blush-400',
          error ? 'border-red-300' : 'border-ink-100',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
      {!error && hint && <span className="text-xs text-ink-400">{hint}</span>}
    </label>
  )
}
