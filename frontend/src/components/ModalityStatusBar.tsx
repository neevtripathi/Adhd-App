import { CheckCircle2, Clock, Circle } from 'lucide-react'
import { useStore } from '../store'

const MODALITY_CONFIG = [
  { key: 'cpt', label: 'Attention Game', icon: '🎯' },
  { key: 'activity', label: 'Activity', icon: '📊' },
  { key: 'hrv', label: 'HRV', icon: '💓' },
  { key: 'questionnaire', label: 'Survey', icon: '📝' },
] as const

const CONFIDENCE_COLORS: Record<string, string> = {
  'high': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'medium-high': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'medium': 'text-brand-600 bg-brand-50 border-brand-200',
  'medium-low': 'text-amber-600 bg-amber-50 border-amber-200',
  'low': 'text-slate-500 bg-slate-50 border-slate-200',
}

export default function ModalityStatusBar({ prediction }: { prediction?: { confidence_tier: string; confidence_label: string; modalities_used: string[] } | null }) {
  const { cpt, activity, hrv, questionnaire } = useStore()

  const statusOf = (key: string) => {
    if (key === 'cpt') return cpt ? 'done' : 'pending'
    if (key === 'activity') return activity ? 'done' : 'pending'
    if (key === 'hrv') return hrv ? 'done' : 'pending'
    if (key === 'questionnaire') return questionnaire ? 'done' : 'pending'
    return 'pending'
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {MODALITY_CONFIG.map(({ key, label, icon }) => {
          const status = statusOf(key)
          return (
            <div key={key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                status === 'done'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
              {status === 'done'
                ? <CheckCircle2 size={14} className="text-emerald-500" />
                : <Circle size={14} />
              }
            </div>
          )
        })}
      </div>
      {prediction && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border font-medium ${CONFIDENCE_COLORS[prediction.confidence_tier] ?? CONFIDENCE_COLORS['low']}`}>
          <Clock size={13} />
          Confidence: <span className="capitalize">{prediction.confidence_tier.replace('-', '–')}</span>
          &nbsp;·&nbsp;{prediction.confidence_label}
        </div>
      )}
    </div>
  )
}
