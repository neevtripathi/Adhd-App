import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, ChevronRight, ArrowLeft, Upload, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useStore } from '../store'
import DisclaimerBanner from '../components/DisclaimerBanner'
import NavBar from '../components/NavBar'
import {
  startFitbitAuth,
  exchangeFitbitCode,
  fetchFitbitActivity,
  parseActivityCSV,
  parseAppleHealthXML,
  ACTIVITY_CSV_TEMPLATE,
} from '../utils/wearableUtils'

type Step =
  | 'choose'
  | 'fitbit-id'
  | 'fitbit-loading'
  | 'fitbit-preview'
  | 'upload'
  | 'upload-preview'
  | 'manual'

const ACTIVITY_LABELS = ['Sedentary', 'Lightly active', 'Moderately active', 'Active', 'Very active']
const DAYS = ['Day 1', 'Day 2', 'Day 3']

export default function ActivityModule() {
  const navigate    = useNavigate()
  const [params]    = useSearchParams()
  const { setActivity } = useStore()

  const [step,      setStep]      = useState<Step>('choose')
  const [scores,    setScores]    = useState([3, 3, 3])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [clientId,  setClientId]  = useState('')
  const [preview,   setPreview]   = useState<{ dailyScores: number[]; rawSteps: number[] | null; windows: number[][] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Handle Fitbit OAuth2 callback (?code=xxx&state=yyy)
  useEffect(() => {
    const code  = params.get('code')
    const state = params.get('state')
    if (!code) return
    const savedState = sessionStorage.getItem('fitbit_state')
    if (state !== savedState) { setError('OAuth state mismatch. Please try again.'); return }

    setStep('fitbit-loading')
    ;(async () => {
      try {
        const token = await exchangeFitbitCode(code)
        const data  = await fetchFitbitActivity(token, 3)
        setPreview({ dailyScores: data.daily_scores, rawSteps: data.raw_steps, windows: data.windows })
        setStep('fitbit-preview')
        // Clear OAuth params from URL
        window.history.replaceState({}, '', window.location.pathname)
      } catch (e: any) {
        setError(e.message ?? 'Fitbit sync failed. Please try again.')
        setStep('fitbit-id')
      }
    })()
  }, [])

  // ── Fitbit connect ──────────────────────────────────────────────────────
  async function handleFitbitConnect() {
    if (!clientId.trim()) { setError('Enter your Fitbit client ID first.'); return }
    setError('')
    try { await startFitbitAuth(clientId.trim()) }
    catch (e: any) { setError(e.message ?? 'Could not start Fitbit auth.') }
  }

  // ── File upload ─────────────────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const text = await file.text()
      let parsed: { dailyScores: number[]; windows: number[][]; rawSteps: number[] | null }

      if (file.name.toLowerCase().endsWith('.xml')) {
        const result = parseAppleHealthXML(text)
        if (!result.activity) throw new Error('No step-count records found in the last 3 days.')
        parsed = result.activity
      } else {
        parsed = parseActivityCSV(text)
      }

      setPreview(parsed)
      setStep('upload-preview')
    } catch (e: any) {
      setError(e.message ?? 'Could not parse file.')
    }
  }

  // ── Save wearable / upload data ─────────────────────────────────────────
  function savePreview(source: 'fitbit' | 'csv' | 'apple_health') {
    if (!preview) return
    setSaving(true)
    const meanScore = preview.dailyScores.reduce((a,b)=>a+b,0) / preview.dailyScores.length
    setActivity({
      confidence_tier: 'standard',
      days_collected:  preview.dailyScores.length,
      mean_daily_score: Math.round(meanScore * 10) / 10,
      daily_scores:    preview.dailyScores,
      source,
      windows:         preview.windows,
      submitted_at:    new Date().toISOString(),
    })
    navigate('/dashboard')
  }

  // ── Save manual data ────────────────────────────────────────────────────
  function handleManualSubmit() {
    setSaving(true)
    const meanScore = scores.reduce((a,b)=>a+b,0) / scores.length
    setActivity({
      confidence_tier: 'low',
      days_collected:  3,
      mean_daily_score: Math.round(meanScore * 10) / 10,
      daily_scores:    scores,
      source:          'manual',
      submitted_at:    new Date().toISOString(),
    })
    navigate('/dashboard')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CHOOSE
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'choose') return (
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
          Daily movement patterns are a meaningful signal for attention-related differences. We need at least 3 days for a valid analysis window.
        </p>

        <div className="space-y-3">

          {/* Fitbit */}
          <button onClick={() => { setError(''); setStep('fitbit-id') }}
            className="w-full flex items-start gap-4 p-4 bg-white border-2 border-emerald-300 rounded-xl text-left hover:bg-emerald-50 transition-colors group">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xl">⌚</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                Connect Fitbit
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Standard confidence</span>
              </div>
              <div className="text-sm text-slate-500 mt-0.5">Sync your Fitbit step count and activity data directly. Requires a Fitbit account.</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* File upload */}
          <button onClick={() => { setError(''); setStep('upload') }}
            className="w-full flex items-start gap-4 p-4 bg-white border-2 border-emerald-200 rounded-xl text-left hover:bg-emerald-50 transition-colors group">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xl">📁</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                Upload health data file
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Standard confidence</span>
              </div>
              <div className="text-sm text-slate-500 mt-0.5">Upload an Apple Health export (.xml), Fitbit/Garmin CSV, or our template. Works with any wearable.</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Manual */}
          <button onClick={() => setStep('manual')}
            className="w-full flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors group">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xl">✏️</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-700 flex items-center gap-2">
                Manual activity log
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Low confidence</span>
              </div>
              <div className="text-sm text-slate-400 mt-0.5">Rate your activity level for the past 3 days. Quick fallback if no wearable is available.</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
          </button>

          <button onClick={() => navigate('/dashboard')}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-3 transition-colors">
            Skip this module
          </button>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          <strong>Why activity data?</strong> The model uses movement time-series to detect regularity patterns that correlate with ADHD-like attention differences.
        </div>
      </div>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // FITBIT ID INPUT
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'fitbit-id') return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <button onClick={() => { setError(''); setStep('choose') }} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">⌚</div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Connect Fitbit</h2>
            <p className="text-slate-500 text-sm">OAuth2 — your data stays on your device</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Fitbit requires you to register a free personal app to access your own data. It takes about 2 minutes.
          </p>
          <ol className="space-y-2 text-sm text-slate-600 list-none">
            {[
              <>Go to <a href="https://dev.fitbit.com/apps/new" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline inline-flex items-center gap-1">dev.fitbit.com/apps/new <ExternalLink size={11}/></a></>,
              <>Fill in any name/description. Set <strong>OAuth 2.0 Application Type → Personal</strong>.</>,
              <>Set <strong>Redirect URL</strong> to: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs break-all">{window.location.href.split('?')[0]}</code></>,
              <>Click Register. Copy the <strong>OAuth 2.0 Client ID</strong> and paste it below.</>,
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>

          <div className="space-y-2 pt-1">
            <label className="text-sm font-semibold text-slate-700">Fitbit Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={e => { setClientId(e.target.value); setError('') }}
              placeholder="e.g. 23ABCD"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 font-mono"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button onClick={handleFitbitConnect}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            Connect Fitbit <ChevronRight size={16} />
          </button>
          <p className="text-xs text-slate-400 text-center">You'll be redirected to Fitbit to authorize. We only request steps and activity data.</p>
        </div>
      </div>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // FITBIT LOADING
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'fitbit-loading') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">Syncing with Fitbit…</p>
        <p className="text-slate-400 text-sm">Fetching your last 3 days of activity data</p>
      </div>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // FITBIT / UPLOAD PREVIEW
  // ──────────────────────────────────────────────────────────────────────────
  if ((step === 'fitbit-preview' || step === 'upload-preview') && preview) {
    const source = step === 'fitbit-preview' ? 'fitbit' as const : 'csv' as const
    const sourceLabel = step === 'fitbit-preview' ? 'Fitbit' : 'Uploaded file'
    const meanScore = preview.dailyScores.reduce((a,b)=>a+b,0) / preview.dailyScores.length

    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
          <button onClick={() => setStep(step === 'fitbit-preview' ? 'fitbit-id' : 'upload')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={22} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Data retrieved</h2>
              <p className="text-slate-500 text-sm">Source: {sourceLabel}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="space-y-3">
              {preview.dailyScores.map((score, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 w-14 shrink-0">Day {i+1}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3">
                    <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${(score/5)*100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-28 shrink-0 text-right">
                    {ACTIVITY_LABELS[score - 1]}
                    {preview.rawSteps && <span className="text-slate-400 font-normal"> ({preview.rawSteps[i]?.toLocaleString()} steps)</span>}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Average activity score</span>
              <span className="font-bold text-emerald-700">{meanScore.toFixed(1)} / 5</span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800">
            <strong>Standard confidence</strong> — wearable-sourced data is the highest-quality input for the activity branch.
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button onClick={() => savePreview(source)} disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? 'Saving…' : <>Save activity data <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FILE UPLOAD
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <button onClick={() => { setError(''); setStep('choose') }} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-xl font-bold text-slate-900">Upload health data</h2>

        <div className="space-y-4">
          {/* Supported sources */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Supported formats</p>
            {[
              { icon: '🍎', name: 'Apple Health', steps: 'iPhone → Health app → profile picture → Export All Health Data → share the .zip, extract export.xml' },
              { icon: '🏃', name: 'Fitbit / Garmin CSV', steps: 'Export your data from the app → Activities → export to CSV with at least a "steps" column' },
              { icon: '📋', name: 'FocusLens template CSV', steps: 'Download our template below, fill in step counts or activity scores, upload here' },
            ].map(({ icon, name, steps }) => (
              <div key={name} className="flex gap-3 text-sm">
                <span className="text-lg shrink-0">{icon}</span>
                <div>
                  <div className="font-medium text-slate-800">{name}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{steps}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CSV template download */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CSV template</p>
            <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">{ACTIVITY_CSV_TEMPLATE}</pre>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(ACTIVITY_CSV_TEMPLATE)}`}
              download="activity_template.csv"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-medium">
              Download template CSV
            </a>
          </div>

          {/* File picker */}
          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50 rounded-xl p-8 flex flex-col items-center gap-3 transition-colors">
            <Upload size={28} className="text-emerald-400" />
            <div className="text-center">
              <div className="font-semibold text-slate-700">Click to choose a file</div>
              <div className="text-sm text-slate-400 mt-1">Accepts .csv or Apple Health export.xml</div>
            </div>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xml" onChange={handleFile} className="hidden" />

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // MANUAL
  // ──────────────────────────────────────────────────────────────────────────
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

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
          Manual logs produce <strong>low-confidence</strong> activity input. Connect a wearable or upload a file for a higher-quality result.
        </div>

        <button onClick={handleManualSubmit} disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          {saving ? 'Saving…' : <>Save activity data <ChevronRight size={16}/></>}
        </button>
      </div>
    </div>
  )
}
