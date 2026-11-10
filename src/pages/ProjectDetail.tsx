import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { requestJoin, setMemberStatus } from '../lib/data'
import { PROJECT_STATUS } from '../lib/catalog'
import { fmtDate, fmtRange } from '../lib/format'
import type { Congress, Member, Project, Variable } from '../lib/types'
import { Deadline, Skeleton, useToast } from '../components/ui'
import { Icon } from '../components/Icon'
import PlanTab from '../components/project/PlanTab'
import DataTab from '../components/project/DataTab'
import VariablesTab from '../components/project/VariablesTab'
import TeamTab from '../components/project/TeamTab'

type Tab = 'plan' | 'datos' | 'variables' | 'equipo'
const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'datos', label: 'Base de datos' },
  { id: 'variables', label: 'Variables' },
  { id: 'equipo', label: 'Equipo' },
]

export default function ProjectDetail() {
  const { id } = useParams() as { id: string }
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const { profile, isCoordinator, specialtyName } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [congress, setCongress] = useState<Congress | null>(null)
  const [membership, setMembership] = useState<Member | null>(null)
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const tab = (params.get('tab') as Tab) || 'plan'

  const loadVariables = useCallback(async () => {
    const { data } = await supabase.from('project_variables').select('*').eq('project_id', id).order('position')
    setVariables((data as Variable[]) ?? [])
  }, [id])

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
    const p = data as Project | null
    setProject(p)
    if (p?.congress_id) {
      const { data: c } = await supabase.from('congresses').select('*').eq('id', p.congress_id).maybeSingle()
      setCongress(c as Congress)
    }
    const { data: m } = await supabase.from('project_members').select('*').eq('project_id', id).eq('user_id', profile.id).maybeSingle()
    setMembership(m as Member | null)
    await loadVariables()
    setLoading(false)
  }, [id, profile, loadVariables])

  useEffect(() => { load() }, [load])

  if (loading) return <Skeleton h={120} n={3} />
  if (!project || !profile) {
    return <div className="empty">Proyecto no disponible. <Link to="/proyectos">Volver</Link></div>
  }

  const isMember = membership?.status === 'aceptado'
  const full = isCoordinator || isMember

  async function respond(status: 'aceptado' | 'rechazado') {
    const { error } = await setMemberStatus(id, profile!.id, status)
    if (error) return toast('No se pudo guardar')
    toast(status === 'aceptado' ? 'Bienvenido al proyecto' : 'Invitación rechazada')
    if (status === 'rechazado') nav('/proyectos')
    else load()
  }

  async function join() {
    const { error } = await requestJoin(id, profile!.id)
    if (error) return toast('No se pudo enviar')
    toast('Solicitud enviada')
    load()
  }

  async function cancelRequest() {
    await supabase.from('project_members').delete().eq('project_id', id).eq('user_id', profile!.id)
    load()
  }

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link to="/proyectos" className="btn quiet sm" style={{ marginLeft: -10, marginBottom: 8 }}><Icon name="back" />Proyectos</Link>
          <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
            <span className={`chip ${project.status === 'abierto' ? 'ok' : project.status === 'en_curso' ? 'brand' : ''}`}>{PROJECT_STATUS[project.status]}</span>
            {project.design && <span className="chip outline">{project.design}</span>}
            {project.specialty_id && <span className="chip outline">{specialtyName(project.specialty_id)}</span>}
          </div>
          <h1>{project.title}</h1>
        </div>
        {isCoordinator && <Link to={`/proyectos/${id}/editar`} className="btn ghost"><Icon name="edit" />Editar</Link>}
      </div>

      <div className={full ? 'grid two' : 'stack'} style={{ marginBottom: 28, gridTemplateColumns: full ? '1.6fr 1fr' : undefined }}>
        {project.summary && (
          <div className="card flat">
            <p style={{ whiteSpace: 'pre-line', color: 'var(--ink-2)' }}>{project.summary}</p>
          </div>
        )}
        {(congress || project.target_n) && (
          <div className="card flat stack" style={{ gap: 14 }}>
            {congress && (
              <div>
                <div className="tiny muted">Congreso objetivo</div>
                <div className="strong">{congress.acronym ?? congress.name}</div>
                <div className="small muted">{fmtRange(congress.start_date, congress.end_date)}</div>
                {congress.abstract_deadline && (
                  <div className="row small" style={{ marginTop: 6 }}>Envío {fmtDate(congress.abstract_deadline)} <Deadline date={congress.abstract_deadline} /></div>
                )}
              </div>
            )}
            {project.target_n && (
              <div>
                <div className="tiny muted">Muestra meta</div>
                <div className="strong">{project.target_n} pacientes</div>
              </div>
            )}
          </div>
        )}
      </div>

      {!full && (
        <div className="card row wrap" style={{ marginBottom: 28 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            {membership?.status === 'invitado' && <><div className="strong">Te invitaron a este proyecto</div><div className="muted small">Al aceptar verás el plan y la base de datos</div></>}
            {membership?.status === 'solicitado' && <><div className="strong">Solicitud enviada</div><div className="muted small">El coordinador la revisará</div></>}
            {membership?.status === 'rechazado' && <div className="muted">No participas en este proyecto</div>}
            {!membership && <><div className="strong">¿Te interesa?</div><div className="muted small">{variables.length} variables a capturar</div></>}
          </div>
          {membership?.status === 'invitado' && <>
            <button className="btn ghost" onClick={() => respond('rechazado')}>Rechazar</button>
            <button className="btn primary" onClick={() => respond('aceptado')}>Aceptar</button>
          </>}
          {membership?.status === 'solicitado' && <button className="btn ghost" onClick={cancelRequest}>Retirar</button>}
          {!membership && project.status === 'abierto' && <button className="btn primary" onClick={join}>Me interesa</button>}
        </div>
      )}

      {full && (
        <>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setParams({ tab: t.id }, { replace: true })}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="page" key={tab}>
            {tab === 'plan' && <PlanTab projectId={id} />}
            {tab === 'datos' && <DataTab project={project} variables={variables} />}
            {tab === 'variables' && <VariablesTab projectId={id} variables={variables} onChange={loadVariables} />}
            {tab === 'equipo' && <TeamTab project={project} />}
          </div>
        </>
      )}
    </>
  )
}
