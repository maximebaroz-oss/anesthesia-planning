import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🏥</div>
          <div className="text-blue-700 font-medium">Chargement...</div>
        </div>
      </div>
    )
  }

  return user ? <Dashboard /> : <Login />
}
