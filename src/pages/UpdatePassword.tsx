import { useState, type FormEvent } from 'react'
import AuthFrame from '../components/AuthFrame'
import { Field } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function UpdatePassword() {
  const { clearRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else { clearRecovery(); window.location.hash = '#/' }
  }

  return (
    <AuthFrame>
      <h1>Nueva contraseña</h1>
      <form onSubmit={submit}>
        <Field label="Contraseña" hint="Mínimo 8 caracteres">
          <input className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required autoFocus />
        </Field>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block">Guardar</button>
      </form>
    </AuthFrame>
  )
}
