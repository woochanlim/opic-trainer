import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const HAS_SUPABASE = !!SUPABASE_URL

interface FakeUser {
  id: string
  email: string
  user_metadata: { name: string }
}

interface AuthContextType {
  user: FakeUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function getSavedUser(): FakeUser | null {
  try {
    const raw = localStorage.getItem('opic_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FakeUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!HAS_SUPABASE) {
      setUser(getSavedUser())
      setLoading(false)
      return
    }

    // Supabase 모드: 구독 해제를 위해 unsubscribe 참조 보관
    let unsubscribe: (() => void) | null = null

    import('../lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user as unknown as FakeUser ?? null)
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user as unknown as FakeUser ?? null)
      })

      unsubscribe = () => subscription.unsubscribe()
    })

    // useEffect 클린업에서 실제로 구독 해제
    return () => { unsubscribe?.() }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!HAS_SUPABASE) {
      const fakeUser: FakeUser = {
        id: 'local-' + Date.now(),
        email,
        user_metadata: { name: email.split('@')[0] },
      }
      setUser(fakeUser)
      localStorage.setItem('opic_user', JSON.stringify(fakeUser))
      return { error: null }
    }
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, name: string) => {
    if (!HAS_SUPABASE) {
      const fakeUser: FakeUser = {
        id: 'local-' + Date.now(),
        email,
        user_metadata: { name },
      }
      setUser(fakeUser)
      localStorage.setItem('opic_user', JSON.stringify(fakeUser))
      return { error: null }
    }
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    return { error }
  }

  const signOut = async () => {
    if (!HAS_SUPABASE) {
      setUser(null)
      localStorage.removeItem('opic_user')
      return
    }
    try {
      const { supabase } = await import('../lib/supabase')
      await supabase.auth.signOut()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
