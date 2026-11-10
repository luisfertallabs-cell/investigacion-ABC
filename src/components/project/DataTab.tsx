import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { useDirectory } from '../../lib/directory'
import { fmtDate } from '../../lib/format'
import type { Project, RecordRow, Variable } from '../../lib/types'
import { Empty, Field, Modal, Progress, Segmented, Skeleton, useToast } from '../ui'
import { Icon } from '../Icon'

type Values = Record<string, unknown>

function display(v: Variable, value: unknown) {
  if (value === null || value === undefined || value === '') return ''
  if (v.type === 'si_no') return value ? 'Sí' : 'No'
  if (v.type === 'fecha') return fmtDate(String(value))
  if (Array.isArray(value)) return value.join(', ')
  return `${value}${v.unit ? ` ${v.unit}` : ''}`
}

function csvCell(x: unknown) {
  const s = Array.isArray(x) ? x.join('; ') : x === true ? 'Si' : x === false ? 'No' : x == null ? '' : String(x)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function DataTab({ project, variables }: { project: Project; variables: Variable[] }) {
  const { profile, isCoordinator } = useAuth()
  const toast = useToast()
  const people = useDirectory()
  const [rows, setRows] = useState<RecordRow[] | null>(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{ id?: string; folio: string; data: Values; created_by?: string | null } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function load() {
    const { data } = await supabase.from('records').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
    setRows((data as RecordRow[]) ?? [])
  }
  useEffect(() => { load() }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cols = variables.slice(0, 5)
  const filtered = useMemo(() => (rows ?? []).filter((r) => r.folio.toLowerCase().includes(query.toLowerCase())), [rows, query])
  const author = (id: string | null) => people.find((p) => p.id === id)?.full_name ?? ''

  function validate() {
    const e: Record<string, string> = {}
    if (!editing!.folio.trim()) e.folio = 'Requerido'
    if ((rows ?? []).some((r) => r.folio === editing!.folio.trim() && r.id !== editing!.id)) e.folio = 'Folio repetido'
    for (const v of variables) {
      const x = editing!.data[v.key]
      const empty = x === undefined || x === null || x === '' || (Array.isArray(x) && !x.length)
      if (v.required && empty) e[v.key] = 'Requerido'
      if (!empty && v.type === 'entero' && !Number.isInteger(Number(x))) e[v.key] = 'Número entero'
      if (!empty && v.type === 'numero' && Number.isNaN(Number(x))) e[v.key] = 'Número'
    }
    setErrors(e)
    return !Object.keys(e).length
  }

  async function save(ev: FormEvent) {
    ev.preventDefault()
    if (!editing || !validate()) return
    const clean: Values = {}
    for (const v of variables) {
      let x = editing.data[v.key]
      if (x === '' || x === undefined || (Array.isArray(x) && !x.length)) continue
      if (v.type === 'numero' || v.type === 'entero') x = Number(x)
      clean[v.key] = x
    }
    const payload = { project_id: project.id, folio: editing.folio.trim(), data: clean }
    const { error } = editing.id
      ? await supabase.from('records').update(payload).eq('id', editing.id)
      : await supabase.from('records').insert(payload)
    if (error) return toast(error.message.includes('duplicate') ? 'Folio repetido' : error.message)
    toast(editing.id ? 'Registro actualizado' : 'Registro guardado')
    setEditing(null); load()
  }

  async function remove() {
    if (!editing?.id || !confirm('¿Eliminar este registro?')) return
    const { error } = await supabase.from('records').delete().eq('id', editing.id)
    if (error) return toast('Sin permiso para eliminar')
    setEditing(null); load()
  }

  function exportCsv() {
    const header = ['folio', ...variables.map((v) => v.key), 'capturado_por', 'fecha_captura']
    const lines = (rows ?? []).map((r) => [r.folio, ...variables.map((v) => r.data[v.key]), author(r.created_by), r.created_at.slice(0, 10)].map(csvCell).join(','))
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${project.title.slice(0, 40).replace(/[^\w]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const setVal = (k: string, x: unknown) => setEditing((e) => e && { ...e, data: { ...e.data, [k]: x } })

  if (!rows) return <Skeleton h={56} n={4} />
  if (!variables.length) return <Empty icon="database">Primero define las variables</Empty>

  const canDelete = editing?.id && (isCoordinator || editing.created_by === profile?.id)

  return (
    <>
      <div className="row wrap" style={{ marginBottom: 18 }}>
        <input className="input" placeholder="Buscar folio" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 240 }} />
        <div style={{ flex: 1, minWidth: 160, maxWidth: 280 }}>
          {project.target_n ? (
            <><Progress value={Math.min(100, (rows.length / project.target_n) * 100)} /><div className="small muted" style={{ marginTop: 6 }}>{rows.length} de {project.target_n} pacientes</div></>
          ) : <div className="small muted">{rows.length} pacientes</div>}
        </div>
        <span className="spacer" />
        <button className="btn ghost sm" onClick={exportCsv} disabled={!rows.length}><Icon name="download" />CSV</button>
        <button className="btn primary sm" onClick={() => { setErrors({}); setEditing({ folio: '', data: {} }) }}><Icon name="plus" />Paciente</button>
      </div>

      {filtered.length === 0 ? <Empty icon="database">{rows.length ? 'Sin resultados' : 'Aún no hay pacientes capturados'}</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Folio</th>{cols.map((v) => <th key={v.id}>{v.label}</th>)}<th>Captura</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => { setErrors({}); setEditing({ id: r.id, folio: r.folio, data: { ...r.data }, created_by: r.created_by }) }}>
                  <td className="strong">{r.folio}</td>
                  {cols.map((v) => <td key={v.id}>{display(v, r.data[v.key])}</td>)}
                  <td className="muted small">{fmtDate(r.created_at.slice(0, 10), { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal wide title={editing.id ? `Paciente ${editing.folio}` : 'Nuevo paciente'} onClose={() => setEditing(null)} footer={<>
          {canDelete && <button className="btn danger" onClick={remove} style={{ marginRight: 'auto' }}>Eliminar</button>}
          <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
          <button className="btn primary" form="record-form">Guardar</button>
        </>}>
          <form id="record-form" onSubmit={save} className="form-grid">
            <Field label="Folio" required hint="Sin nombre ni expediente del paciente">
              <input className="input" value={editing.folio} onChange={(e) => setEditing({ ...editing, folio: e.target.value })} autoFocus={!editing.id} />
              {errors.folio && <span className="error">{errors.folio}</span>}
            </Field>
            {variables.map((v) => (
              <Field key={v.id} label={v.unit ? `${v.label} (${v.unit})` : v.label} required={v.required} full={v.type === 'multiple' || v.type === 'texto'} group={v.type === 'si_no' || v.type === 'multiple' || (v.type === 'opcion' && v.options.length <= 4)}>
                <Input v={v} value={editing.data[v.key]} onChange={(x) => setVal(v.key, x)} />
                {errors[v.key] && <span className="error">{errors[v.key]}</span>}
              </Field>
            ))}
          </form>
        </Modal>
      )}
    </>
  )
}

function Input({ v, value, onChange }: { v: Variable; value: unknown; onChange: (x: unknown) => void }) {
  switch (v.type) {
    case 'numero':
    case 'entero':
      return <input className="input" type="number" inputMode={v.type === 'entero' ? 'numeric' : 'decimal'} step={v.type === 'entero' ? 1 : 'any'} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'fecha':
      return <input className="input" type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'si_no':
      return <Segmented value={value === undefined ? null : value ? 'si' : 'no'} options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]} onChange={(x) => onChange(x === 'si')} />
    case 'opcion':
      return v.options.length <= 4
        ? <Segmented value={(value as string) ?? null} options={v.options.map((o) => ({ value: o, label: o }))} onChange={onChange} />
        : <select className="select" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}><option value="">Selecciona</option>{v.options.map((o) => <option key={o}>{o}</option>)}</select>
    case 'multiple': {
      const arr = (value as string[]) ?? []
      return (
        <div className="segmented">
          {v.options.map((o) => (
            <button type="button" key={o} className={arr.includes(o) ? 'on' : ''} onClick={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>
          ))}
        </div>
      )
    }
    default:
      return <input className="input" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
  }
}
