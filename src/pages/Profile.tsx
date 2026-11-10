import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { PersonalStep, SpecialtyStep, personalValid, specialtyValid, type ProfileDraft } from '../components/ProfileSteps'
import { useToast } from '../components/ui'
import { Icon } from '../components/Icon'
import { initials } from '../lib/format'
import { loadDirectory } from '../lib/directory'

export default function Profile() {
  const { profile, session, refreshProfile, signOut, isCoordinator, specialtyName } = useAuth()
  const toast = useToast()
  const [draft, setDraft] = useState<ProfileDraft>({
    full_name: profile?.full_name ?? '',
    gender: profile?.gender ?? null,
    birth_date: profile?.birth_date ?? '',
    specialty_id: profile?.specialty_id ?? null,
    subspecialty_id: profile?.subspecialty_id ?? null,
    residency_year: profile?.residency_year ?? null,
  })
  const [busy, setBusy] = useState(false)
  const set = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...p }))

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ ...draft, full_name: draft.full_name.trim() }).eq('id', profile!.id)
    setBusy(false)
    if (error) return toast(error.message)
    await refreshProfile(); loadDirectory(true)
    toast('Perfil actualizado')
  }

  if (!profile) return null

  return (
    <>
      <div className="page-head">
        <div className="row" style={{ gap: 16 }}>
          <span className="avatar" style={{ width: 56, height: 56, fontSize: 18 }}>{initials(profile.full_name)}</span>
          <div>
            <h1>{profile.full_name}</h1>
            <div className="muted small">{session?.user.email}{isCoordinator ? ', Coordinación' : ''}</div>
          </div>
        </div>
        <button className="btn ghost" onClick={signOut}><Icon name="logout" />Salir</button>
      </div>

      <form onSubmit={save} className="grid two" style={{ alignItems: 'start' }}>
        <div className="card"><h2 style={{ marginBottom: 18 }}>Datos personales</h2><PersonalStep draft={draft} set={set} /></div>
        <div className="card">
          <h2 style={{ marginBottom: 18 }}>Residencia</h2>
          <SpecialtyStep draft={draft} set={set} />
          <p className="tiny muted" style={{ marginTop: 14 }}>Usamos {specialtyName(draft.subspecialty_id) || specialtyName(draft.specialty_id) || 'tu área'} para recomendarte proyectos y congresos.</p>
        </div>
        <div className="row" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
          <button className="btn primary" disabled={busy || !personalValid(draft) || !specialtyValid(draft)}>Guardar cambios</button>
        </div>
      </form>
    </>
  )
}
