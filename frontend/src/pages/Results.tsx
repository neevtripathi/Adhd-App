import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, RefreshCw, BarChart2, Info } from 'lucide-react'
import { useStore } from '../store'
import type { PredictionResult } from '../types'
import { runLocalInference } from '../utils/localInference'
import ModalityStatusBar from '../components/ModalityStatusBar'
import NavBar from '../components/NavBar'

const BAND_CONFIG = {
  low:      { label:'Low',      color:'text-slate-600',  bg:'bg-slate-50',   border:'border-slate-300',  bar:'bg-slate-400',   width:'w-1/4' },
  moderate: { label:'Moderate', color:'text-amber-700',  bg:'bg-amber-50',   border:'border-amber-300',  bar:'bg-amber-400',   width:'w-2/4' },
  elevated: { label:'Elevated', color:'text-orange-700', bg:'bg-orange-50',  border:'border-orange-300', bar:'bg-orange-500',  width:'w-3/4' },
  high:     { label:'High',     color:'text-red-700',    bg:'bg-red-50',     border:'border-red-300',    bar:'bg-red-500',     width:'w-full' },
}

const CONFIDENCE_BADGE: Record<string, string> = {
  'high':        'bg-emerald-100 text-emerald-700 border-emerald-200',
  'medium-high': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'medium':      'bg-brand-100 text-brand-700 border-brand-200',
  'medium-low':  'bg-amber-100 text-amber-700 border-amber-200',
  'low':         'bg-slate-100 text-slate-600 border-slate-200',
}

const RESOURCES = [
  { name: 'CHADD Clinician Finder', url: 'https://chadd.org', desc: 'Find ADHD specialists near you' },
  { name: 'ADDA (Attention Deficit Disorder Association)', url: 'https://add.org', desc: 'Resources and support for adults with ADHD' },
  { name: 'CDC — ADHD Information', url: 'https://www.cdc.gov/ncbddd/adhd', desc: 'Authoritative overview of ADHD' },
  { name: 'NIMH — ADHD', url: 'https://www.nimh.nih.gov/health/topics/attention-deficit-hyperactivity-disorder-adhd', desc: 'National Institute of Mental Health' },
]

