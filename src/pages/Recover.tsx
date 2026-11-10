import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthFrame from '../components/AuthFrame'
import { Field } from '../components/ui'
import { appUrl, supabase } from '../lib/supabase'

export default function Recover() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl() })
    setBusy(false); setSent(true)
  }

  return (
    <AuthFrame>
      <h1>Recuperar acceso</h1>
      {sent ? (
        <p className="muted" style={{ marginTop: 8 }}>Si existe una cuenta con <b>{email}</b>, recibirás un enlace.</p>
      ) : (
        <form onSubmit={submit}>
          <Field label="Correo">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <button className="btn primary block" disabled={busy}>Enviar enlace</button>
        </form>
      )}
      <p className="auth-foot"><Link to="/entrar">Volver</Link></p>
    </AuthFrame>
  )
}
