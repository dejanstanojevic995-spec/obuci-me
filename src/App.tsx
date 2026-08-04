import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AppShell } from './components/layout/AppShell'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { HomePage } from './pages/HomePage'
import { TryOnPage } from './pages/TryOnPage'
import { WardrobePage } from './pages/WardrobePage'
import { WardrobeDetailPage } from './pages/WardrobeDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { CreditsPage } from './pages/CreditsPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Javne rute */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/prijava" element={<LoginPage />} />
          <Route path="/registracija" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Zaštićena app zona sa bottom nav */}
          <Route path="/app" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="try-on" element={<TryOnPage />} />
            <Route path="ormar" element={<WardrobePage />} />
            <Route path="ormar/:id" element={<WardrobeDetailPage />} />
            <Route path="profil" element={<ProfilePage />} />
            <Route path="krediti" element={<CreditsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
