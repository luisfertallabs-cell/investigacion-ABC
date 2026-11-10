import { supabase } from './supabase'
import type { Congress, Member, MemberStatus, Project, Task } from './types'
import type { Specialty } from './types'

export async function myMemberships(uid: string) {
  const { data } = await supabase.from('project_members').select('*').eq('user_id', uid)
  return (data as Member[]) ?? []
}

export async function projectsByIds(ids: string[]) {
  if (!ids.length) return []
  const { data } = await supabase.from('projects').select('*').in('id', ids).order('created_at', { ascending: false })
  return (data as Project[]) ?? []
}

export async function tasksFor(projectIds: string[] | 'all') {
  let q = supabase.from('project_tasks').select('*').order('due_date').order('position')
  if (projectIds !== 'all') {
    if (!projectIds.length) return []
    q = q.in('project_id', projectIds)
  }
  const { data } = await q
  return (data as Task[]) ?? []
}

export async function setMemberStatus(projectId: string, userId: string, status: MemberStatus) {
  return supabase.from('project_members').update({ status }).eq('project_id', projectId).eq('user_id', userId)
}

export async function requestJoin(projectId: string, userId: string) {
  return supabase.from('project_members').insert({ project_id: projectId, user_id: userId, status: 'solicitado' })
}

export async function toggleTask(task: Task) {
  const done_at = task.done_at ? null : new Date().toISOString()
  const { error } = await supabase.from('project_tasks').update({ done_at }).eq('id', task.id)
  return error ? task : { ...task, done_at }
}

export async function allCongresses() {
  const { data } = await supabase.from('congresses').select('*').order('start_date', { nullsFirst: false })
  return (data as Congress[]) ?? []
}

export function parentOf(specialties: Specialty[]) {
  const m = new Map(specialties.map((s) => [s.id, s.parent_id]))
  return (id: number) => m.get(id) ?? null
}

/** Un elemento es relevante si su especialidad coincide con la del usuario, su subespecialidad o la especialidad madre. */
export function matchesUser(target: number | null, spec: number | null, sub: number | null, specialties: Specialty[]) {
  if (!target) return false
  if (target === spec || target === sub) return true
  const parent = parentOf(specialties)(target)
  return parent !== null && parent === spec && !sub
}

export function isMine(task: Task, uid: string) {
  return !task.assignee_id || task.assignee_id === uid
}
