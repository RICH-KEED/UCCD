import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { Login } from './vite-pages/Login'
import { LandingPage } from './vite-pages/LandingPage'
import { Dashboard } from './vite-pages/Dashboard'
import { AllComplaints } from './vite-pages/AllComplaints'
import { SlaBreaches } from './vite-pages/SlaBreaches'
import { ThreeSixtyView } from './vite-pages/ThreeSixtyView'
import { Escalations } from './vite-pages/Escalations'
import { AiDrafts } from './vite-pages/AiDrafts'
import { Trends } from './vite-pages/Trends'
import { RootCause } from './vite-pages/RootCause'
import { RegulatoryReports } from './vite-pages/RegulatoryReports'
import { SearchPage } from './vite-pages/SearchPage'
import { ComplaintDetail } from './vite-pages/ComplaintDetail'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { NotFound } from './components/uccd/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/landing" element={<LandingPage />} />

        {/* Protected */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="complaints" element={<AllComplaints />} />
          <Route path="complaints/:id" element={<ComplaintDetail />} />
          <Route path="escalations" element={<Escalations />} />
          <Route path="sla-breaches" element={<SlaBreaches />} />
          <Route path="360-view" element={<ThreeSixtyView />} />
          <Route path="drafts" element={<AiDrafts />} />
          <Route path="trends" element={<Trends />} />
          <Route path="root-cause" element={<RootCause />} />
          <Route path="regulatory" element={<RegulatoryReports />} />
          <Route path="search" element={<SearchPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
