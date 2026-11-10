import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthFrame from '../components/AuthFrame'
import { Field } from '../components/ui'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.message.includes('confirm') ? 'Confirma tu correo para continuar.' : 'Correo o contraseña incorrectos.')
  }

  return (
    <AuthFrame>
      <h1>Bienvenido</h1>
      <form onSubmit={submit}>
        <Field label="Correo">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
        </Field>
        <Field label="Contraseña">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Entrando' : 'Entrar'}</button>
        <Link to="/recuperar" className="small" style={{ textAlign: 'center' }}>Olvidé mi contraseña</Link>
      </form>
      <p className="auth-foot">¿Primera vez? <Link to="/registro">Crear cuenta</Link></p>
    </AuthFrame>
  )
}
