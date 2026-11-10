import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost', key || 'missing', {
  // PKCE usa ?code= en la URL y no choca con el HashRouter (#/ruta).
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

// URL base del sitio sin hash, para redirecciones de correo de Supabase Auth.
export function appUrl() {
  return `${window.location.origin}${window.location.pathname}`
}
