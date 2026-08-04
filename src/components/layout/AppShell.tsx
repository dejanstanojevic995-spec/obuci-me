import { Outlet, Navigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useApp } from '../../context/AppContext'

export function AppShell() {
  const { user, isReady } = useApp()

  if (!isReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-blush-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blush-300 border-t-blush-600" />
          <p className="text-sm text-ink-500">Učitavanje…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/prijava" replace />
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-blush-50">
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
