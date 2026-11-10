import { Field, Segmented } from './ui'
import { GENDERS } from '../lib/catalog'
import { useAuth } from '../lib/auth'
import type { Gender } from '../lib/types'

export interface ProfileDraft {
  full_name: string
  gender: Gender | null
  birth_date: string
  specialty_id: number | null
  subspecialty_id: number | null
  residency_year: number | null
}

export const emptyDraft: ProfileDraft = { full_name: '', gender: null, birth_date: '', specialty_id: null, subspecialty_id: null, residency_year: null }

export function personalValid(d: ProfileDraft) {
  return d.full_name.trim().split(/\s+/).length >= 2 && !!d.gender && !!d.birth_date
}
export function specialtyValid(d: ProfileDraft) {
  return !!d.specialty_id && !!d.residency_year
}

export function PersonalStep({ draft, set }: { draft: ProfileDraft; set: (p: Partial<ProfileDraft>) => void }) {
  const max = new Date(); max.setFullYear(max.getFullYear() - 20)
  return (
    <div className="step-panel">
      <Field label="Nombre completo" required>
        <input className="input" value={draft.full_name} onChange={(e) => set({ full_name: e.target.value })} autoComplete="name" placeholder="Nombre y apellidos" autoFocus />
      </Field>
      <Field label="Género" required group>
        <Segmented value={draft.gender} options={GENDERS} onChange={(g) => set({ gender: g })} />
      </Field>
      <Field label="Fecha de nacimiento" required>
        <input className="input" type="date" value={draft.birth_date} max={max.toISOString().slice(0, 10)} min="1940-01-01" onChange={(e) => set({ birth_date: e.target.value })} autoComplete="bday" />
      </Field>
    </div>
  )
}

export function SpecialtyStep({ draft, set }: { draft: ProfileDraft; set: (p: Partial<ProfileDraft>) => void }) {
  const { specialties } = useAuth()
  const roots = specialties.filter((s) => !s.parent_id)
  const subs = specialties.filter((s) => s.parent_id === draft.specialty_id)
  return (
    <div className="step-panel">
      <Field label="Especialidad" required>
        <select className="select" value={draft.specialty_id ?? ''} onChange={(e) => set({ specialty_id: Number(e.target.value) || null, subspecialty_id: null })}>
          <option value="">Selecciona</option>
          {roots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      {subs.length > 0 && (
        <Field label="Subespecialidad o área de interés">
          <select className="select" value={draft.subspecialty_id ?? ''} onChange={(e) => set({ subspecialty_id: Number(e.target.value) || null })}>
            <option value="">Aún no definida</option>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Año de residencia" required group>
        <Segmented
          value={draft.residency_year}
          options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `R${n}` }))}
          onChange={(n) => set({ residency_year: n })}
        />
      </Field>
    </div>
  )
}
