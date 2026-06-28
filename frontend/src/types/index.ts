export interface TrialEvent {
  trial_index: number
  block_index: number
  isi_ms: number
  stimulus_type: 'go' | 'nogo'
  stimulus_onset_ms: number
  response_given: boolean
  response_time_ms: number | null
  is_perseveration: boolean
}

export interface CptFeatureVector {
  omissions_t: number
  commissions_t: number
  hit_rt_mean_t: number
  hit_rt_sd_t: number
  detectability_d_prime: number
  perseverations_t: number
  block_change: number
  isi_change: number
  confidence_index_t: number
  raw: {
    omissions: number
    commissions: number
    hit_rt_mean: number
    hit_rt_sd: number
    hit_rate: number
    false_alarm_rate: number
    perseverations: number
  }
}

export interface CptData {
  source: 'game' | 'self_report'
  features: CptFeatureVector
  trials: TrialEvent[]
  score: number
  badges: string[]
  submitted_at: string
}

export interface ActivityData {
  confidence_tier: 'standard' | 'reduced' | 'low'
  days_collected: number
  mean_daily_score: number
  daily_scores: number[]
  source: 'manual'
  submitted_at: string
}

export interface HrvData {
  confidence_tier: 'standard' | 'reduced'
  sdnn: number
  rmssd: number
  source: 'wearable' | 'simulated'
  submitted_at: string
}

export interface QuestionnaireData {
  age_range: string
  sex: string
  education: string
  asrs_inattention_score: number
  asrs_hyperactivity_score: number
  sleep_quality: number
  stress_level: number
  confounders: string[]
  data_donation_consent: boolean
  diagnosis_label: string | null
  submitted_at: string
}

export type LikelihoodBand = 'low' | 'moderate' | 'elevated' | 'high'
export type ConfidenceTier = 'low' | 'medium-low' | 'medium' | 'medium-high' | 'high'

export interface PredictionResult {
  adhd_probability: number
  likelihood_band: LikelihoodBand
  likelihood_band_label: string
  modalities_used: string[]
  confidence_tier: ConfidenceTier
  confidence_label: string
  uncertainty_interval: [number, number]
  branch_contributions: { cpt: number | null; activity: number | null; hrv: number | null }
  contributing_factors: string[]
  data_quality_flags: string[]
  model_version: string
  inferred_at: string
}
