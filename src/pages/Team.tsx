import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { loadDirectory } from '../lib/directory'
import { GENDERS } from '../lib/catalog'
import { initials, parseDate, today } from '../lib/format'
import type { Profile, Role } from '../lib/types'
import { Empty, Skeleton, useToast } from '../components/ui'

function age(birth: string | null) {
  if (!birth) return ''
  const b = parseDate(birth), t = today()
  let a = t.getFullYear() - b.getFullYear()
  if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) a--
  return String(a)
}

export default function Team() {
  const { profile: me, specialtyName, specialties } = useAuth()
  const toast = useToast()
  const [people, setPeople] = useState<Profile[] | null>(null)
  const [query, setQuery] = useState('')
  const [spec, setSpec] = useState('')

  const load = () => supabase.from('profiles').select('*').order('full_name').then(({ data }) => setPeople((data as Profile[]) ?? []))
  useEffect(() => { load() }, [])

  async function setRole(p: Profile, role: Role) {
    if (p.id === me?.id && !confirm('Perderás acceso de coordinación. ¿Continuar?')) return
    const { error } = await supabase.from('profiles').update({ role }).eq('id', p.id)
    if (error) return toast(error.message)
    toast('Rol actualizado'); loadDirectory(true); load()
  }

  const list = (people ?? []).filter((p) =>
    p.full_name.toLowerCase().includes(query.toLowerCase()) && (!spec || String(p.specialty_id) === spec))

  return (
    <>
      <div className="page-head">
        <h1>Equipo</h1>
        <div className="row wrap">
          <input className="input" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 200 }} />
          <select className="select" value={spec} onChange={(e) => setSpec(e.target.value)} style={{ width: 220 }}>
            <option value="">Todas las especialidades</option>
            {specialties.filter((s) => !s.parent_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {!people ? <Skeleton h={56} n={5} /> : !list.length ? <Empty icon="users">Sin resultados</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Año</th><th>Especialidad</th><th>Género</th><th>Edad</th><th>Rol</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><div className="row" style={{ gap: 10 }}><span className="avatar">{initials(p.full_name)}</span><span className="strong">{p.full_name}</span></div></td>
                  <td>{p.residency_year ? `R${p.residency_year}` : ''}</td>
                  <td><div>{specialtyName(p.specialty_id)}</div><div className="muted small">{specialtyName(p.subspecialty_id)}</div></td>
                  <td className="muted">{GENDERS.find((g) => g.value === p.gender)?.label}</td>
                  <td className="muted">{age(p.birth_date)}</td>
                  <td>
                    <select className="select" value={p.role} onChange={(e) => setRole(p, e.target.value as Role)} style={{ height: 36, width: 150 }}>
                      <option value="residente">Residente</option>
                      <option value="coordinador">Coordinador</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
