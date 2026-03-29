import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import UnitSelector from './pages/UnitSelector'
import SectorSelector from './pages/SectorSelector'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { user, loading } = useAuth()
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedSector, setSelectedSector] = useState(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-4xl mb-3">🏥</div>
          <div className="text-gray-400 font-medium">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  if (!selectedUnit) {
    return <UnitSelector onSelect={(unit) => setSelectedUnit(unit)} />
  }

  if (!selectedSector) {
    return (
      <SectorSelector
        unit={selectedUnit}
        onSelect={(sector) => setSelectedSector(sector)}
        onBack={() => setSelectedUnit(null)}
      />
    )
  }

  return (
    <Dashboard
      unit={selectedUnit}
      sector={selectedSector}
      onBack={() => setSelectedSector(null)}
    />
  )
}
