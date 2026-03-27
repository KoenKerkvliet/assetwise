import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Hardware from '@/pages/Hardware'
import HardwareDetail from '@/pages/HardwareDetail'
import Settings from '@/pages/Settings'
import Depreciation from '@/pages/Depreciation'
import Incidents from '@/pages/Incidents'
import HardwareArchive from '@/pages/HardwareArchive'
import HardwareDeleted from '@/pages/HardwareDeleted'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="hardware" element={<Hardware />} />
            <Route path="hardware/:id" element={<HardwareDetail />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="archive" element={<HardwareArchive />} />
            <Route path="deleted" element={<HardwareDeleted />} />
            <Route path="settings" element={<Settings />} />
            <Route path="depreciation" element={<Depreciation />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
