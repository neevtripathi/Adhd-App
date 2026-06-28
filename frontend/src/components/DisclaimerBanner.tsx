import { AlertTriangle } from 'lucide-react'

export default function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2 text-xs text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
        <span><strong>For informational purposes only.</strong> Not a clinical diagnosis. Consult a qualified clinician for formal ADHD evaluation.</span>
      </div>
    )
  }
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 flex items-start gap-3">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
      <p className="text-sm text-amber-800">
        <strong>For informational purposes only — not a clinical diagnosis.</strong>{' '}
        This tool does not diagnose ADHD and is not a substitute for evaluation by a licensed clinician.
        Always consult a qualified healthcare professional for a formal assessment.
      </p>
    </div>
  )
}
