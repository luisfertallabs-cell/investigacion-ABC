import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { isMine, myMemberships, tasksFor, toggleTask } from '../lib/data'
import { daysUntil } from '../lib/format'
import type { Project, Task } from '../lib/types'
import { Empty, Skeleton } from '../components/ui'
import TaskItem from '../components/TaskItem'

type Scope = 'mias' | 'todas'

export default function Tasks() {
  const { profile, isCoordinator } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<string>('')
  const [scope, setScope] = useState<Scope>('mias')
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const ms = await myMemberships(profile.id)
      const accepted = ms.filter((m) => m.status === 'aceptado').map((m) => m.project_id)
      const ids = isCoordinator ? 'all' : accepted
      const [ts, ps] = await Promise.all([
        tasksFor(ids),
        supabase.from('projects').select('*').neq('status', 'cerrado').then((r) => (r.data as Project[]) ?? []),
      ])
      setProjects(ps)
      setTasks(ts.filter((t) => ps.some((p) => p.id === t.project_id)))
      if (isCoordinator && !accepted.length) setScope('todas')
    })()
  }, [profile, isCoordinator])

  if (!profile) return null
  const title = (id: string) => projects.find((p) => p.id === id)?.title

  async function onToggle(t: Task) {
    const next = await toggleTask(t)
    setTasks((all) => all!.map((x) => (x.id === t.id ? next : x)))
  }

  const list = (tasks ?? []).filter((t) => (!filter || t.project_id === filter) && (scope === 'todas' || isMine(t, profile.id)))
  const pending = list.filter((t) => !t.done_at)
  const groups = [
    { label: 'Vencidas', items: pending.filter((t) => (daysUntil(t.due_date) ?? 0) < 0) },
    { label: 'Esta semana', items: pending.filter((t) => { const d = daysUntil(t.due_date) ?? 0; return d >= 0 && d <= 7 }) },
    { label: 'Próximas', items: pending.filter((t) => (daysUntil(t.due_date) ?? 0) > 7) },
  ]
  const done = list.filter((t) => t.done_at)
  const projectIds = [...new Set((tasks ?? []).map((t) => t.project_id))]

  return (
    <>
      <div className="page-head">
        <h1>Tareas</h1>
        <div className="row wrap">
          {isCoordinator && (
            <div className="segmented">
              <button className={scope === 'mias' ? 'on' : ''} onClick={() => setScope('mias')}>Mías</button>
              <button className={scope === 'todas' ? 'on' : ''} onClick={() => setScope('todas')}>Todas</button>
            </div>
          )}
          {projectIds.length > 1 && (
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 240 }}>
              <option value="">Todos los proyectos</option>
              {projectIds.map((id) => <option key={id} value={id}>{title(id)}</option>)}
            </select>
          )}
        </div>
      </div>

      {!tasks ? <Skeleton h={70} n={5} /> : !list.length ? <Empty icon="check">Sin tareas asignadas</Empty> : (
        <>
          {groups.filter((g) => g.items.length).map((g) => (
            <section key={g.label} className="section" style={{ marginTop: 0, marginBottom: 32 }}>
              <div className="section-head"><h2>{g.label}</h2><span className="muted small">{g.items.length}</span></div>
              <div className="stack stagger">
                {g.items.map((t) => <TaskItem key={t.id} task={t} projectTitle={title(t.project_id)} canToggle onToggle={onToggle} />)}
              </div>
            </section>
          ))}
          {!pending.length && <Empty icon="check">Todo al día</Empty>}
          {done.length > 0 && (
            <section className="section">
              <button className="btn quiet sm" onClick={() => setShowDone(!showDone)} style={{ marginLeft: -10 }}>
                {showDone ? 'Ocultar' : 'Ver'} completadas ({done.length})
              </button>
              {showDone && (
                <div className="stack stagger" style={{ marginTop: 12 }}>
                  {done.map((t) => <TaskItem key={t.id} task={t} projectTitle={title(t.project_id)} canToggle onToggle={onToggle} />)}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  )
}
