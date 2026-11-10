import { useState, type FormEvent } from 'react'
import AuthFrame from '../components/AuthFrame'
import { PersonalStep, SpecialtyStep, personalValid, specialtyValid, type ProfileDraft } from '../components/ProfileSteps'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Onboarding() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<ProfileDraft>({
    full_name: profile?.full_name ?? '',
    gender: profile?.gender ?? null,
    birth_date: profile?.birth_date ?? '',
    specialty_id: profile?.specialty_id ?? null,
    subspecialty_id: profile?.subspecialty_id ?? null,
    residency_year: profile?.residency_year ?? null,
  })
  const [error, setError] = useState('')
  const set = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...p }))
  const ok = step === 0 ? personalValid(draft) : specialtyValid(draft)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (step === 0) { setStep(1); return }
    const { error } = await supabase.from('profiles').update({ ...draft, full_name: draft.full_name.trim() }).eq('id', profile!.id)
    if (error) setError(error.message)
    else refreshProfile()
  }

  return (
    <AuthFrame>
      <h1>{step === 0 ? 'Sobre ti' : 'Tu residencia'}</h1>
      <div className="stepper"><i className="on" /><i className={step ? 'on' : ''} /></div>
      <form onSubmit={submit}>
        {step === 0 ? <PersonalStep key="p" draft={draft} set={set} /> : <SpecialtyStep key="s" draft={draft} set={set} />}
        {error && <p className="error">{error}</p>}
        <div className="row">
          {step > 0 && <button type="button" className="btn ghost" onClick={() => setStep(0)}>Atrás</button>}
          <button className="btn primary" style={{ flex: 1 }} disabled={!ok}>{step === 0 ? 'Continuar' : 'Guardar'}</button>
        </div>
      </form>
      <p className="auth-foot"><button className="btn quiet sm" onClick={signOut}>Salir</button></p>
    </AuthFrame>
  )
}
