import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, ArrowRight, User, Mail, Lock, AlertTriangle } from 'lucide-react'
import { useStore } from '../store'

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
}

export default function Auth() {
  const navigate = useNavigate()
  const { startSession } = useStore()
  const [mode, setMode] = useState<'choose' | 'signup'>('choose')
  const [email, setEmail] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleGuest() {
    if (!ageConfirmed || !termsAccepted) { setError('Please confirm your age and accept the terms.'); return }
    setLoading(true)
    startSession(genId(), true)
    navigate('/dashboard')
  }

  function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!ageConfirmed || !termsAccepted) { setError('Please confirm your age and accept the terms.'); return }
    if (!email.includes('@')) { setError('Enter a valid email.'); return }
    setLoading(true)
    const userId = `user_${Date.now().toString(36)}`
    startSession(genId(), false, userId, email)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-200">
            <Brain size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">FocusLens</h1>
          <p className="text-slate-500 text-sm mt-1">Attention pattern assessment</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Disclaimer */}
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex gap-2">
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800"><strong>Not a diagnostic tool.</strong> Results are informational only. Not a substitute for professional evaluation.</p>
          </div>

          <div className="p-6 space-y-5">
            {mode === 'choose' ? (
              <>
                <h2 className="text-xl font-bold text-slate-900">Get started</h2>

                {/* Guest */}
                <button
                  onClick={() => { setMode('choose'); handleGuest() }}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-4 border-2 border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
                    <User size={18} className="text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-brand-800">Continue as Guest</div>
                    <div className="text-xs text-brand-600">No account needed · Results saved for 30 days</div>
                  </div>
                  <ArrowRight size={16} className="text-brand-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Create account */}
                <button
                  onClick={() => setMode('signup')}
                  className="w-full flex items-center gap-3 p-4 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    <Mail size={18} className="text-slate-600" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-slate-800">Create Account</div>
                    <div className="text-xs text-slate-500">Save results forever · Add data later · PDF export</div>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Checkboxes */}
                <div className="pt-2 space-y-3 border-t border-slate-100">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)}
                      className="mt-0.5 accent-brand-600 w-4 h-4 cursor-pointer" />
                    <span className="text-sm text-slate-700">I confirm I am <strong>18 years or older</strong></span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 accent-brand-600 w-4 h-4 cursor-pointer" />
                    <span className="text-sm text-slate-700">
                      I accept the <button className="text-brand-600 underline" onClick={e => e.preventDefault()}>Terms of Service</button>{' '}
                      and <button className="text-brand-600 underline" onClick={e => e.preventDefault()}>Privacy Policy</button>
                    </span>
                  </label>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              </>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <button type="button" onClick={() => setMode('choose')} className="text-sm text-brand-600 hover:underline">← Back</button>
                <h2 className="text-xl font-bold text-slate-900">Create account</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" placeholder="Create a password"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)}
                      className="mt-0.5 accent-brand-600 w-4 h-4" />
                    <span className="text-sm text-slate-700">I confirm I am <strong>18 or older</strong></span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 accent-brand-600 w-4 h-4" />
                    <span className="text-sm text-slate-700">I accept the Terms & Privacy Policy</span>
                  </label>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                  {loading ? 'Creating session…' : 'Create account & start'}
                </button>
              </form>
            )}

            {mode === 'choose' && loading && (
              <p className="text-center text-sm text-slate-400 animate-pulse">Connecting…</p>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">Not a medical device · For adults 18+ only</p>
      </div>
    </div>
  )
}
