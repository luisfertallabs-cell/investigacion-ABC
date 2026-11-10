import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { allCongresses, isMine, matchesUser, myMemberships, projectsByIds, setMemberStatus, tasksFor, toggleTask } from '../lib/data'
import { daysUntil, firstName, fmtDate, fmtRange, greeting } from '../lib/format'
import type { Congress, Member, Project, Task } from '../lib/types'
import { DateBox, Deadline, Empty, Skeleton, useToast } from '../components/ui'
import { Icon } from '../components/Icon'
import TaskItem from '../components/TaskItem'

export default function Dashboard() {
  const { profile, isCoordinator, specialties, specialtyName } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [congresses, setCongresses] = useState<Congress[]>([])
  const [openProjects, setOpenProjects] = useState<Project[]>([])
  const [records, setRecords] = useState(0)
  const [requests, setRequests] = useState(0)

  async function load() {
    if (!profile) return
    const ms = await myMemberships(profile.id)
    setMembers(ms)
    const accepted = ms.filter((m) => m.status === 'aceptado').map((m) => m.project_id)
    const linked = ms.filter((m) => m.status !== 'rechazado').map((m) => m.project_id)
    const [ps, ts, cs, open, rec] = await Promise.all([
      isCoordinator
        ? supabase.from('projects').select('*').neq('status', 'cerrado').order('created_at', { ascending: false }).then((r) => (r.data as Project[]) ?? [])
        : projectsByIds(linked),
      tasksFor(isCoordinator ? 'all' : accepted),
      allCongresses(),
      supabase.from('projects').select('*').eq('status', 'abierto').then((r) => (r.data as Project[]) ?? []),
      supabase.from('records').select('*', { count: 'exact', head: true }).eq('created_by', profile.id),
    ])
    setProjects(ps)
    setTasks(ts)
    setCongresses(cs)
    setOpenProjects(open.filter((p) => !linked.includes(p.id)))
    setRecords(rec.count ?? 0)
    if (isCoordinator) {
      const { count } = await supabase.from('project_members').select('*', { count: 'exact', head: true }).eq('status', 'solicitado')
      setRequests(count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null
  const title = (id: string) => projects.find((p) => p.id === id)?.title
  const invites = members.filter((m) => m.status === 'invitado')
  const myTasks = tasks.filter((t) => !t.done_at && (isCoordinator || isMine(t, profile.id)))
  const upcoming = myTasks.slice(0, 5)
  const late = myTasks.filter((t) => (daysUntil(t.due_date) ?? 0) < 0).length
  const activeCount = isCoordinator ? projects.length : members.filter((m) => m.status === 'aceptado').length

  const forMe = (id: number | null) => matchesUser(id, profile.specialty_id, profile.subspecialty_id, specialties)
  const openCalls = congresses
    .filter((c) => (daysUntil(c.abstract_deadline) ?? -1) >= 0 || (daysUntil(c.start_date) ?? -1) >= 0)
    .sort((a, b) => (a.abstract_deadline ?? a.start_date ?? '').localeCompare(b.abstract_deadline ?? b.start_date ?? ''))
  const recCongresses = [...openCalls.filter((c) => forMe(c.specialty_id)), ...openCalls.filter((c) => !forMe(c.specialty_id))].slice(0, 3)
  const recProjects = openProjects.filter((p) => forMe(p.specialty_id) || !p.specialty_id).slice(0, 3)

  async function respond(m: Member, status: 'aceptado' | 'rechazado') {
    const { error } = await setMemberStatus(m.project_id, m.user_id, status)
    if (error) return toast('No se pudo guardar')
    toast(status === 'aceptado' ? 'Bienvenido al proyecto' : 'Invitación rechazada')
    load()
  }

  async function onToggle(t: Task) {
    const next = await toggleTask(t)
    setTasks((all) => all.map((x) => (x.id === t.id ? next : x)))
  }

  const nextCall = openCalls.find((c) => (daysUntil(c.abstract_deadline) ?? -1) >= 0)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{fmtDate(new Date().toISOString().slice(0, 10), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{greeting()}, {firstName(profile.full_name)}</h1>
        </div>
        {isCoordinator && <Link to="/proyectos/nuevo" className="btn primary"><Icon name="plus" />Nuevo proyecto</Link>}
      </div>

      {loading ? <Skeleton h={96} n={3} /> : (
        <>
          <div className="grid three stagger">
            <Link to="/tareas" className="card link stat">
              <b>{myTasks.length}</b>
              <span>Tareas pendientes{late > 0 && <span className="chip late" style={{ marginLeft: 8 }}>{late} vencidas</span>}</span>
            </Link>
            <Link to="/proyectos" className="card link stat">
              <b>{activeCount}</b>
              <span>{isCoordinator ? 'Proyectos activos' : 'Mis proyectos'}{requests > 0 && <span className="chip brand" style={{ marginLeft: 8 }}>{requests} solicitudes</span>}</span>
            </Link>
            {isCoordinator || !nextCall ? (
              <div className="card stat"><b>{records}</b><span>Registros capturados</span></div>
            ) : (
              <Link to="/congresos" className="card link stat">
                <b>{daysUntil(nextCall.abstract_deadline)}</b>
                <span>Días para enviar a {nextCall.acronym ?? nextCall.name}</span>
              </Link>
            )}
          </div>

          {invites.length > 0 && (
            <section className="section">
              <div className="section-head"><h2>Invitaciones</h2></div>
              <div className="stack stagger">
                {invites.map((m) => (
                  <div key={m.project_id} className="card row wrap">
                    <span className="avatar"><Icon name="mail" /></span>
                    <Link to={`/proyectos/${m.project_id}`} style={{ flex: 1, minWidth: 200, color: 'inherit' }}>
                      <div className="strong">{title(m.project_id)}</div>
                      <div className="muted small">Te invitaron a colaborar</div>
                    </Link>
                    <button className="btn ghost sm" onClick={() => respond(m, 'rechazado')}>Rechazar</button>
                    <button className="btn primary sm" onClick={() => respond(m, 'aceptado')}>Aceptar</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-head"><h2>Próximas tareas</h2>{myTasks.length > 5 && <Link to="/tareas">Ver todas</Link>}</div>
            {upcoming.length ? (
              <div className="stack stagger">
                {upcoming.map((t) => <TaskItem key={t.id} task={t} projectTitle={title(t.project_id)} canToggle onToggle={onToggle} />)}
              </div>
            ) : <Empty icon="check">Sin tareas pendientes</Empty>}
          </section>

          <section className="section">
            <div className="section-head"><h2>Para ti</h2><Link to="/congresos">Congresos</Link></div>
            <div className="grid auto stagger">
              {recCongresses.map((c) => (
                <Link key={c.id} to="/congresos" className="card link row" style={{ alignItems: 'flex-start' }}>
                  <DateBox date={c.start_date} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="strong clamp">{c.acronym ?? c.name}</div>
                    <div className="muted small">{fmtRange(c.start_date, c.end_date)}</div>
                    <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                      {forMe(c.specialty_id) && <span className="chip brand">Tu área</span>}
                      {c.abstract_deadline && (daysUntil(c.abstract_deadline) ?? -1) >= 0 && <Deadline date={c.abstract_deadline} />}
                    </div>
                  </div>
                </Link>
              ))}
              {!isCoordinator && recProjects.map((p) => (
                <Link key={p.id} to={`/proyectos/${p.id}`} className="card link">
                  <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                    <span className="chip ok">Proyecto abierto</span>
                  </div>
                  <div className="strong clamp">{p.title}</div>
                  <div className="muted small">{specialtyName(p.specialty_id)}</div>
                </Link>
              ))}
            </div>
            {!recCongresses.length && !recProjects.length && <Empty icon="calendar">Sin recomendaciones por ahora</Empty>}
          </section>
        </>
      )}
    </>
  )
}
