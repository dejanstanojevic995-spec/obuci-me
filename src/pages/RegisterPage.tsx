import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useApp } from '../context/AppContext'

export function RegisterPage() {
  const { user, isReady, register, loginGoogle } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isReady && user) {
    return <Navigate to="/app" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri registraciji.')
    } finally {
      setLoading(false)
    }
  }

  async function onGoogle() {
    setError('')
    setLoading(true)
    try {
      await loginGoogle()
      navigate('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri Google prijavi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-blush-50 px-5 pb-10 pt-8">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-ink-500">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        Nazad
      </Link>

      <h1 className="font-display text-3xl font-semibold text-ink-900">Kreiraj nalog</h1>
      <p className="mt-2 text-sm text-ink-500">
        Za par minuta imaš lični body profil i možeš da isprobaš odeću.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Ime"
          name="name"
          autoComplete="name"
          placeholder="Ana"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="tvoj@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Lozinka"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="Min. 6 karaktera"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Registruj se
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-100" />
        <span className="text-xs text-ink-400">ili</span>
        <div className="h-px flex-1 bg-ink-100" />
      </div>

      <Button variant="outline" fullWidth size="lg" loading={loading} onClick={onGoogle}>
        Nastavi sa Google
      </Button>

      <p className="mt-8 text-center text-sm text-ink-500">
        Već imaš nalog?{' '}
        <Link to="/prijava" className="font-semibold text-blush-600">
          Prijavi se
        </Link>
      </p>
    </div>
  )
}
