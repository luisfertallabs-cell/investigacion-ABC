import { useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { VARIABLE_LIBRARY, VARIABLE_TYPES } from '../../lib/catalog'
import { slugKey } from '../../lib/format'
import type { Variable, VariableType } from '../../lib/types'
import { Empty, Field, Modal, useToast } from '../ui'
import { Icon } from '../Icon'

const typeLabel = (t: VariableType) => VARIABLE_TYPES.find((x) => x.value === t)?.label ?? t
const needsOptions = (t?: VariableType) => t === 'opcion' || t === 'multiple'

export default function VariablesTab({ projectId, variables, onChange }: { projectId: string; variables: Variable[]; onChange: () => void }) {
  const { isCoordinator } = useAuth()
  const toast = useToast()
  const [library, setLibrary] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [editing, setEditing] = useState<(Partial<Variable> & { optionsText?: string }) | null>(null)
  const keys = new Set(variables.map((v) => v.key))

  async function addFromLibrary() {
    const rows = VARIABLE_LIBRARY.filter((v) => picked.includes(v.key)).map((v, i) => ({
      project_id: projectId, key: v.key, label: v.label, type: v.type, options: v.options ?? [], unit: v.unit ?? null,
      position: variables.length + i,
    }))
    const { error } = await supabase.from('project_variables').insert(rows)
    if (error) return toast(error.message)
    setLibrary(false); setPicked([]); onChange(); toast(`${rows.length} variables agregadas`)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!editing?.label) return
    const options = (editing.optionsText ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
    const payload = {
      project_id: projectId,
      label: editing.label.trim(),
      key: editing.key ?? uniqueKey(slugKey(editing.label)),
      type: editing.type ?? 'texto',
      options: needsOptions(editing.type) ? options : [],
      unit: editing.unit?.trim() || null,
      required: !!editing.required,
      position: editing.position ?? variables.length,
    }
    const { error } = editing.id
      ? await supabase.from('project_variables').update(payload).eq('id', editing.id)
      : await supabase.from('project_variables').insert(payload)
    if (error) return toast(error.message)
    setEditing(null); onChange()
  }

  function uniqueKey(base: string) {
    let k = base, i = 2
    while (keys.has(k)) k = `${base}_${i++}`
    return k
  }

  async function remove() {
    if (!editing?.id || !confirm('Los datos ya capturados de esta variable dejarán de mostrarse. ¿Continuar?')) return
    await supabase.from('project_variables').delete().eq('id', editing.id)
    setEditing(null); onChange()
  }

  async function move(i: number, dir: -1 | 1) {
    const order = [...variables]
    ;[order[i], order[i + dir]] = [order[i + dir], order[i]]
    await Promise.all(order.map((v, idx) => (v.position === idx ? null : supabase.from('project_variables').update({ position: idx }).eq('id', v.id))))
    onChange()
  }

  const groups = [...new Set(VARIABLE_LIBRARY.map((v) => v.group))]

  return (
    <>
      {isCoordinator && (
        <div className="row" style={{ marginBottom: 18, justifyContent: 'flex-end' }}>
          <button className="btn ghost sm" onClick={() => setLibrary(true)}><Icon name="database" />Catálogo</button>
          <button className="btn primary sm" onClick={() => setEditing({ type: 'texto' })}><Icon name="plus" />Variable</button>
        </div>
      )}

      {variables.length === 0 ? <Empty icon="database">Sin variables definidas</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Variable</th><th>Tipo</th><th>Opciones</th><th></th></tr></thead>
            <tbody>
              {variables.map((v, i) => (
                <tr key={v.id} className={isCoordinator ? 'clickable' : ''} onClick={() => isCoordinator && setEditing({ ...v, optionsText: v.options.join('\n') })}>
                  <td><span className="strong">{v.label}</span>{v.required && <span className="chip brand" style={{ marginLeft: 8 }}>Obligatoria</span>}{v.unit && <span className="muted small"> ({v.unit})</span>}</td>
                  <td className="muted">{typeLabel(v.type)}</td>
                  <td className="muted small" style={{ whiteSpace: 'normal', maxWidth: 320 }}>{v.options.join(', ')}</td>
                  <td style={{ width: 80 }}>
                    {isCoordinator && (
                      <div className="row" style={{ gap: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir"><Icon name="up" /></button>
                        <button className="icon-btn" disabled={i === variables.length - 1} onClick={() => move(i, 1)} aria-label="Bajar"><Icon name="down" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {library && (
        <Modal title="Catálogo de variables" wide onClose={() => setLibrary(false)} footer={<>
          <button className="btn ghost" onClick={() => setLibrary(false)}>Cancelar</button>
          <button className="btn primary" disabled={!picked.length} onClick={addFromLibrary}>Agregar {picked.length || ''}</button>
        </>}>
          <div className="stack" style={{ gap: 20 }}>
            {groups.map((g) => (
              <div key={g}>
                <div className="tiny muted strong" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g}</div>
                <div className="segmented">
                  {VARIABLE_LIBRARY.filter((v) => v.group === g).map((v) => {
                    const exists = keys.has(v.key)
                    const on = picked.includes(v.key)
                    return (
                      <button type="button" key={v.key} disabled={exists} className={on || exists ? 'on' : ''} style={exists ? { opacity: 0.45 } : undefined}
                        onClick={() => setPicked(on ? picked.filter((k) => k !== v.key) : [...picked, v.key])}>
                        {v.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={editing.id ? 'Editar variable' : 'Nueva variable'} onClose={() => setEditing(null)} footer={<>
          {editing.id && <button className="btn danger" onClick={remove} style={{ marginRight: 'auto' }}>Eliminar</button>}
          <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
          <button className="btn primary" form="var-form" disabled={!editing.label?.trim()}>Guardar</button>
        </>}>
          <form id="var-form" onSubmit={save} className="form-grid">
            <Field label="Nombre" required full>
              <input className="input" value={editing.label ?? ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} autoFocus />
            </Field>
            <Field label="Tipo">
              <select className="select" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as VariableType })}>
                {VARIABLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Unidad">
              <input className="input" value={editing.unit ?? ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="mg/dL, días, min" />
            </Field>
            {needsOptions(editing.type) && (
              <Field label="Opciones" hint="Una por línea" full>
                <textarea className="textarea" rows={4} value={editing.optionsText ?? ''} onChange={(e) => setEditing({ ...editing, optionsText: e.target.value })} />
              </Field>
            )}
            <label className="check full">
              <input type="checkbox" checked={!!editing.required} onChange={(e) => setEditing({ ...editing, required: e.target.checked })} />
              <span>Obligatoria</span>
            </label>
          </form>
        </Modal>
      )}
    </>
  )
}
