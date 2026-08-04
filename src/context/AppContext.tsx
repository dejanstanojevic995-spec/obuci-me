import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BodyPhoto, BodyProfile, CreditsState, Measurements, TryOnResult, User } from '../types'
import * as authService from '../services/auth'
import * as creditsService from '../services/credits'

const BODY_KEY = 'obuci-me:body-profile'
const WARDROBE_KEY = 'obuci-me:wardrobe'

const emptyMeasurements: Measurements = {
  heightCm: null,
  bustCm: null,
  waistCm: null,
  hipsCm: null,
}

function loadBodyProfile(): BodyProfile {
  try {
    const raw = localStorage.getItem(BODY_KEY)
    if (raw) return JSON.parse(raw) as BodyProfile
  } catch {
    /* ignore */
  }
  return { photos: [], measurements: emptyMeasurements, completed: false }
}

function loadWardrobe(): TryOnResult[] {
  try {
    const raw = localStorage.getItem(WARDROBE_KEY)
    if (raw) return JSON.parse(raw) as TryOnResult[]
  } catch {
    /* ignore */
  }
  return []
}

interface AppContextValue {
  user: User | null
  bodyProfile: BodyProfile
  wardrobe: TryOnResult[]
  credits: CreditsState
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  loginGoogle: () => Promise<void>
  logout: () => void
  updateName: (name: string) => void
  setPhotos: (photos: BodyPhoto[]) => void
  setMeasurements: (m: Measurements) => void
  markBodyComplete: () => void
  saveLook: (look: TryOnResult) => void
  removeLook: (id: string) => void
  setCredits: (c: CreditsState) => void
  spendTryOnCredit: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(loadBodyProfile)
  const [wardrobe, setWardrobe] = useState<TryOnResult[]>(loadWardrobe)
  const [credits, setCreditsState] = useState<CreditsState>(creditsService.loadCredits)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setUser(authService.getSession())
    setIsReady(true)
  }, [])

  useEffect(() => {
    localStorage.setItem(BODY_KEY, JSON.stringify(bodyProfile))
  }, [bodyProfile])

  useEffect(() => {
    localStorage.setItem(WARDROBE_KEY, JSON.stringify(wardrobe))
  }, [wardrobe])

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.loginWithEmail(email, password)
    setUser(u)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const u = await authService.registerWithEmail(name, email, password)
    setUser(u)
  }, [])

  const loginGoogle = useCallback(async () => {
    const u = await authService.loginWithGoogle()
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  const updateName = useCallback((name: string) => {
    const u = authService.updateUserProfile({ name })
    setUser(u)
  }, [])

  const setPhotos = useCallback((photos: BodyPhoto[]) => {
    setBodyProfile((prev) => ({
      ...prev,
      photos,
      completed: photos.length >= 3 && hasMinMeasurements(prev.measurements),
    }))
  }, [])

  const setMeasurements = useCallback((measurements: Measurements) => {
    setBodyProfile((prev) => ({
      ...prev,
      measurements,
      completed: prev.photos.length >= 3 && hasMinMeasurements(measurements),
    }))
  }, [])

  const markBodyComplete = useCallback(() => {
    setBodyProfile((prev) => ({
      ...prev,
      completed: prev.photos.length >= 3 && hasMinMeasurements(prev.measurements),
    }))
  }, [])

  const saveLook = useCallback((look: TryOnResult) => {
    setWardrobe((prev) => {
      const exists = prev.some((l) => l.id === look.id)
      if (exists) {
        return prev.map((l) => (l.id === look.id ? { ...look, saved: true } : l))
      }
      return [{ ...look, saved: true }, ...prev]
    })
  }, [])

  const removeLook = useCallback((id: string) => {
    setWardrobe((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const setCredits = useCallback((c: CreditsState) => {
    creditsService.saveCredits(c)
    setCreditsState(c)
  }, [])

  const spendTryOnCredit = useCallback(() => {
    setCreditsState((prev) => creditsService.spendCredit(prev))
  }, [])

  const value = useMemo(
    () => ({
      user,
      bodyProfile,
      wardrobe,
      credits,
      isReady,
      login,
      register,
      loginGoogle,
      logout,
      updateName,
      setPhotos,
      setMeasurements,
      markBodyComplete,
      saveLook,
      removeLook,
      setCredits,
      spendTryOnCredit,
    }),
    [
      user,
      bodyProfile,
      wardrobe,
      credits,
      isReady,
      login,
      register,
      loginGoogle,
      logout,
      updateName,
      setPhotos,
      setMeasurements,
      markBodyComplete,
      saveLook,
      removeLook,
      setCredits,
      spendTryOnCredit,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

function hasMinMeasurements(m: Measurements): boolean {
  return m.heightCm != null && m.bustCm != null && m.waistCm != null && m.hipsCm != null
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp mora biti unutar AppProvider')
  return ctx
}
