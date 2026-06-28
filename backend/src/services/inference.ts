import type { CptFeatureVector } from './featureExtraction.js'

export type LikelihoodBand = 'low'|'moderate'|'elevated'|'high'
export type ConfidenceTier = 'low'|'medium-low'|'medium'|'medium-high'|'high'

export interface PredictionResult {
  adhd_probability: number
  likelihood_band: LikelihoodBand
  likelihood_band_label: string
  modalities_used: string[]
  confidence_tier: ConfidenceTier
  confidence_label: string
  uncertainty_interval: [number, number]
  branch_contributions: { cpt: number|null; activity: number|null; hrv: number|null }
  contributing_factors: string[]
  data_quality_flags: string[]
  model_version: string
  inferred_at: string
}

const sigmoid = (x: number) => 1/(1+Math.exp(-x))

function band(p: number): {band: LikelihoodBand; label: string} {
  if (p < 0.30) return {band:'low', label:'Low indication of ADHD-like traits'}
  if (p < 0.55) return {band:'moderate', label:'Some indication of ADHD-like traits'}
  if (p < 0.75) return {band:'elevated', label:'Elevated indication of ADHD-like traits'}
  return {band:'high', label:'Strong indication of ADHD-like traits'}
}

function confidenceTier(mods: string[]): {tier: ConfidenceTier; label: string} {
  const n=mods.length, hasCpt=mods.includes('cpt')
  if (n===0) return {tier:'low', label:'No data collected'}
  if (n===3) return {tier:'high', label:'Full assessment'}
  if (n===2 && mods.includes('activity') && mods.includes('hrv')) return {tier:'medium-high', label:'Physiological assessment'}
  if (n===2 && hasCpt) return {tier:'medium', label:'Partial assessment'}
  if (hasCpt) return {tier:'medium-low', label:'Attention only'}
  return {tier:'low', label:'Single modality'}
}

export function runInference(data: {
  cpt?: {source:'game'|'self_report'; features: CptFeatureVector}
  activity?: {confidence_tier:string; days_collected:number; mean_daily_score:number}
  hrv?: {confidence_tier:string; sdnn:number; rmssd:number}
  questionnaire?: {asrs_inattention_score:number; asrs_hyperactivity_score:number; sleep_quality:number; stress_level:number}
}): PredictionResult {
  const mods: string[] = []
  const factors: string[] = []
  const flags: string[] = []
  let logit = -0.4   // ~40% baseline

  let cptP: number|null = null
  let actP: number|null = null
  let hrvP: number|null = null

  if (data.cpt) {
    mods.push('cpt')
    const f = data.cpt.features
    const isSR = data.cpt.source === 'self_report'
    const cptLogit =
      ((f.commissions_t-50)/10)*0.50 +
      ((f.hit_rt_sd_t-50)/10)*0.45 +
      ((f.omissions_t-50)/10)*0.30 +
      ((f.perseverations_t-50)/10)*0.20 +
      (f.block_change>0.02?0.30:0) +
      (f.isi_change>0.10?0.25:0) -
      (f.detectability_d_prime>2?0.40:0)
    cptP = Math.round(sigmoid(cptLogit)*100)/100
    logit += isSR ? cptLogit*0.6 : cptLogit
    if (isSR) flags.push('cpt_self_report_mode')
    if (f.hit_rt_sd_t>65) factors.push('Your reaction-time consistency showed higher-than-average variability across the session.')
    if (f.commissions_t>60) factors.push('Your impulse control showed more false-alarm responses than typical.')
    if (f.omissions_t>60) factors.push('Your sustained attention showed more missed targets than typical.')
    if (f.block_change>0.02) factors.push('Your error rate increased across blocks, suggesting attention fatigue over time.')
    if (f.detectability_d_prime<1.5) factors.push('Your ability to distinguish targets from non-targets was somewhat reduced.')
  }

  if (data.activity) {
    mods.push('activity')
    const a = data.activity
    const aLogit = ((a.mean_daily_score-3)/2)*-0.2
    actP = Math.round(sigmoid(aLogit)*100)/100
    logit += aLogit*(a.confidence_tier==='standard'?0.40:a.confidence_tier==='reduced'?0.25:0.15)
    if (a.confidence_tier!=='standard') flags.push('activity_reduced_confidence')
    factors.push(`Your activity data over ${a.days_collected} day(s) showed ${a.mean_daily_score<=2?'below-average':'typical'} movement patterns.`)
  }

  if (data.hrv) {
    mods.push('hrv')
    const h = data.hrv
    const hLogit = h.sdnn<40?0.35:h.sdnn>70?-0.20:0.10
    hrvP = Math.round(sigmoid(hLogit)*100)/100
    logit += hLogit*(h.confidence_tier==='standard'?0.35:0.20)
    if (h.confidence_tier==='reduced') flags.push('hrv_reduced_confidence')
    factors.push(`Your heart-rate variability (SDNN: ${h.sdnn}ms) indicated ${h.sdnn<40?'reduced':'typical'} autonomic regulation.`)
  }

  if (data.questionnaire) {
    const q = data.questionnaire
    const asrsTotal = q.asrs_inattention_score + q.asrs_hyperactivity_score
    logit = logit*0.7 + ((asrsTotal-24)/8)*0.3
    if (asrsTotal>32) factors.push('Your self-report responses indicate frequent difficulties with attention and activity regulation.')
    else if (asrsTotal<16) factors.push('Your self-report responses indicate relatively few attention-related difficulties.')
    if (q.sleep_quality<=2) { logit+=0.15; flags.push('confound_poor_sleep') }
    if (q.stress_level>=4) { logit+=0.10; flags.push('confound_high_stress') }
  }

  if (factors.length===0) factors.push('A baseline estimate was generated from the data provided.')

  const prob = Math.max(0.05, Math.min(0.95, sigmoid(logit)))
  const spread = mods.length===3?0.10:mods.length===2?0.15:0.22
  const {band: bnd, label: bLabel} = band(prob)
  const {tier, label: cLabel} = confidenceTier(mods)

  return {
    adhd_probability: Math.round(prob*100)/100,
    likelihood_band: bnd,
    likelihood_band_label: bLabel,
    modalities_used: mods,
    confidence_tier: tier,
    confidence_label: cLabel,
    uncertainty_interval: [Math.round(Math.max(0.02,prob-spread)*100)/100, Math.round(Math.min(0.98,prob+spread)*100)/100],
    branch_contributions: {cpt:cptP, activity:actP, hrv:hrvP},
    contributing_factors: factors,
    data_quality_flags: flags,
    model_version: '1.0.0-sim',
    inferred_at: new Date().toISOString()
  }
}
