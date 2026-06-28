import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ChevronRight, ArrowLeft, Lock } from 'lucide-react'
import { useStore } from '../store'
import DisclaimerBanner from '../components/DisclaimerBanner'
import NavBar from '../components/NavBar'

const ACTIVITY_LABELS = ['Sedentary', 'Lightly active', 'Moderately active', 'Active', 'Very active']
const DAYS = ['Day 1', 'Day 2', 'Day 3']

export default function ActivityModule() {
  const navigate = useNavigate()
  const { sessionId, setActivity } = useStore()
  const [scores, setScores] = useState([3, 3, 3])
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'choose' | 'manual'>('choose')

  const meanScore = scores.reduce((a,b)=>a+b,0) / scores.length

  function handleSubmit() {
    setSaving(true)
    const data = {
      confidence_tier: 'low' as const,
      days_collected: 3,
      mean_daily_score: Math.round(meanScore * 10) / 10,
      daily_scores: scores,
      source: 'manual' as const,
      submitted_at: new Date().toISOString()
    }
    setActivity(data)
    navigate('/dashboard')
  }

  function handleSkip() {
    navigate('/dashboard')
  }

  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <DisclaimerBanner compact />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Activity size={22} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Activity Data</h1>
              <p className="text-slate-500 text-sm">Actigraphy — 3-day movement patterns</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your daily activity patterns are a meaningful signal for attention-related differences.
            We need at least 3 days of data for a valid analysis window.
          </p>

          <div className="space-y-3">
            {/* Manual log */}
            <button onClick={() => setStep('manual')}
              className="w-full flex items-start gap-4 p-4 bg-white border-2 border-emerald-200 rounded-xl text-left hover:bg-emerald-50 transition-colors group">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xl">📝</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Manual activity log</div>
                <div className="text-sm text-slate-500 mt-0.5">Rate your activity level for the past 3 days. Quick — takes 1 minute.</div>
                <div className="text-xs text-amber-600 mt-1 font-medium">⚠ Low confidence — manual self-report</div>
              </div>
              <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Wearable — Phase 2 */}
            <div className="w-full flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xl">⌚</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-700 flex items-center gap-2">
                  Connect Wearable
                  <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock size={10}/>Phase 2</span>
                </div>
                <div className="text-sm text-slate-400 mt-0.5">HealthKit / Google Fit sync for standard-confidence actigraphy data.</div>
              </div>
            </div>

            <button onClick={handleSkip}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-3 transition-colors">
              Skip this module (no activity data collected)
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
            <strong>Why activity data?</strong> The model uses wrist accelerometer time-series to detect movement regularity patterns that correlate with ADHD-like attention differences.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <button onClick={() => setStep('choose')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Back
        </button>
        <DisclaimerBanner compact />
        <h2 className="text-xl font-bold text-slate-900">Rate your activity — last 3 days</h2>
        <p className="text-slate-500 text-sm">Think about your overall physical activity level for each day, including walks, exercise, and general movement.</p>

        <div className="space-y-4">
          {DAYS.map((day, i) => (
            <div key={day} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800">{day}</span>
                <span className="text-sm font-medium text-emerald-600">{ACTIVITY_LABELS[scores[i]-1]}</span>
              </div>
              <input type="range" min={1} max={5} value={scores[i]}
                onChange={e => setScores(s => { const n=[...s]; n[i]=Number(e.target.value); return n })}
                className="w-full accent-emerald-500 h-2 cursor-pointer" />
              <div className="flex justify-between text-xs text-slate-400">
                <span>Sedentary</span><span>Very active</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
          <span className="text-sm text-emerald-800 font-medium">Average activity score</span>
          <span className="text-lg font-bold text-emerald-700">{meanScore.toFixed(1)} / 5</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
          Manual logs produce <strong>low-confidence</strong> activity input. This will be flagged in your results.
        </div>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          {saving ? 'Saving…' : <>Save activity data <ChevronRight size={16}/></>}
        </button>
      </div>
    </div>
  )
}
