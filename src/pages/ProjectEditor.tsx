import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { allCongresses } from '../lib/data'
import { DESIGNS, PROJECT_STATUS, defaultPlan } from '../lib/catalog'
import { addDays, daysUntil, fmtDate, isoDate, today } from '../lib/format'
import type { Congress, Project, ProjectStatus } from '../lib/types'
import { Field, Segmented, useToast } from '../components/ui'
import { Icon } from '../components/Icon'

export default function ProjectEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { specialties } = useAuth()
  const [congresses, setCongresses] = useState<Congress[]>([])
  const [form, setForm] = useState({
    title: '', summary: '', design: '', specialty_id: '' as string, congress_id: '' as string,
    target_n: '' as string, status: 'abierto' as ProjectStatus,
  })
  const [plan, setPlan] = useState(true)
  const [deadline, setDeadline] = useState(isoDate(addDays(today(), 90)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }))

  useEffect(() => {
    allCongresses().then((cs) => setCongresses(cs.filter((c) => (daysUntil(c.end_date ?? c.start_date) ?? 0) >= 0 || c.id === form.congress_id)))
    if (id) {
      supabase.from('projects').select('*').eq('id', id).single().then(({ data }) => {
        const p = data as Project
        if (p) set({
          title: p.title, summary: p.summary, design: p.design ?? '', specialty_id: p.specialty_id ? String(p.specialty_id) : '',
          congress_id: p.congress_id ?? '', target_n: p.target_n ? String(p.target_n) : '', status: p.status,
        })
      })
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function pickCongress(cid: string) {
    set({ congress_id: cid })
    const c = congresses.find((x) => x.id === cid)
    if (c?.abstract_deadline && (daysUntil(c.abstract_deadline) ?? -1) > 7) setDeadline(c.abstract_deadline)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      design: form.design || null,
      specialty_id: form.specialty_id ? Number(form.specialty_id) : null,
      congress_id: form.congress_id || null,
      target_n: form.target_n ? Number(form.target_n) : null,
      status: form.status,
    }
    const res = id
      ? await supabase.from('projects').update(payload).eq('id', id).select().single()
      : await supabase.from('projects').insert(payload).select().single()
    if (res.error || !res.data) { setBusy(false); setError(res.error?.message ?? 'Error'); return }
    const pid = (res.data as Project).id
    if (!id && plan) {
      await supabase.from('project_tasks').insert(defaultPlan(deadline).map((t) => ({ ...t, project_id: pid })))
    }
    setBusy(false)
    toast(id ? 'Cambios guardados' : 'Proyecto creado')
    nav(`/proyectos/${pid}${id ? '' : '?tab=variables'}`)
  }

  async function remove() {
    if (!id || !confirm('¿Eliminar este proyecto y todos sus registros?')) return
    await supabase.from('projects').delete().eq('id', id)
    toast('Proyecto eliminado')
    nav('/proyectos')
  }

  const roots = specialties.filter((s) => !s.parent_id)

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn quiet sm" onClick={() => nav(-1)} style={{ marginLeft: -10, marginBottom: 8 }}><Icon name="back" />Volver</button>
          <h1>{id ? 'Editar proyecto' : 'Nuevo proyecto'}</h1>
        </div>
      </div>

      <form onSubmit={submit} className="card" style={{ maxWidth: 760 }}>
        <div className="form-grid">
          <Field label="Título" required full>
            <input className="input" value={form.title} onChange={(e) => set({ title: e.target.value })} required autoFocus />
          </Field>
          <Field label="Introducción" hint="Contexto y objetivo en pocas líneas" full>
            <textarea className="textarea" value={form.summary} onChange={(e) => set({ summary: e.target.value })} rows={4} />
          </Field>
          <Field label="Diseño">
            <select className="select" value={form.design} onChange={(e) => set({ design: e.target.value })}>
              <option value="">Sin definir</option>
              {DESIGNS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Área">
            <select className="select" value={form.specialty_id} onChange={(e) => set({ specialty_id: e.target.value })}>
              <option value="">Todas</option>
              {roots.map((r) => (
                <optgroup key={r.id} label={r.name}>
                  <option value={r.id}>{r.name}</option>
                  {specialties.filter((s) => s.parent_id === r.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Congreso objetivo">
            <select className="select" value={form.congress_id} onChange={(e) => pickCongress(e.target.value)}>
              <option value="">Ninguno</option>
              {congresses.map((c) => <option key={c.id} value={c.id}>{c.acronym ?? c.name}</option>)}
            </select>
          </Field>
          <Field label="Muestra meta" hint="Número de pacientes">
            <input className="input" type="number" min={1} value={form.target_n} onChange={(e) => set({ target_n: e.target.value })} />
          </Field>
          <Field label="Estado" full group>
            <Segmented value={form.status} options={Object.entries(PROJECT_STATUS).map(([value, label]) => ({ value: value as ProjectStatus, label }))} onChange={(s) => set({ status: s })} />
          </Field>
        </div>

        {!id && (
          <>
            <div className="divider" />
            <label className="check">
              <input type="checkbox" checked={plan} onChange={(e) => setPlan(e.target.checked)} />
              <span>Generar plan de trabajo</span>
            </label>
            {plan && (
              <div className="step-panel" style={{ marginTop: 14 }}>
                <Field label="Fecha de envío" hint={`7 etapas desde hoy hasta el ${fmtDate(deadline)}`}>
                  <input className="input" type="date" value={deadline} min={isoDate(addDays(today(), 7))} onChange={(e) => setDeadline(e.target.value)} style={{ maxWidth: 240 }} />
                </Field>
              </div>
            )}
          </>
        )}

        {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}
        <div className="row" style={{ marginTop: 24 }}>
          {id && <button type="button" className="btn danger" onClick={remove}><Icon name="trash" />Eliminar</button>}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancelar</button>
          <button className="btn primary" disabled={busy || !form.title.trim()}>{id ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </>
  )
}
