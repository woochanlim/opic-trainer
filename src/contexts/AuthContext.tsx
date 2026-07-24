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
  session: unknown
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FakeUser | null>(null)
  const [session, setSession] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!HAS_SUPABASE) {
      // Supabase 없으면 로컬 스토리지에서 임시 유저 확인
      const saved = localStorage.getItem('opic_user')
      if (saved) setUser(JSON.parse(saved))
      setLoading(false)
      return
    }

    // Supabase 있을 때만 연결
    import('../lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user as unknown as FakeUser ?? null)
        setLoading(false)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setUser(session?.user as unknown as FakeUser ?? null)
      })
      return () => subscription.unsubscribe()
    })
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!HAS_SUPABASE) {
      // 임시 로그인 (Supabase 없을 때)
      const fakeUser: FakeUser = {
        id: 'local-user',
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
        id: 'local-user',
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
      setSession(null)
      localStorage.removeItem('opic_user')
      return
    }
    const { supabase } = await import('../lib/supabase')
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
