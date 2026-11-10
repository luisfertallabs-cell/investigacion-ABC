import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase, warnSetup } from './supabase'
import type { Profile, Specialty } from './types'

interface Ctx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  dbReady: boolean
  recovering: boolean
  isCoordinator: boolean
  specialties: Specialty[]
  specialtyName: (id: number | null | undefined) => string
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
  clearRecovery: () => void
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isConfigured)
  const [dbReady, setDbReady] = useState(true)
  const [recovering, setRecovering] = useState(false)
  const [specialties, setSpecialties] = useState<Specialty[]>([])

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); return }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (error || !data) {
      warnSetup(error ? `No se pudo leer el perfil (${error.code ?? error.message}). Revisa las migraciones.` : 'La sesión no tiene perfil. Revisa que el trigger handle_new_user exista.')
      setDbReady(false)
    }
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    // Sin secrets no se hace ninguna petición: la app muestra la pantalla Setup.
    if (!isConfigured) return
    supabase.from('specialties').select('*').order('position').then(({ data, error }) => {
      if (error) {
        setDbReady(false)
        warnSetup(`No se pudo leer la base de datos (${error.code ?? error.message}). Aplica las migraciones de supabase/migrations en tu proyecto de Supabase.`)
        return
      }
      setSpecialties((data as Specialty[]) ?? [])
    })
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
      // Diferido para no bloquear el callback de supabase-js.
      setTimeout(() => loadProfile(s?.user.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value = useMemo<Ctx>(() => {
    const map = new Map(specialties.map((s) => [s.id, s.name]))
    return {
      session,
      profile,
      loading,
      dbReady,
      recovering,
      isCoordinator: profile?.role === 'coordinador',
      specialties,
      specialtyName: (id) => (id ? map.get(id) ?? '' : ''),
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => { await supabase.auth.signOut(); setProfile(null) },
      clearRecovery: () => setRecovering(false),
    }
  }, [session, profile, loading, dbReady, recovering, specialties, loadProfile])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
