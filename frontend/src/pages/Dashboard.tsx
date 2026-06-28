import { useNavigate } from 'react-router-dom'
import { Zap, Activity, Heart, ClipboardList, CheckCircle2, ChevronRight, BarChart2, Lock } from 'lucide-react'
import { useStore } from '../store'
import DisclaimerBanner from '../components/DisclaimerBanner'
import NavBar from '../components/NavBar'

const MODULES = [
  {
    key: 'cpt', path: '/game', icon: <Zap size={22} />, color: 'brand',
    title: 'Attention Challenge', tag: 'CPT-II Analog',
    time: '~8 min', confidence: '+Medium',
    desc: 'A go/no-go reaction-time game across 6 blocks and 180 trials measuring sustained attention, impulse control, and response variability.',
  },
  {
    key: 'activity', path: '/activity', icon: <Activity size={22} />, color: 'emerald',
    title: 'Activity Data', tag: 'Actigraphy',
    time: '2 min', confidence: '+Low–Medium',
    desc: 'Log your physical activity patterns over 3 days. Wearable sync coming in Phase 2.',
  },
  {
    key: 'hrv', path: '/hrv', icon: <Heart size={22} />, color: 'rose',
    title: 'HRV Measurement', tag: 'Heart-Rate Variability',
    time: '3 min', confidence: '+Medium',
    desc: 'Heart-rate variability data from a wearable or guided camera measurement (Phase 2).',
  },
  {
    key: 'questionnaire', path: '/questionnaire', icon: <ClipboardList size={22} />, color: 'violet',
    title: 'Quick Survey', tag: 'Self-Report',
    time: '3 min', confidence: '+Supplementary',
    desc: 'A 20-question self-report covering attention habits, daily context, and optional data donation.',
  },
]

const COLOR_MAP: Record<string, { bg: string; icon: string; tag: string; ring: string }> = {
  brand: { bg: 'bg-brand-50', icon: 'text-brand-500 bg-brand-100', tag: 'text-brand-600', ring: 'ring-brand-200' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600 bg-emerald-100', tag: 'text-emerald-600', ring: 'ring-emerald-200' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-500 bg-rose-100', tag: 'text-rose-500', ring: 'ring-rose-200' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600 bg-violet-100', tag: 'text-violet-600', ring: 'ring-violet-200' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { cpt, activity, hrv, questionnaire, latestPrediction, sessionId } = useStore()

  if (!sessionId) { navigate('/'); return null }

  const isComplete = (key: string) =>
    key === 'cpt' ? !!cpt : key === 'activity' ? !!activity : key === 'hrv' ? !!hrv : !!questionnaire

  const completedCount = [cpt, activity, hrv, questionnaire].filter(Boolean).length
  const hasAny = completedCount > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Disclaimer */}
        <DisclaimerBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Assessment</h1>
            <p className="text-slate-500 text-sm mt-1">Complete modules in any order. Your progress is saved.</p>
          </div>
          {hasAny && (
            <button
              onClick={() => navigate('/results')}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <BarChart2 size={16} />
              View Results
              {latestPrediction && <span className="bg-brand-400 text-xs px-2 py-0.5 rounded-full capitalize">{latestPrediction.likelihood_band}</span>}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">{completedCount} of 4 modules complete</span>
            <span className="text-slate-400">{Math.round(completedCount / 4 * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-700"
              style={{ width: `${(completedCount / 4) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {completedCount === 0 && 'Start with the Attention Challenge for the best baseline result.'}
            {completedCount === 1 && 'Good start! Add more modules to increase confidence.'}
            {completedCount === 2 && "You're halfway there — your result is now available."}
            {completedCount === 3 && 'Almost complete! One more module for maximum confidence.'}
            {completedCount === 4 && 'All modules complete! Your result has maximum confidence.'}
          </p>
        </div>

        {/* Module cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {MODULES.map((m) => {
            const done = isComplete(m.key)
            const c = COLOR_MAP[m.color]
            return (
              <div key={m.key}
                className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all ${done ? 'ring-1 ' + c.ring : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center`}>{m.icon}</div>
                  {done && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={12} /> Done
                    </span>
                  )}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${c.tag}`}>{m.tag}</span>
                <h3 className="font-bold text-slate-900 text-base mt-0.5 mb-1">{m.title}</h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">{m.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span>⏱ {m.time}</span>
                    <span className="text-brand-500 font-medium">{m.confidence} confidence</span>
                  </div>
                  <button
                    onClick={() => navigate(m.path)}
                    className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                      done
                        ? 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                        : 'text-white bg-brand-600 hover:bg-brand-700'
                    }`}
                  >
                    {done ? 'Redo' : 'Start'} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Latest prediction preview */}
        {latestPrediction && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Latest Result</h2>
              <button onClick={() => navigate('/results')} className="text-sm text-brand-600 hover:underline">Full report →</button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className={`px-4 py-2 rounded-xl font-bold text-lg border ${
                latestPrediction.likelihood_band === 'low' ? 'bg-slate-50 border-slate-200 text-slate-700' :
                latestPrediction.likelihood_band === 'moderate' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                latestPrediction.likelihood_band === 'elevated' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                'bg-red-50 border-red-200 text-red-700'
              }`}>
                {latestPrediction.likelihood_band_label}
              </div>
              <div className="text-sm text-slate-500">
                Based on: <span className="text-slate-700 font-medium">{latestPrediction.modalities_used.join(', ') || 'questionnaire'}</span>
                &nbsp;·&nbsp;Confidence: <span className="text-brand-600 font-medium capitalize">{latestPrediction.confidence_tier}</span>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2 note */}
        <div className="bg-slate-100 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
          <Lock size={14} />
          <span><strong>Phase 2 coming soon:</strong> Live wearable sync, camera-based HRV, PDF export, and retraining pipeline.</span>
        </div>
      </div>
    </div>
  )
}
