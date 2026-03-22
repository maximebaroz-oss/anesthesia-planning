import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import SectorSelector from './pages/SectorSelector'
import UnitSelector from './pages/UnitSelector'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { user, loading } = useAuth()
  const [selectedSector, setSelectedSector] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)

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

  if (!selectedSector) {
    return <SectorSelector onSelect={(sector) => setSelectedSector(sector)} />
  }

  if (!selectedUnit) {
    return (
      <UnitSelector
        sector={selectedSector}
        onSelect={(unit) => setSelectedUnit(unit)}
        onBack={() => setSelectedSector(null)}
      />
    )
  }

  return (
    <Dashboard
      sector={selectedSector}
      unit={selectedUnit}
      onBack={() => setSelectedUnit(null)}
    />
  )
}
