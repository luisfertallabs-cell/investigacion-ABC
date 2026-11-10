import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { isConfigured } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Recover from './pages/Recover'
import UpdatePassword from './pages/UpdatePassword'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import ProjectEditor from './pages/ProjectEditor'
import Tasks from './pages/Tasks'
import Congresses from './pages/Congresses'
import Profile from './pages/Profile'
import Team from './pages/Team'
import Setup from './pages/Setup'

export default function App() {
  const { session, profile, loading, dbReady, recovering, isCoordinator } = useAuth()
  const location = useLocation()

  if (!isConfigured) return <Setup />
  if (!dbReady) return <Setup database />
  if (loading) return <div className="splash"><img src="./favicon.png" alt="" /></div>
  if (recovering) return <UpdatePassword />

  if (!session) {
    return (
      <Routes>
        <Route path="/entrar" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/recuperar" element={<Recover />} />
        <Route path="*" element={<Navigate to="/entrar" replace state={{ from: location.pathname }} />} />
      </Routes>
    )
  }

  if (!profile) return <div className="splash"><img src="./favicon.png" alt="" /></div>
  if (!profile.full_name || !profile.specialty_id || !profile.birth_date || !profile.gender) return <Onboarding />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/proyectos" element={<Projects />} />
        <Route path="/proyectos/nuevo" element={isCoordinator ? <ProjectEditor /> : <Navigate to="/proyectos" />} />
        <Route path="/proyectos/:id" element={<ProjectDetail />} />
        <Route path="/proyectos/:id/editar" element={isCoordinator ? <ProjectEditor /> : <Navigate to="/proyectos" />} />
        <Route path="/tareas" element={<Tasks />} />
        <Route path="/congresos" element={<Congresses />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/equipo" element={isCoordinator ? <Team /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
