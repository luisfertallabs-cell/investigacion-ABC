export type Role = 'residente' | 'coordinador'
export type Gender = 'femenino' | 'masculino' | 'no_binario' | 'prefiero_no_decir'
export type ProjectStatus = 'abierto' | 'en_curso' | 'cerrado'
export type MemberStatus = 'invitado' | 'solicitado' | 'aceptado' | 'rechazado'
export type VariableType = 'texto' | 'numero' | 'entero' | 'fecha' | 'si_no' | 'opcion' | 'multiple'

export interface Specialty { id: number; name: string; parent_id: number | null; position: number }

export interface Profile {
  id: string
  full_name: string
  gender: Gender | null
  birth_date: string | null
  specialty_id: number | null
  subspecialty_id: number | null
  residency_year: number | null
  role: Role
  created_at: string
}

export interface Congress {
  id: string
  name: string
  acronym: string | null
  society: string | null
  specialty_id: number | null
  city: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  abstract_deadline: string | null
  url: string | null
  confirmed: boolean
}

export interface Project {
  id: string
  title: string
  summary: string
  design: string | null
  specialty_id: number | null
  congress_id: string | null
  target_n: number | null
  status: ProjectStatus
  created_at: string
}

export interface Member { project_id: string; user_id: string; status: MemberStatus; created_at: string; responded_at: string | null }

export interface Variable {
  id: string
  project_id: string
  key: string
  label: string
  type: VariableType
  options: string[]
  unit: string | null
  required: boolean
  position: number
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string
  due_date: string
  assignee_id: string | null
  position: number
  done_at: string | null
}

export interface RecordRow {
  id: string
  project_id: string
  folio: string
  data: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}
