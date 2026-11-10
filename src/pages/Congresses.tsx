import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { allCongresses, matchesUser } from '../lib/data'
import { daysUntil, fmtDate, fmtRange } from '../lib/format'
import type { Congress } from '../lib/types'
import { DateBox, Deadline, Empty, Field, Modal, Skeleton, useToast } from '../components/ui'
import { Icon } from '../components/Icon'

type View = 'convocatorias' | 'proximos' | 'pasados'
const VIEWS: { id: View; label: string }[] = [
  { id: 'convocatorias', label: 'Convocatorias abiertas' },
  { id: 'proximos', label: 'Próximos' },
  { id: 'pasados', label: 'Pasados' },
]

export default function Congresses() {
  const { profile, isCoordinator, specialties, specialtyName } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<Congress[] | null>(null)
  const [view, setView] = useState<View>('convocatorias')
  const [mine, setMine] = useState(false)
  const [editing, setEditing] = useState<Partial<Congress> | null>(null)

  const load = () => allCongresses().then(setItems)
  useEffect(() => { load() }, [])

  if (!profile) return null
  const forMe = (c: Congress) => matchesUser(c.specialty_id, profile.specialty_id, profile.subspecialty_id, specialties) || !c.specialty_id
  const ends = (c: Congress) => daysUntil(c.end_date ?? c.start_date)

  const list = (items ?? []).filter((c) => {
    if (mine && !forMe(c)) return false
    if (view === 'convocatorias') return (daysUntil(c.abstract_deadline) ?? -1) >= 0
    if (view === 'proximos') return (ends(c) ?? 1) >= 0
    return (ends(c) ?? 1) < 0
  }).sort((a, b) => {
    if (view === 'convocatorias') return (a.abstract_deadline ?? '').localeCompare(b.abstract_deadline ?? '')
    if (view === 'pasados') return (b.start_date ?? '').localeCompare(a.start_date ?? '')
    return (a.start_date ?? '9').localeCompare(b.start_date ?? '9')
  })

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!editing?.name) return
    const { id, ...rest } = editing
    const payload = {
      name: rest.name, acronym: rest.acronym || null, society: rest.society || null, specialty_id: rest.specialty_id || null,
      city: rest.city || null, country: rest.country || null, start_date: rest.start_date || null, end_date: rest.end_date || null,
      abstract_deadline: rest.abstract_deadline || null, url: rest.url || null, confirmed: rest.confirmed ?? true,
    }
    const { error } = id ? await supabase.from('congresses').update(payload).eq('id', id) : await supabase.from('congresses').insert(payload)
    if (error) return toast(error.message)
    setEditing(null); toast('Congreso guardado'); load()
  }

  async function remove() {
    if (!editing?.id || !confirm('¿Eliminar congreso?')) return
    await supabase.from('congresses').delete().eq('id', editing.id)
    setEditing(null); load()
  }

  const set = (p: Partial<Congress>) => setEditing((e) => ({ ...e, ...p }))
  const roots = specialties.filter((s) => !s.parent_id)

  return (
    <>
      <div className="page-head">
        <h1>Congresos</h1>
        <div className="row">
          <label className="check small"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Mi área</label>
          {isCoordinator && <button className="btn primary" onClick={() => setEditing({ confirmed: true })}><Icon name="plus" />Congreso</button>}
        </div>
      </div>

      <div className="tabs">
        {VIEWS.map((v) => <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)}>{v.label}</button>)}
      </div>

      {!items ? <Skeleton h={100} n={4} /> : !list.length ? <Empty icon="calendar">Sin congresos en esta vista</Empty> : (
        <div className="stack stagger" key={view + String(mine)}>
          {list.map((c) => {
            const callOpen = (daysUntil(c.abstract_deadline) ?? -1) >= 0
            return (
              <div key={c.id} className="card row" style={{ alignItems: 'flex-start', gap: 18 }}>
                <DateBox date={c.start_date} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <h3>{c.acronym ?? c.name}</h3>
                    {forMe(c) && c.specialty_id && <span className="chip brand">Tu área</span>}
                    {!c.confirmed && <span className="chip outline">Por confirmar</span>}
                  </div>
                  <div className="muted small" style={{ marginTop: 2 }}>{c.acronym ? c.name : c.society}</div>
                  <div className="row wrap small" style={{ gap: 18, marginTop: 12, color: 'var(--ink-2)' }}>
                    <span className="row" style={{ gap: 6 }}><Icon name="calendar" size={15} />{fmtRange(c.start_date, c.end_date)}</span>
                    {(c.city || c.country) && <span className="row" style={{ gap: 6 }}><Icon name="pin" size={15} />{[c.city, c.country].filter(Boolean).join(', ')}</span>}
                    {c.specialty_id && <span className="muted">{specialtyName(c.specialty_id)}</span>}
                  </div>
                  {c.abstract_deadline && (
                    <div className="row wrap small" style={{ gap: 8, marginTop: 10 }}>
                      <span className="muted">Envío de trabajos</span>
                      <span className="strong">{fmtDate(c.abstract_deadline)}</span>
                      {callOpen ? <Deadline date={c.abstract_deadline} /> : <span className="chip">Cerrado</span>}
                    </div>
                  )}
                </div>
                <div className="row" style={{ gap: 2 }}>
                  {c.url && <a className="icon-btn" href={c.url} target="_blank" rel="noreferrer" aria-label="Sitio oficial"><Icon name="link" /></a>}
                  {isCoordinator && <button className="icon-btn" onClick={() => setEditing(c)} aria-label="Editar"><Icon name="edit" /></button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <Modal wide title={editing.id ? 'Editar congreso' : 'Nuevo congreso'} onClose={() => setEditing(null)} footer={<>
          {editing.id && <button className="btn danger" onClick={remove} style={{ marginRight: 'auto' }}>Eliminar</button>}
          <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
          <button className="btn primary" form="congress-form" disabled={!editing.name?.trim()}>Guardar</button>
        </>}>
          <form id="congress-form" onSubmit={save} className="form-grid">
            <Field label="Nombre" required full><input className="input" value={editing.name ?? ''} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
            <Field label="Siglas"><input className="input" value={editing.acronym ?? ''} onChange={(e) => set({ acronym: e.target.value })} placeholder="SAGES 2027" /></Field>
            <Field label="Sociedad"><input className="input" value={editing.society ?? ''} onChange={(e) => set({ society: e.target.value })} /></Field>
            <Field label="Área">
              <select className="select" value={editing.specialty_id ?? ''} onChange={(e) => set({ specialty_id: Number(e.target.value) || null })}>
                <option value="">General</option>
                {roots.map((r) => (
                  <optgroup key={r.id} label={r.name}>
                    <option value={r.id}>{r.name}</option>
                    {specialties.filter((s) => s.parent_id === r.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Sitio oficial"><input className="input" type="url" value={editing.url ?? ''} onChange={(e) => set({ url: e.target.value })} placeholder="https://" /></Field>
            <Field label="Ciudad"><input className="input" value={editing.city ?? ''} onChange={(e) => set({ city: e.target.value })} /></Field>
            <Field label="País"><input className="input" value={editing.country ?? ''} onChange={(e) => set({ country: e.target.value })} /></Field>
            <Field label="Inicio"><input className="input" type="date" value={editing.start_date ?? ''} onChange={(e) => set({ start_date: e.target.value })} /></Field>
            <Field label="Fin"><input className="input" type="date" value={editing.end_date ?? ''} min={editing.start_date ?? undefined} onChange={(e) => set({ end_date: e.target.value })} /></Field>
            <Field label="Fecha límite de envío"><input className="input" type="date" value={editing.abstract_deadline ?? ''} onChange={(e) => set({ abstract_deadline: e.target.value })} /></Field>
            <label className="check" style={{ alignSelf: 'end', height: 44 }}>
              <input type="checkbox" checked={editing.confirmed ?? true} onChange={(e) => set({ confirmed: e.target.checked })} />
              <span>Fechas confirmadas</span>
            </label>
          </form>
        </Modal>
      )}
    </>
  )
}
