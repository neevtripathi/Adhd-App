import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ArrowLeft, Lock, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import DisclaimerBanner from '../components/DisclaimerBanner'
import NavBar from '../components/NavBar'

export default function HRVModule() {
  const navigate = useNavigate()
  const { sessionId, setHrv } = useStore()
  const [step, setStep] = useState<'choose'|'simulate'>('choose')
  const [sdnn, setSdnn] = useState(52)
  const [saving, setSaving] = useState(false)

  // Simulated wearable HRV entry (Phase 1 stand-in)
  function handleSubmitSimulated() {
    setSaving(true)
    const rmssd = Math.round(sdnn * 0.85 + (Math.random()-0.5)*10)
    setHrv({
      confidence_tier: 'reduced', sdnn, rmssd,
      source: 'simulated', submitted_at: new Date().toISOString()
    })
    navigate('/dashboard')
  }

  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <DisclaimerBanner compact />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center">
              <Heart size={22} className="text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">HRV Measurement</h1>
              <p className="text-slate-500 text-sm">Heart-rate variability signal</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Heart-rate variability (HRV) reflects autonomic nervous system regulation. Patterns in HRV differ between individuals with and without ADHD.
          </p>

          <div className="space-y-3">
            {/* Simulate / manual entry */}
            <button onClick={() => setStep('simulate')}
              className="w-full flex items-start gap-4 p-4 bg-white border-2 border-rose-200 rounded-xl text-left hover:bg-rose-50 transition-colors group">
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xl">📊</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Enter HRV estimate</div>
                <div className="text-sm text-slate-500 mt-0.5">Know your SDNN from a wearable? Enter it manually. Otherwise use the estimated average.</div>
                <div className="text-xs text-amber-600 mt-1 font-medium">⚠ Reduced confidence</div>
              </div>
              <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Camera PPG — Phase 2 */}
            <div className="w-full flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xl">📷</div>
              <div className="flex-1">
                <div className="font-semibold text-slate-700 flex items-center gap-2">
                  Camera PPG
                  <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock size={10}/>Phase 2</span>
                </div>
                <div className="text-sm text-slate-400 mt-0.5">Place finger on camera for a 3-minute guided HRV measurement.</div>
              </div>
            </div>

            {/* Wearable — Phase 2 */}
            <div className="w-full flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xl">⌚</div>
              <div className="flex-1">
                <div className="font-semibold text-slate-700 flex items-center gap-2">
                  Connect Wearable
                  <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock size={10}/>Phase 2</span>
                </div>
                <div className="text-sm text-slate-400 mt-0.5">Polar, Garmin, or HealthKit R-R interval sync for standard-confidence HRV.</div>
              </div>
            </div>

            <button onClick={() => navigate('/dashboard')}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-3 transition-colors">
              Skip this module
            </button>
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
        <h2 className="text-xl font-bold text-slate-900">Enter your HRV (SDNN)</h2>
        <p className="text-slate-500 text-sm">
          SDNN (standard deviation of normal-to-normal intervals) is a common HRV metric from wearables.
          The population average is roughly 40–70ms. If unsure, leave at the default.
        </p>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-800">SDNN value</span>
            <span className="text-2xl font-bold text-rose-600">{sdnn} <span className="text-base font-normal text-slate-400">ms</span></span>
          </div>
          <input type="range" min={10} max={120} value={sdnn}
            onChange={e => setSdnn(Number(e.target.value))}
            className="w-full accent-rose-500 h-2 cursor-pointer" />
          <div className="flex justify-between text-xs text-slate-400">
            <span>10ms (very low)</span><span>70ms (avg)</span><span>120ms (high)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { label: 'Low HRV', range: '< 40ms', color: 'text-red-500' },
              { label: 'Average', range: '40–70ms', color: 'text-amber-500' },
              { label: 'High HRV', range: '> 70ms', color: 'text-emerald-500' },
            ].map(({ label, range, color }) => (
              <div key={label} className="text-center text-xs">
                <div className={`font-semibold ${color}`}>{label}</div>
                <div className="text-slate-400">{range}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
          Manual HRV entry produces <strong>reduced-confidence</strong> data. This will be flagged in your results.
        </div>

        <button onClick={handleSubmitSimulated} disabled={saving}
          className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          {saving ? 'Saving…' : <>Save HRV data <ChevronRight size={16}/></>}
        </button>
      </div>
    </div>
  )
}
