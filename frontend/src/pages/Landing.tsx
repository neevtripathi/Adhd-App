import { useNavigate } from 'react-router-dom'
import { Brain, Zap, Activity, Heart, ChevronRight, AlertTriangle, Shield, BarChart3 } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-brand-400 blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 rounded-full bg-purple-400 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
            <Brain size={14} />
            Science-informed • Not a diagnostic tool
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            Understand Your<br />
            <span className="text-brand-300">Attention Patterns</span>
          </h1>
          <p className="text-xl text-brand-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            A multimodal, gamified assessment using attention performance, activity data,
            and heart-rate variability to give you an informational ADHD-likelihood estimate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="bg-brand-500 hover:bg-brand-400 text-white font-semibold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-brand-900/40"
            >
              Start Free Assessment <ChevronRight size={18} />
            </button>
            <a href="#how-it-works" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium px-8 py-3.5 rounded-xl transition-all flex items-center justify-center">
              How it works
            </a>
          </div>
          <p className="mt-8 text-sm text-brand-300/70">Takes 10–20 minutes · No account required · Free</p>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          <strong>Important:</strong>&nbsp;FocusLens is an informational tool, not a clinical diagnostic product.
          It does not diagnose ADHD and does not replace evaluation by a licensed clinician.
        </div>
      </div>

      {/* Modules */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Three data types, one picture</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Our model was trained on three independent data streams. You can complete any combination —
              more modalities means higher confidence.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Zap size={24} className="text-brand-500" />, title: 'Attention Game', tag: 'CPT-II analog', color: 'brand', desc: 'A 6-minute go/no-go reaction-time challenge that measures sustained attention, impulse control, and response variability across 180 trials.' },
              { icon: <Activity size={24} className="text-emerald-500" />, title: 'Activity Data', tag: 'Actigraphy', color: 'emerald', desc: 'Multi-day movement patterns from your wearable or manual log. Activity regularity is a meaningful signal for attention-related differences.' },
              { icon: <Heart size={24} className="text-rose-500" />, title: 'HRV Measurement', tag: 'Autonomic signal', color: 'rose', desc: 'Heart-rate variability reflects autonomic nervous system regulation, which differs in ADHD presentations.' },
            ].map(({ icon, title, tag, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl bg-${color}-50 flex items-center justify-center mb-4`}>{icon}</div>
                <span className={`text-xs font-semibold uppercase tracking-wide text-${color}-500`}>{tag}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Confidence tiers */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Works with whatever you have</h2>
              <p className="text-slate-500 mb-6 leading-relaxed">
                No wearable? No problem. Complete just the attention game for a baseline estimate,
                then add more data to refine your result over time. Your session is saved.
              </p>
              <div className="space-y-3">
                {[
                  { mods: 'All 3 modalities', tier: 'High', color: 'emerald' },
                  { mods: 'Any 2 modalities', tier: 'Medium–High', color: 'brand' },
                  { mods: 'Attention game only', tier: 'Medium-Low', color: 'amber' },
                  { mods: 'Questionnaire only', tier: 'Low', color: 'slate' },
                ].map(({ mods, tier, color }) => (
                  <div key={mods} className={`flex items-center justify-between px-4 py-2.5 rounded-lg bg-${color}-50 border border-${color}-100`}>
                    <span className="text-sm text-slate-700">{mods}</span>
                    <span className={`text-xs font-bold text-${color}-600 uppercase tracking-wide`}>{tier} confidence</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {[
                { icon: <Shield size={20} className="text-brand-500" />, title: 'Privacy first', desc: 'Your raw sensor data never leaves your session. No third-party sharing. Full data deletion on request.' },
                { icon: <BarChart3 size={20} className="text-brand-500" />, title: 'Science-backed model', desc: 'Trained on the CPT-II Conners dataset with contrastive multimodal learning across three physiological signals.' },
                { icon: <Brain size={20} className="text-brand-500" />, title: 'Transparent results', desc: 'Results show a likelihood band with uncertainty range — never a false-precision percentage or a diagnosis.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">{icon}</div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-0.5">{title}</h4>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-brand-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
        <p className="text-brand-200 mb-8 max-w-md mx-auto">Complete as many modules as you like. Partial results are available immediately.</p>
        <button
          onClick={() => navigate('/auth')}
          className="bg-white text-brand-700 hover:bg-brand-50 font-semibold px-8 py-3.5 rounded-xl transition-all hover:scale-105 shadow-lg inline-flex items-center gap-2"
        >
          Start Free Assessment <ChevronRight size={18} />
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 text-center text-sm">
        <p className="mb-2">
          <strong className="text-white">FocusLens</strong> — For informational and educational purposes only.
          Not a licensed diagnostic tool. Not a medical device.
        </p>
        <p>Consult a qualified clinician for any health-related decisions.</p>
      </footer>
    </div>
  )
}
