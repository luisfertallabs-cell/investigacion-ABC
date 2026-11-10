import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthFrame from '../components/AuthFrame'
import { Field } from '../components/ui'
import { PersonalStep, SpecialtyStep, emptyDraft, personalValid, specialtyValid, type ProfileDraft } from '../components/ProfileSteps'
import { appUrl, supabase } from '../lib/supabase'

const TITLES = ['Crea tu cuenta', 'Sobre ti', 'Tu residencia']

export default function Register() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const set = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...p }))

  const canNext = step === 0 ? /\S+@\S+\.\S+/.test(email) && password.length >= 8 : step === 1 ? personalValid(draft) : specialtyValid(draft)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canNext) return
    if (step < 2) { setStep(step + 1); setError(''); return }
    setBusy(true); setError('')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: appUrl(),
        data: { ...draft, full_name: draft.full_name.trim().replace(/\s+/g, ' ') },
      },
    })
    setBusy(false)
    if (error) { setError(error.message.includes('registered') ? 'Este correo ya tiene cuenta.' : error.message); return }
    if (!data.session) setSent(true)
  }

  if (sent) {
    return (
      <AuthFrame>
        <h1>Revisa tu correo</h1>
        <p className="muted" style={{ marginTop: 8 }}>Enviamos un enlace de confirmación a <b>{email}</b>.</p>
        <p className="auth-foot"><Link to="/entrar">Volver</Link></p>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame>
      <h1>{TITLES[step]}</h1>
      <div className="stepper">{TITLES.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
      <form onSubmit={submit}>
        {step === 0 && (
          <div className="step-panel" key="s0">
            <Field label="Correo">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
            </Field>
            <Field label="Contraseña" hint="Mínimo 8 caracteres">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            </Field>
          </div>
        )}
        {step === 1 && <PersonalStep key="s1" draft={draft} set={set} />}
        {step === 2 && <SpecialtyStep key="s2" draft={draft} set={set} />}
        {error && <p className="error">{error}</p>}
        <div className="row">
          {step > 0 && <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>Atrás</button>}
          <button className="btn primary" style={{ flex: 1 }} disabled={!canNext || busy}>
            {step < 2 ? 'Continuar' : busy ? 'Creando' : 'Crear cuenta'}
          </button>
        </div>
      </form>
      <p className="auth-foot">¿Ya tienes cuenta? <Link to="/entrar">Entrar</Link></p>
    </AuthFrame>
  )
}
