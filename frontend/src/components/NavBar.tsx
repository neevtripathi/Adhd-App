import { Link, useNavigate } from 'react-router-dom'
import { Brain, LogOut, User } from 'lucide-react'
import { useStore } from '../store'

export default function NavBar() {
  const { isGuest, userEmail, clearSession, sessionId } = useStore()
  const navigate = useNavigate()

  const handleSignOut = () => {
    clearSession()
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={sessionId ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-lg text-brand-600 hover:text-brand-700 transition-colors">
          <Brain size={22} />
          FocusLens
        </Link>
        <div className="flex items-center gap-3">
          {sessionId && (
            <>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <User size={14} />
                <span>{isGuest ? 'Guest session' : userEmail}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <LogOut size={14} />
                Exit
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
