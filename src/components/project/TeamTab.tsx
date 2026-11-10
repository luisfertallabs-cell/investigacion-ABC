import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { matchesUser } from '../../lib/data'
import { useDirectory } from '../../lib/directory'
import { MEMBER_STATUS } from '../../lib/catalog'
import { initials } from '../../lib/format'
import type { Member, Project } from '../../lib/types'
import { Empty, Modal, Skeleton, useToast } from '../ui'
import { Icon } from '../Icon'

export default function TeamTab({ project }: { project: Project }) {
  const { isCoordinator, specialties, specialtyName } = useAuth()
  const toast = useToast()
  const people = useDirectory()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [inviting, setInviting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')

  async function load() {
    const { data } = await supabase.from('project_members').select('*').eq('project_id', project.id).order('created_at')
    setMembers((data as Member[]) ?? [])
  }
  useEffect(() => { load() }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const person = (id: string) => people.find((p) => p.id === id)

  async function setStatus(m: Member, status: Member['status']) {
    const { error } = await supabase.from('project_members').update({ status }).eq('project_id', m.project_id).eq('user_id', m.user_id)
    if (error) return toast(error.message)
    load()
  }

  async function removeMember(m: Member) {
    if (!confirm('¿Quitar del proyecto?')) return
    await supabase.from('project_members').delete().eq('project_id', m.project_id).eq('user_id', m.user_id)
    load()
  }

  async function invite() {
    const { error } = await supabase.from('project_members').insert(picked.map((user_id) => ({ project_id: project.id, user_id, status: 'invitado' })))
    if (error) return toast(error.message)
    toast(picked.length === 1 ? 'Invitación enviada' : `${picked.length} invitaciones enviadas`)
    setInviting(false); setPicked([]); load()
  }

  if (!members) return <Skeleton h={60} n={3} />

  const visible = isCoordinator ? members : members.filter((m) => m.status === 'aceptado')
  const linked = new Set(members.map((m) => m.user_id))
  const candidates = people
    .filter((p) => p.role === 'residente' && !linked.has(p.id) && p.full_name.toLowerCase().includes(query.toLowerCase()))
    .map((p) => ({ ...p, match: matchesUser(project.specialty_id, p.specialty_id, p.subspecialty_id, specialties) }))
    .sort((a, b) => Number(b.match) - Number(a.match) || a.full_name.localeCompare(b.full_name))

  const order: Member['status'][] = ['solicitado', 'aceptado', 'invitado', 'rechazado']

  return (
    <>
      {isCoordinator && (
        <div className="row" style={{ marginBottom: 18, justifyContent: 'flex-end' }}>
          <button className="btn primary sm" onClick={() => setInviting(true)}><Icon name="plus" />Invitar</button>
        </div>
      )}

      {visible.length === 0 ? <Empty icon="users">Sin integrantes</Empty> : (
        <div className="stack stagger">
          {[...visible].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status)).map((m) => {
            const p = person(m.user_id)
            return (
              <div key={m.user_id} className="card row wrap" style={{ padding: 16 }}>
                <span className="avatar">{initials(p?.full_name ?? '')}</span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="strong">{p?.full_name}</div>
                  <div className="small muted">{[p?.residency_year ? `R${p.residency_year}` : '', specialtyName(p?.subspecialty_id) || specialtyName(p?.specialty_id)].filter(Boolean).join(', ')}</div>
                </div>
                {m.status !== 'aceptado' && <span className={`chip ${m.status === 'solicitado' ? 'brand' : m.status === 'rechazado' ? 'late' : 'soon'}`}>{MEMBER_STATUS[m.status]}</span>}
                {isCoordinator && m.status === 'solicitado' && <>
                  <button className="btn ghost sm" onClick={() => setStatus(m, 'rechazado')}>Rechazar</button>
                  <button className="btn primary sm" onClick={() => setStatus(m, 'aceptado')}>Aceptar</button>
                </>}
                {isCoordinator && m.status !== 'solicitado' && (
                  <button className="icon-btn" onClick={() => removeMember(m)} aria-label="Quitar"><Icon name="x" /></button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {inviting && (
        <Modal title="Invitar residentes" onClose={() => setInviting(false)} footer={<>
          <button className="btn ghost" onClick={() => setInviting(false)}>Cancelar</button>
          <button className="btn primary" disabled={!picked.length} onClick={invite}>Invitar {picked.length || ''}</button>
        </>}>
          <input className="input" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 14 }} autoFocus />
          <div className="stack" style={{ gap: 6, maxHeight: 380, overflow: 'auto' }}>
            {candidates.length === 0 && <div className="muted small">Sin residentes disponibles</div>}
            {candidates.map((p) => (
              <label key={p.id} className="check" style={{ padding: '10px 12px', borderRadius: 12, background: picked.includes(p.id) ? 'var(--brand-softer)' : undefined, transition: 'background .3s' }}>
                <input type="checkbox" checked={picked.includes(p.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} />
                <span style={{ flex: 1 }}>
                  <span className="strong">{p.full_name}</span>
                  <span className="small muted"> R{p.residency_year}, {specialtyName(p.subspecialty_id) || specialtyName(p.specialty_id)}</span>
                </span>
                {p.match && <span className="chip brand">Afín</span>}
              </label>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}