export default function Results() {
  const navigate = useNavigate()
  const { sessionId, cpt, activity, hrv, questionnaire, latestPrediction, addPrediction } = useStore()
  void sessionId
  const [prediction, setPrediction] = useState<PredictionResult | null>(latestPrediction)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFactors, setShowFactors] = useState(true)
  const [showImprove, setShowImprove] = useState(false)

  const hasAny = !!(cpt || activity || hrv || questionnaire)

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    if (!hasAny) { navigate('/dashboard'); return }
    if (!prediction) runInference()
  }, [])

  function runInference() {
    setLoading(true); setError('')
    try {
      const input: Parameters<typeof runLocalInference>[0] = {}
      if (cpt) input.cpt = { source: cpt.source, features: cpt.features }
      if (activity) input.activity = { confidence_tier: activity.confidence_tier, days_collected: activity.days_collected, mean_daily_score: activity.mean_daily_score }
      if (hrv) input.hrv = { confidence_tier: hrv.confidence_tier, sdnn: hrv.sdnn, rmssd: hrv.rmssd }
      if (questionnaire) input.questionnaire = { asrs_inattention_score: questionnaire.asrs_inattention_score, asrs_hyperactivity_score: questionnaire.asrs_hyperactivity_score, sleep_quality: questionnaire.sleep_quality, stress_level: questionnaire.stress_level }
      const p = runLocalInference(input)
      setPrediction(p)
      addPrediction(p)
    } catch {
      setError('Could not generate prediction. Please try again.')
    } finally { setLoading(false) }
  }

  if (!hasAny) return null

  const band = prediction ? BAND_CONFIG[prediction.likelihood_band] : null
  const missingMods = ['cpt','activity','hrv'].filter(m => !prediction?.modalities_used.includes(m))

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* PERMANENT DISCLAIMER — always first */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">For informational purposes only — not a clinical diagnosis.</p>
            <p className="text-amber-800 text-sm mt-0.5">
              This tool does not diagnose ADHD. It is not a medical device and does not replace evaluation by a licensed clinician.
              Always consult a qualified healthcare professional for any health-related decisions.
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
            <p className="text-slate-500">Analysing your data…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={runInference} className="text-sm text-red-600 font-medium hover:underline flex items-center gap-1">
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* Main result card */}
        {prediction && band && (
          <>
            <div className={`bg-white rounded-2xl border-2 ${band.border} p-6 space-y-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Your result</p>
                  <h2 className={`text-2xl font-extrabold ${band.color}`}>{prediction.likelihood_band_label}</h2>
                </div>
                <button onClick={runInference}
                  className="text-slate-400 hover:text-slate-700 transition-colors" title="Recalculate">
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* 4-band gauge */}
              <div className="space-y-1.5">
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                  {(['low','moderate','elevated','high'] as const).map(b => (
                    <div key={b} className={`flex-1 transition-all ${b === prediction.likelihood_band ? BAND_CONFIG[b].bar : 'bg-slate-200'}`} />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Low</span><span>Moderate</span><span>Elevated</span><span>High</span>
                </div>
              </div>

              {/* Uncertainty */}
              {prediction.uncertainty_interval && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Info size={13} />
                  <span>Estimated range: <strong className="text-slate-700">{prediction.likelihood_band_label}</strong> (uncertainty: {Math.round(prediction.uncertainty_interval[0]*100)}–{Math.round(prediction.uncertainty_interval[1]*100)}% probability)</span>
                </div>
              )}

              {/* Modality status + confidence */}
              <div className="pt-2 border-t border-slate-100">
                <ModalityStatusBar prediction={prediction} />
              </div>
            </div>

            {/* Contributing factors */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <button
                onClick={() => setShowFactors(v=>!v)}
                className="w-full flex items-center justify-between font-semibold text-slate-900"
              >
                <span className="flex items-center gap-2"><BarChart2 size={16} className="text-brand-500"/> Contributing factors</span>
                {showFactors ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
              {showFactors && (
                <ul className="mt-4 space-y-2.5">
                  {prediction.contributing_factors.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="text-brand-400 font-bold shrink-0 mt-0.5">›</span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              {prediction.data_quality_flags.length > 0 && showFactors && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Data quality notes</p>
                  {prediction.data_quality_flags.map(f => (
                    <span key={f} className="inline-block mr-2 mb-1 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">{f.replace(/_/g,' ')}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Improve your result */}
            {missingMods.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <button
                  onClick={() => setShowImprove(v=>!v)}
                  className="w-full flex items-center justify-between font-semibold text-slate-900"
                >
                  <span>Improve your result</span>
                  {showImprove ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {showImprove && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-slate-500">Adding more data types will increase confidence and accuracy.</p>
                    {missingMods.map(m => {
                      const cfg = { cpt:{ label:'Attention Game', path:'/game', desc:'Adds direct attentional performance data — the strongest single signal.' },
                                    activity:{ label:'Activity Data', path:'/activity', desc:'Adds 3-day movement pattern data for a physiological baseline.' },
                                    hrv:{ label:'HRV Measurement', path:'/hrv', desc:'Adds autonomic nervous system signal from heart-rate variability.' } }
                      const c = cfg[m as keyof typeof cfg]
                      return (
                        <div key={m} className="flex items-start justify-between gap-3 p-3 bg-brand-50 border border-brand-100 rounded-xl">
                          <div>
                            <p className="font-medium text-brand-800 text-sm">{c.label}</p>
                            <p className="text-xs text-brand-600 mt-0.5">{c.desc}</p>
                          </div>
                          <button onClick={() => navigate(c.path)}
                            className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                            Add
                          </button>
                        </div>
                      )
                    })}
                    <p className="text-xs text-slate-400 text-center">You can also keep this result and come back later.</p>
                  </div>
                )}
              </div>
            )}

            {/* Professional resources */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900">Talk to a professional</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Only a licensed clinician can formally evaluate and diagnose ADHD. If your result concerns you — in any direction — please reach out to a qualified professional.
              </p>
              <div className="space-y-2">
                {RESOURCES.map(({ name, url, desc }) => (
                  <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-brand-50 hover:border-brand-200 transition-colors group">
                    <ExternalLink size={15} className="text-slate-400 group-hover:text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 group-hover:text-brand-700">{name}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => navigate('/dashboard')}
                className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition-colors text-sm">
                Back to Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Print / Save
              </button>
            </div>

            {/* Model metadata footer */}
            <p className="text-center text-xs text-slate-300">
              Model v{prediction.model_version} · {new Date(prediction.inferred_at).toLocaleString()} · For informational use only
            </p>
          </>
        )}
      </div>
    </div>
  )
}
