import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Skeleton from './components/Skeleton.jsx'
import { useAuth } from './contexts/AuthContext.jsx'
import { useTheme } from './hooks/useTheme.js'
import CalendarPage from './pages/CalendarPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MatterDetailPage from './pages/MatterDetailPage.jsx'
import MattersPage from './pages/MattersPage.jsx'
import TasksPage from './pages/TasksPage.jsx'

// The chart library is most of the bundle, so load it only when this page opens.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'))

export default function App() {
  const { user, checking } = useAuth()
  const theme = useTheme()

  if (checking) return <div className="splash"><div className="spinner" aria-label="Loading" /></div>
  if (!user) return <LoginPage theme={theme} />

  return (
    <Routes>
      <Route element={<Layout theme={theme} />}>
        <Route index element={<DashboardPage />} />
        <Route path="matters" element={<MattersPage />} />
        <Route path="matters/:id" element={<MatterDetailPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route
          path="analytics"
          element={<Suspense fallback={<Skeleton rows={6} />}><AnalyticsPage /></Suspense>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
