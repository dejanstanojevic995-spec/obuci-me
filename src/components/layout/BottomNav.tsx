import { NavLink } from 'react-router-dom'

const items = [
  {
    to: '/app',
    end: true,
    label: 'Početna',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    ),
  },
  {
    to: '/app/try-on',
    end: false,
    label: 'Isprobaj',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8l2 4-6 11L6 8l2-4Z" />
        <path strokeLinecap="round" d="M6 8h12" />
      </svg>
    ),
  },
  {
    to: '/app/ormar',
    end: false,
    label: 'Ormar',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path strokeLinecap="round" d="M12 3v18M9 12h.01M15 12h.01" />
      </svg>
    ),
  },
  {
    to: '/app/profil',
    end: false,
    label: 'Profil',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.5" />
        <path strokeLinecap="round" d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
      </svg>
    ),
  },
]

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-blush-100/80 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[11px] font-medium transition',
                isActive ? 'text-blush-600' : 'text-ink-400 hover:text-ink-600',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'scale-105' : 'opacity-80'}>{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
