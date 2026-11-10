import type { Gender, MemberStatus, ProjectStatus, VariableType } from './types'
import { addDays, isoDate, today } from './format'

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'no_binario', label: 'No binario' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
]

export const PROJECT_STATUS: Record<ProjectStatus, string> = {
  abierto: 'Abierto',
  en_curso: 'En curso',
  cerrado: 'Cerrado',
}

export const MEMBER_STATUS: Record<MemberStatus, string> = {
  invitado: 'Invitación',
  solicitado: 'Solicitud',
  aceptado: 'Integrante',
  rechazado: 'Rechazado',
}

export const VARIABLE_TYPES: { value: VariableType; label: string }[] = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número decimal' },
  { value: 'entero', label: 'Número entero' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'si_no', label: 'Sí o no' },
  { value: 'opcion', label: 'Opción única' },
  { value: 'multiple', label: 'Opción múltiple' },
]

export const DESIGNS = [
  'Cohorte retrospectiva',
  'Cohorte prospectiva',
  'Casos y controles',
  'Transversal',
  'Serie de casos',
  'Reporte de caso',
  'Ensayo clínico',
  'Revisión sistemática',
]

export interface VariableTemplate {
  key: string
  label: string
  type: VariableType
  options?: string[]
  unit?: string
  group: string
}

export const VARIABLE_LIBRARY: VariableTemplate[] = [
  { group: 'Demografía', key: 'edad', label: 'Edad', type: 'entero', unit: 'años' },
  { group: 'Demografía', key: 'sexo', label: 'Sexo', type: 'opcion', options: ['Femenino', 'Masculino'] },
  { group: 'Demografía', key: 'imc', label: 'IMC', type: 'numero', unit: 'kg/m²' },
  { group: 'Demografía', key: 'asa', label: 'ASA', type: 'opcion', options: ['I', 'II', 'III', 'IV', 'V'] },
  { group: 'Demografía', key: 'comorbilidades', label: 'Comorbilidades', type: 'multiple', options: ['Diabetes tipo 2', 'Hipertensión', 'Obesidad', 'Enfermedad renal crónica', 'EPOC', 'Cardiopatía', 'Tabaquismo'] },
  { group: 'Cirugía', key: 'diagnostico', label: 'Diagnóstico', type: 'texto' },
  { group: 'Cirugía', key: 'fecha_cirugia', label: 'Fecha de cirugía', type: 'fecha' },
  { group: 'Cirugía', key: 'procedimiento', label: 'Procedimiento', type: 'texto' },
  { group: 'Cirugía', key: 'tipo_cirugia', label: 'Tipo de cirugía', type: 'opcion', options: ['Electiva', 'Urgencia'] },
  { group: 'Cirugía', key: 'abordaje', label: 'Abordaje', type: 'opcion', options: ['Abierto', 'Laparoscópico', 'Robótico', 'Conversión'] },
  { group: 'Cirugía', key: 'tiempo_quirurgico', label: 'Tiempo quirúrgico', type: 'entero', unit: 'min' },
  { group: 'Cirugía', key: 'sangrado', label: 'Sangrado', type: 'entero', unit: 'mL' },
  { group: 'Desenlaces', key: 'estancia', label: 'Estancia hospitalaria', type: 'entero', unit: 'días' },
  { group: 'Desenlaces', key: 'complicacion', label: 'Complicación', type: 'si_no' },
  { group: 'Desenlaces', key: 'clavien_dindo', label: 'Clavien Dindo', type: 'opcion', options: ['I', 'II', 'IIIa', 'IIIb', 'IVa', 'IVb', 'V'] },
  { group: 'Desenlaces', key: 'reintervencion', label: 'Reintervención', type: 'si_no' },
  { group: 'Desenlaces', key: 'readmision_30', label: 'Readmisión a 30 días', type: 'si_no' },
  { group: 'Desenlaces', key: 'mortalidad_30', label: 'Mortalidad a 30 días', type: 'si_no' },
  { group: 'Desenlaces', key: 'seguimiento', label: 'Seguimiento', type: 'entero', unit: 'meses' },
]

const PLAN = [
  { title: 'Revisión de literatura', weight: 10, description: 'Buscar en PubMed y Cochrane los últimos 5 años\nReunir de 10 a 20 artículos clave\nDefinir pregunta de investigación con el coordinador' },
  { title: 'Protocolo y comité', weight: 15, description: 'Redactar objetivo, hipótesis y criterios de inclusión\nConfirmar variables en la plataforma\nSometer a Comité de Ética e Investigación' },
  { title: 'Recolección de datos', weight: 35, description: 'Identificar casos en el expediente\nCapturar cada paciente con folio, nunca con nombre\nRevisar campos obligatorios' },
  { title: 'Análisis estadístico', weight: 15, description: 'Exportar la base en CSV\nDepurar datos faltantes o atípicos\nCorrer análisis descriptivo e inferencial' },
  { title: 'Redacción', weight: 15, description: 'Escribir resumen según formato del congreso o revista\nPreparar tablas y figuras\nCompartir borrador' },
  { title: 'Revisión del coordinador', weight: 7, description: 'Integrar comentarios\nVerificar autores y afiliaciones' },
  { title: 'Envío', weight: 3, description: 'Enviar en la plataforma del congreso o revista\nSubir comprobante al equipo' },
]

export function defaultPlan(deadline: string) {
  const start = today()
  const end = new Date(deadline + 'T00:00:00')
  const total = Math.max(7, Math.round((end.getTime() - start.getTime()) / 86400000))
  let acc = 0
  return PLAN.map((p, i) => {
    acc += p.weight
    const due = i === PLAN.length - 1 ? end : addDays(start, Math.round((total * acc) / 100))
    return { title: p.title, description: p.description, due_date: isoDate(due), position: i }
  })
}
