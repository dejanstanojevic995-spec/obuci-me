/**
 * Mock autentifikacija za MVP.
 *
 * TODO: Zameniti Firebase Auth ili Supabase Auth:
 * - Email/password sign up & sign in
 * - Google OAuth
 * - Session persistence
 */

import type { User } from '../types'

const USERS_KEY = 'obuci-me:mock-users'
const SESSION_KEY = 'obuci-me:session'

interface StoredUser extends User {
  password?: string
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredUser[]) : []
  } catch {
    return []
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function setSession(user: User | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  await delay(600)
  const users = loadUsers()
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!found || found.password !== password) {
    throw new Error('Pogrešan email ili lozinka.')
  }
  const { password: _, ...user } = found
  setSession(user)
  return user
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  await delay(700)
  const users = loadUsers()
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Nalog sa ovim emailom već postoji.')
  }
  if (password.length < 6) {
    throw new Error('Lozinka mora imati najmanje 6 karaktera.')
  }
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email: email.trim(),
    name: name.trim(),
    provider: 'email',
    createdAt: new Date().toISOString(),
    password,
  }
  users.push(user)
  saveUsers(users)
  const { password: _, ...publicUser } = user
  setSession(publicUser)
  return publicUser
}

/**
 * Mock Google login — ne poziva pravi Google OAuth.
 * TODO: Firebase/Supabase Google provider
 */
export async function loginWithGoogle(): Promise<User> {
  await delay(800)
  const user: User = {
    id: 'mock-google-' + crypto.randomUUID().slice(0, 8),
    email: 'demo@gmail.com',
    name: 'Demo Korisnica',
    provider: 'google',
    avatarUrl: undefined,
    createdAt: new Date().toISOString(),
  }
  // Sačuvaj u mock users ako ne postoji
  const users = loadUsers()
  if (!users.some((u) => u.email === user.email && u.provider === 'google')) {
    users.push(user)
    saveUsers(users)
  }
  setSession(user)
  return user
}

export function logout() {
  setSession(null)
}

export function updateUserProfile(partial: Partial<Pick<User, 'name' | 'avatarUrl'>>): User {
  const session = getSession()
  if (!session) throw new Error('Nisi prijavljena.')
  const updated = { ...session, ...partial }
  setSession(updated)
  const users = loadUsers()
  const idx = users.findIndex((u) => u.id === session.id)
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...partial }
    saveUsers(users)
  }
  return updated
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
