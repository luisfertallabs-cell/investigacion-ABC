import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { initials } from '../lib/format'

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, isCoordinator, specialtyName } = useAuth()
  const location = useLocation()
  const [pending, setPending] = useState({ invites: 0, tasks: 0 })

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { count: invites } = await supabase
        .from('project_members').select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id).eq('status', 'invitado')
      const { data: mine } = await supabase.from('project_members').select('project_id').eq('user_id', profile.id).eq('status', 'aceptado')
      const ids = (mine ?? []).map((m) => m.project_id)
      let tasks = 0
      if (ids.length) {
        const soon = new Date(); soon.setDate(soon.getDate() + 7)
        const { count } = await supabase.from('project_tasks').select('*', { count: 'exact', head: true })
          .in('project_id', ids).is('done_at', null).lte('due_date', soon.toISOString().slice(0, 10))
          .or(`assignee_id.is.null,assignee_id.eq.${profile.id}`)
        tasks = count ?? 0
      }
      setPending({ invites: invites ?? 0, tasks })
    })()
  }, [profile, location.pathname])

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [location.pathname])

  const nav = [
    { to: '/', icon: 'home', label: 'Inicio', end: true },
    { to: '/proyectos', icon: 'folder', label: 'Proyectos', count: pending.invites },
    { to: '/tareas', icon: 'tasks', label: 'Tareas', count: pending.tasks },
    { to: '/congresos', icon: 'calendar', label: 'Congresos' },
    ...(isCoordinator ? [{ to: '/equipo', icon: 'users', label: 'Equipo' }] : []),
  ]
  const mobileNav = [...nav.slice(0, 4), { to: '/perfil', icon: 'user', label: 'Perfil' }]

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <img src="./favicon.png" alt="" />
          <span>Investigación<small>Centro Médico ABC</small></span>
        </Link>
        <nav className="nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <Icon name={n.icon} />
              {n.label}
              {!!n.count && <span className="count">{n.count}</span>}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/perfil" className="me">
          <span className="avatar">{initials(profile?.full_name ?? '')}</span>
          <div>
            <strong>{profile?.full_name}</strong>
            <small>{isCoordinator ? 'Coordinación' : specialtyName(profile?.subspecialty_id) || specialtyName(profile?.specialty_id)}</small>
          </div>
        </NavLink>
      </aside>

      <main className="main">
        <div className="mobile-top">
          <img src="./favicon.png" alt="Centro Médico ABC" />
          {isCoordinator && <NavLink to="/equipo" className="icon-btn" aria-label="Equipo"><Icon name="users" /></NavLink>}
        </div>
        <div className="page" key={location.pathname}>{children}</div>
      </main>

      <nav className="tabbar">
        {mobileNav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
