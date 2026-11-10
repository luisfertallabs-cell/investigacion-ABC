import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { matchesUser, myMemberships, tasksFor } from '../lib/data'
import { MEMBER_STATUS, PROJECT_STATUS } from '../lib/catalog'
import type { Congress, Member, Project, Task } from '../lib/types'
import { Deadline, Empty, Progress, Skeleton } from '../components/ui'
import { Icon } from '../components/Icon'

type Tab = 'mios' | 'disponibles' | 'todos'

export default function Projects() {
  const { profile, isCoordinator, specialties, specialtyName } = useAuth()
  const [tab, setTab] = useState<Tab>(isCoordinator ? 'todos' : 'mios')
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [congresses, setCongresses] = useState<Congress[]>([])

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const [ps, ms, cs] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }).then((r) => (r.data as Project[]) ?? []),
        myMemberships(profile.id),
        supabase.from('congresses').select('*').then((r) => (r.data as Congress[]) ?? []),
      ])
      setProjects(ps); setMembers(ms); setCongresses(cs)
      const visible = isCoordinator ? 'all' : ms.filter((m) => m.status === 'aceptado').map((m) => m.project_id)
      setTasks(await tasksFor(visible))
      setLoading(false)
    })()
  }, [profile, isCoordinator])

  const statusOf = useMemo(() => new Map(members.map((m) => [m.project_id, m.status])), [members])

  if (!profile) return null

  const list = projects.filter((p) => {
    const st = statusOf.get(p.id)
    if (tab === 'mios') return st && st !== 'rechazado'
    if (tab === 'disponibles') return p.status === 'abierto' && !st
    return true
  }).sort((a, b) => {
    if (tab !== 'disponibles') return 0
    const ma = matchesUser(a.specialty_id, profile.specialty_id, profile.subspecialty_id, specialties) ? 0 : 1
    const mb = matchesUser(b.specialty_id, profile.specialty_id, profile.subspecialty_id, specialties) ? 0 : 1
    return ma - mb
  })

  const tabs: { id: Tab; label: string }[] = [
    ...(isCoordinator ? [{ id: 'todos' as Tab, label: 'Todos' }] : []),
    { id: 'mios', label: isCoordinator ? 'Donde participo' : 'Mis proyectos' },
    { id: 'disponibles', label: 'Disponibles' },
  ]

  return (
    <>
      <div className="page-head">
        <h1>Proyectos</h1>
        {isCoordinator && <Link to="/proyectos/nuevo" className="btn primary"><Icon name="plus" />Nuevo proyecto</Link>}
      </div>

      <div className="tabs">
        {tabs.map((t) => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {loading ? <Skeleton h={150} n={2} /> : list.length === 0 ? (
        <Empty icon="folder">{tab === 'disponibles' ? 'No hay proyectos abiertos' : 'Aún no hay proyectos'}</Empty>
      ) : (
        <div className="grid auto stagger" key={tab}>
          {list.map((p) => {
            const ts = tasks.filter((t) => t.project_id === p.id)
            const done = ts.filter((t) => t.done_at).length
            const next = ts.find((t) => !t.done_at)
            const st = statusOf.get(p.id)
            const congress = congresses.find((c) => c.id === p.congress_id)
            const forMe = matchesUser(p.specialty_id, profile.specialty_id, profile.subspecialty_id, specialties)
            return (
              <Link key={p.id} to={`/proyectos/${p.id}`} className="card link" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className={`chip ${p.status === 'abierto' ? 'ok' : p.status === 'en_curso' ? 'brand' : ''}`}>{PROJECT_STATUS[p.status]}</span>
                  {st && st !== 'aceptado' && <span className="chip soon">{MEMBER_STATUS[st]}</span>}
                  {tab === 'disponibles' && forMe && <span className="chip brand">Tu área</span>}
                </div>
                <div>
                  <h3 className="clamp">{p.title}</h3>
                  <div className="muted small" style={{ marginTop: 4 }}>{specialtyName(p.specialty_id)}{congress ? `, ${congress.acronym ?? congress.name}` : ''}</div>
                </div>
                {ts.length > 0 && (
                  <div style={{ marginTop: 'auto' }}>
                    <Progress value={(done / ts.length) * 100} />
                    <div className="row small muted" style={{ marginTop: 8 }}>
                      <span>{done} de {ts.length}</span>
                      <span className="spacer" />
                      {next && <Deadline date={next.due_date} />}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
