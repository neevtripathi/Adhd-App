import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import GameModule from './pages/GameModule'
import ActivityModule from './pages/ActivityModule'
import HRVModule from './pages/HRVModule'
import Questionnaire from './pages/Questionnaire'
import Results from './pages/Results'

function RequireSession({ children }: { children: React.ReactNode }) {
  const { sessionId } = useStore()
  return sessionId ? <>{children}</> : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<RequireSession><Dashboard /></RequireSession>} />
        <Route path="/game" element={<RequireSession><GameModule /></RequireSession>} />
        <Route path="/activity" element={<RequireSession><ActivityModule /></RequireSession>} />
        <Route path="/hrv" element={<RequireSession><HRVModule /></RequireSession>} />
        <Route path="/questionnaire" element={<RequireSession><Questionnaire /></RequireSession>} />
        <Route path="/results" element={<RequireSession><Results /></RequireSession>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
