import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Heart, ArrowLeft, ChevronRight, Upload, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useStore } from '../store'
import DisclaimerBanner from '../components/DisclaimerBanner'
import NavBar from '../components/NavBar'
import {
  startFitbitAuth,
  exchangeFitbitCode,
  fetchFitbitHRV,
  parseHRVCSV,
  parseAppleHealthXML,
  HRV_CSV_TEMPLATE,
} from '../utils/wearableUtils'

type Step =
  | 'choose'
  | 'fitbit-id'
  | 'fitbit-loading'
  | 'fitbit-preview'
  | 'upload'
  | 'upload-preview'
  | 'manual'

export default function HRVModule() {
  const navigate    = useNavigate()
  const [params]    = useSearchParams()
  const { setHrv }  = useStore()

  const [step,     setStep]    = useState<Step>('choose')
  const [sdnn,     setSdnn]    = useState(52)
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState('')
  const [clientId, setClientId]= useState('')
  const [preview,  setPreview] = useState<{ sdnn: number; rmssd: number; windows: number[][] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Handle Fitbit OAuth callback
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
        const data  = await fetchFitbitHRV(token, 7)
        setPreview({ sdnn: data.sdnn, rmssd: data.rmssd, windows: data.windows })
        setStep('fitbit-preview')
        window.history.replaceState({}, '', window.location.pathname)
      } catch (e: any) {
        setError(e.message ?? 'Fitbit HRV sync failed.')
        setStep('fitbit-id')
      }
    })()
  }, [])

  async function handleFitbitConnect() {
    if (!clientId.trim()) { setError('Enter your Fitbit client ID first.'); return }
    setError('')
    try { await startFitbitAuth(clientId.trim()) }
    catch (e: any) { setError(e.message ?? 'Could not start Fitbit auth.') }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const text = await file.text()
      let parsed: { sdnn: number; rmssd: number; windows: number[][] }

      if (file.name.toLowerCase().endsWith('.xml')) {
        const result = parseAppleHealthXML(text)
        if (!result.hrv) throw new Error('No HRV records found in the Apple Health export. Make sure your device tracks HRV.')
        parsed = result.hrv
      } else {
        parsed = parseHRVCSV(text)
      }

      setPreview(parsed)
      setStep('upload-preview')
    } catch (e: any) {
      setError(e.message ?? 'Could not parse file.')
    }
  }

  function savePreview(source: 'fitbit' | 'csv' | 'apple_health') {
    if (!preview) return
    setSaving(true)
    setHrv({
      confidence_tier: 'standard',
      sdnn:            preview.sdnn,
      rmssd:           preview.rmssd,
      source,
      windows:         preview.windows,
      submitted_at:    new Date().toISOString(),
    })
    navigate('/dashboard')
  }

  function handleManualSubmit() {
    setSaving(true)
    const rmssd = Math.round(sdnn * 0.85 + (Math.random()-0.5)*10)
    setHrv({
      confidence_tier: 'reduced',
      sdnn,
      rmssd,
      source:       'simulated',
      submitted_at: new Date().toISOString(),
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

          {/* Fitbit */}
          <button onClick={() => { setError(''); setStep('fitbit-id') }}
            className="w-full flex items-start gap-4 p-4 bg-white border-2 border-rose-300 rounded-xl text-left hover:bg-rose-50 transition-colors group">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xl">⌚</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                Connect Fitbit
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">Standard confidence</span>
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                Sync overnight HRV from Fitbit Sense or Versa 3+. Fetches 7 days of RMSSD data automatically.
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* File upload */}
          <button onClick={() => { setError(''); setStep('upload') }}
            className="w-full flex items-start gap-4 p-4 bg-white border-2 border-rose-200 rounded-xl text-left hover:bg-rose-50 transition-colors group">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xl">📁</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                Upload health data file
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">Standard confidence</span>
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                Upload Apple Health export (.xml) or a CSV with SDNN/RMSSD columns. Works with Garmin, Polar, Whoop, and Apple Watch.
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Manual */}
          <button onClick={() => setStep('manual')}
            className="w-full flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors group">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xl">📊</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-700 flex items-center gap-2">
                Enter HRV estimate
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Reduced confidence</span>
              </div>
              <div className="text-sm text-slate-400 mt-0.5">Know your SDNN from a wearable? Enter it manually. Otherwise use the estimated average.</div>
            </div>
            <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
          </button>

          <button onClick={() => navigate('/dashboard')}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-3 transition-colors">
            Skip this module
          </button>
        </div>

        {/* Device compatibility note */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2 text-sm text-rose-800">
          <p className="font-semibold">Supported devices</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-rose-700">
            {['Fitbit Sense / Sense 2', 'Fitbit Versa 3 / 4', 'Apple Watch (Series 4+)', 'Garmin (HRV Status)', 'Polar (H10, Ignite 3)', 'Whoop 4.0+'].map(d => (
              <span key={d} className="flex items-center gap-1"><span className="text-rose-400">✓</span> {d}</span>
            ))}
          </div>
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
          <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center text-xl">⌚</div>
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
              <>Go to <a href="https://dev.fitbit.com/apps/new" target="_blank" rel="noopener noreferrer" className="text-rose-600 underline inline-flex items-center gap-1">dev.fitbit.com/apps/new <ExternalLink size={11}/></a></>,
              <>Fill in any name/description. Set <strong>OAuth 2.0 Application Type → Personal</strong>.</>,
              <>Set <strong>Redirect URL</strong> to: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs break-all">{window.location.href.split('?')[0]}</code></>,
              <>Click Register. Copy the <strong>OAuth 2.0 Client ID</strong> and paste it below.</>,
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 font-mono"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button onClick={handleFitbitConnect}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            Connect Fitbit <ChevronRight size={16} />
          </button>
          <p className="text-xs text-slate-400 text-center">You'll be redirected to Fitbit to authorize. We only request heart rate data.</p>
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
        <div className="w-14 h-14 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">Syncing with Fitbit…</p>
        <p className="text-slate-400 text-sm">Fetching your last 7 days of HRV data</p>
      </div>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────────
  // PREVIEW (Fitbit or Upload)
  // ──────────────────────────────────────────────────────────────────────────
  if ((step === 'fitbit-preview' || step === 'upload-preview') && preview) {
    const source      = step === 'fitbit-preview' ? 'fitbit' as const : 'csv' as const
    const sourceLabel = step === 'fitbit-preview' ? 'Fitbit' : 'Uploaded file'

    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
          <button onClick={() => setStep(step === 'fitbit-preview' ? 'fitbit-id' : 'upload')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={22} className="text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">HRV data retrieved</h2>
              <p className="text-slate-500 text-sm">Source: {sourceLabel}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-rose-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-extrabold text-rose-600">{preview.sdnn}</div>
                <div className="text-xs text-rose-700 mt-1 font-medium">SDNN (ms)</div>
                <div className="text-xs text-slate-400 mt-0.5">Overall variability</div>
              </div>
              <div className="bg-rose-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-extrabold text-rose-600">{preview.rmssd}</div>
                <div className="text-xs text-rose-700 mt-1 font-medium">RMSSD (ms)</div>
                <div className="text-xs text-slate-400 mt-0.5">Parasympathetic activity</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: 'Low HRV', range: '< 40ms', color: 'text-red-500' },
                { label: 'Average', range: '40–70ms', color: 'text-amber-500' },
                { label: 'High HRV', range: '> 70ms', color: 'text-emerald-500' },
              ].map(({ label, range, color }) => (
                <div key={label} className={`text-center text-xs p-2 rounded-lg ${preview.sdnn < 40 && label === 'Low HRV' ? 'bg-red-50' : preview.sdnn > 70 && label === 'High HRV' ? 'bg-emerald-50' : preview.sdnn >= 40 && preview.sdnn <= 70 && label === 'Average' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <div className={`font-semibold ${color}`}>{label}</div>
                  <div className="text-slate-400">{range}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 text-center">
              {preview.windows.length} day{preview.windows.length !== 1 ? 's' : ''} of data collected
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-800">
            <strong>Standard confidence</strong> — wearable-sourced HRV is the highest-quality input for the HRV branch.
          </div>

          <button onClick={() => savePreview(source)} disabled={saving}
            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? 'Saving…' : <>Save HRV data <ChevronRight size={16} /></>}
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
        <h2 className="text-xl font-bold text-slate-900">Upload HRV data</h2>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Supported formats</p>
            {[
              { icon: '🍎', name: 'Apple Health', steps: 'iPhone → Health app → profile picture → Export All Health Data → share .zip → extract export.xml. Supports Apple Watch HRV.' },
              { icon: '🏔️', name: 'Garmin / Polar / Whoop CSV', steps: 'Export nightly HRV data from your app. Use columns: date, sdnn, rmssd (or just rmssd).' },
              { icon: '📋', name: 'FocusLens template CSV', steps: 'Download template below, fill in your HRV values, upload here.' },
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

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CSV template</p>
            <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">{HRV_CSV_TEMPLATE}</pre>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(HRV_CSV_TEMPLATE)}`}
              download="hrv_template.csv"
              className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:underline font-medium">
              Download template CSV
            </a>
          </div>

          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-rose-300 hover:border-rose-500 bg-white hover:bg-rose-50 rounded-xl p-8 flex flex-col items-center gap-3 transition-colors">
            <Upload size={28} className="text-rose-400" />
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
        <h2 className="text-xl font-bold text-slate-900">Enter your HRV (SDNN)</h2>
        <p className="text-slate-500 text-sm">
          SDNN (standard deviation of normal-to-normal intervals) is a common HRV metric shown in most wearable apps.
          The population average is roughly 40–70ms.
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
          Manual HRV entry produces <strong>reduced-confidence</strong> data. Use the Fitbit or file upload options above for standard confidence.
        </div>

        <button onClick={handleManualSubmit} disabled={saving}
          className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          {saving ? 'Saving…' : <>Save HRV data <ChevronRight size={16}/></>}
        </button>
      </div>
    </div>
  )
}
