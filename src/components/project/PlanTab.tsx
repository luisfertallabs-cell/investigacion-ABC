import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { toggleTask } from '../../lib/data'
import { useDirectory } from '../../lib/directory'
import { addDays, isoDate, today } from '../../lib/format'
import type { Member, Task } from '../../lib/types'
import { Empty, Field, Modal, Progress, Skeleton, useToast } from '../ui'
import { Icon } from '../Icon'
import TaskItem from '../TaskItem'

export default function PlanTab({ projectId }: { projectId: string }) {
  const { isCoordinator } = useAuth()
  const toast = useToast()
  const people = useDirectory()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [editing, setEditing] = useState<Partial<Task> | null>(null)

  async function load() {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('project_tasks').select('*').eq('project_id', projectId).order('due_date').order('position'),
      supabase.from('project_members').select('*').eq('project_id', projectId).eq('status', 'aceptado'),
    ])
    setTasks((t as Task[]) ?? [])
    setMembers((m as Member[]) ?? [])
  }
  useEffect(() => { load() }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const name = (uid: string | null) => (uid ? people.find((p) => p.id === uid)?.full_name : undefined)

  async function onToggle(t: Task) {
    const next = await toggleTask(t)
    setTasks((all) => all!.map((x) => (x.id === t.id ? next : x)))
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    const payload = {
      project_id: projectId,
      title: editing.title?.trim() ?? '',
      description: editing.description ?? '',
      due_date: editing.due_date,
      assignee_id: editing.assignee_id || null,
      position: editing.position ?? (tasks?.length ?? 0),
    }
    const { error } = editing.id
      ? await supabase.from('project_tasks').update(payload).eq('id', editing.id)
      : await supabase.from('project_tasks').insert(payload)
    if (error) return toast(error.message)
    setEditing(null); toast('Tarea guardada'); load()
  }

  async function remove() {
    if (!editing?.id) return
    await supabase.from('project_tasks').delete().eq('id', editing.id)
    setEditing(null); load()
  }

  if (!tasks) return <Skeleton h={70} n={4} />
  const done = tasks.filter((t) => t.done_at).length

  return (
    <>
      <div className="row" style={{ marginBottom: 18 }}>
        {tasks.length > 0 && (
          <div style={{ flex: 1, maxWidth: 360 }}>
            <Progress value={(done / tasks.length) * 100} />
            <div className="small muted" style={{ marginTop: 6 }}>{done} de {tasks.length} etapas</div>
          </div>
        )}
        <span className="spacer" />
        {isCoordinator && (
          <button className="btn ghost sm" onClick={() => setEditing({ due_date: isoDate(addDays(today(), 14)), description: '' })}>
            <Icon name="plus" />Tarea
          </button>
        )}
      </div>

      {tasks.length === 0 ? <Empty icon="tasks">Sin plan de trabajo</Empty> : (
        <div className="stack stagger">
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} assigneeName={name(t.assignee_id) ?? (t.assignee_id ? '' : 'Equipo')} canToggle onToggle={onToggle} onEdit={isCoordinator ? (x) => setEditing(x) : undefined} />
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Editar tarea' : 'Nueva tarea'}
          onClose={() => setEditing(null)}
          footer={<>
            {editing.id && <button className="btn danger" onClick={remove} style={{ marginRight: 'auto' }}>Eliminar</button>}
            <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn primary" form="task-form" disabled={!editing.title?.trim() || !editing.due_date}>Guardar</button>
          </>}
        >
          <form id="task-form" onSubmit={save} className="form-grid">
            <Field label="Título" required full>
              <input className="input" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus />
            </Field>
            <Field label="Fecha límite" required>
              <input className="input" type="date" value={editing.due_date ?? ''} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} />
            </Field>
            <Field label="Responsable">
              <select className="select" value={editing.assignee_id ?? ''} onChange={(e) => setEditing({ ...editing, assignee_id: e.target.value || null })}>
                <option value="">Todo el equipo</option>
                {members.map((m) => <option key={m.user_id} value={m.user_id}>{name(m.user_id)}</option>)}
              </select>
            </Field>
            <Field label="Pasos a seguir" hint="Uno por línea" full>
              <textarea className="textarea" rows={5} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
          </form>
        </Modal>
      )}
    </>
  )
}
