// ─── PKCE helpers ─────────────────────────────────────────────────────────────

export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(64)))
    .map(b => chars[b % chars.length]).join('')
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { verifier, challenge }
}

// ─── Fitbit OAuth2 (PKCE, public client — no client_secret needed) ─────────

export async function startFitbitAuth(clientId: string): Promise<void> {
  const { verifier, challenge } = await generatePKCE()
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  sessionStorage.setItem('fitbit_verifier', verifier)
  sessionStorage.setItem('fitbit_state', state)
  sessionStorage.setItem('fitbit_client_id', clientId)

  const redirectUri = window.location.href.split('?')[0]
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'heartrate activity',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })
  window.location.href = `https://www.fitbit.com/oauth2/authorize?${params}`
}

export async function exchangeFitbitCode(code: string): Promise<string> {
  const verifier  = sessionStorage.getItem('fitbit_verifier') ?? ''
  const clientId  = sessionStorage.getItem('fitbit_client_id') ?? ''
  const redirectUri = window.location.href.split('?')[0]

  const resp = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.errors?.[0]?.message ?? `Token exchange failed (${resp.status})`)
  }
  const json = await resp.json()
  return json.access_token as string
}

// ─── Fitbit data fetching ──────────────────────────────────────────────────

export async function fetchFitbitActivity(accessToken: string, days = 3) {
  const dates = getLastNDates(days)
  const results = await Promise.all(dates.map(async date => {
    const r = await fetch(`https://api.fitbit.com/1/user/-/activities/date/${date}.json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!r.ok) throw new Error(`Fitbit activity fetch failed for ${date}`)
    const j = await r.json()
    return j.summary as { steps: number; fairlyActiveMinutes: number; veryActiveMinutes: number }
  }))

  const dailySteps  = results.map(r => r.steps ?? 0)
  const dailyScores = dailySteps.map(stepsToScore)
  const windows     = dailySteps.map(generateActivityWindow)

  return {
    confidence_tier: 'standard' as const,
    days_collected: days,
    mean_daily_score: mean(dailyScores),
    daily_scores: dailyScores,
    source: 'fitbit' as const,
    windows,
    raw_steps: dailySteps,
    submitted_at: new Date().toISOString(),
  }
}

export async function fetchFitbitHRV(accessToken: string, days = 7) {
  const endDate   = formatDate(new Date())
  const startObj  = new Date(); startObj.setDate(startObj.getDate() - days)
  const startDate = formatDate(startObj)

  const r = await fetch(
    `https://api.fitbit.com/1/user/-/hrv/date/${startDate}/${endDate}.json`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!r.ok) throw new Error(`Fitbit HRV fetch failed (${r.status})`)
  const json = await r.json()
  const records: Array<{ value: { dailyRmssd: number } }> = json.hrv ?? []

  if (records.length === 0)
    throw new Error('No HRV data found. Your Fitbit device may not support HRV tracking (requires Sense or Versa 3+).')

  const rmssdValues = records.map(r => r.value.dailyRmssd).filter(Boolean)
  const rmssd       = Math.round(mean(rmssdValues))
  const sdnn        = Math.round(rmssd / 0.85)
  const windows     = rmssdValues.map(generateHRVWindow)

  return {
    confidence_tier: 'standard' as const,
    sdnn,
    rmssd,
    source: 'fitbit' as const,
    windows,
    submitted_at: new Date().toISOString(),
  }
}

// ─── CSV parsing ──────────────────────────────────────────────────────────

export function parseActivityCSV(text: string) {
  const lines   = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
  const rows    = lines.slice(1).map(l => l.split(',').map(v => v.trim()))

  const stepsIdx = headers.findIndex(h => h.includes('step'))
  const scoreIdx = headers.findIndex(h => h === 'score' || h === 'activity_score' || h === 'activity_level')

  if (stepsIdx < 0 && scoreIdx < 0)
    throw new Error('CSV must have a "steps" or "activity_score" column. See the template above.')

  if (stepsIdx >= 0) {
    const steps   = rows.map(r => parseInt(r[stepsIdx]) || 0)
    return { dailyScores: steps.map(stepsToScore), windows: steps.map(generateActivityWindow), rawSteps: steps }
  }

  const scores = rows.map(r => Math.min(5, Math.max(1, parseInt(r[scoreIdx]) || 3)))
  return { dailyScores: scores, windows: scores.map(generateActivityWindowFromScore), rawSteps: null }
}

export function parseHRVCSV(text: string) {
  const lines   = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
  const rows    = lines.slice(1).map(l => l.split(',').map(v => v.trim()))

  const sdnnIdx  = headers.findIndex(h => h === 'sdnn')
  const rmssdIdx = headers.findIndex(h => h === 'rmssd')

  if (sdnnIdx < 0 && rmssdIdx < 0)
    throw new Error('CSV must have "sdnn" and/or "rmssd" columns. See the template above.')

  const rmssdVals = rmssdIdx >= 0 ? rows.map(r => parseFloat(r[rmssdIdx])).filter(v => !isNaN(v)) : []
  const sdnnVals  = sdnnIdx  >= 0 ? rows.map(r => parseFloat(r[sdnnIdx])).filter(v => !isNaN(v))  : []

  const avgRmssd = rmssdVals.length > 0 ? mean(rmssdVals) : 0
  const avgSdnn  = sdnnVals.length  > 0 ? mean(sdnnVals)  : 0

  const rmssd = avgRmssd || Math.round(avgSdnn * 0.85)
  const sdnn  = avgSdnn  || Math.round(avgRmssd / 0.85)

  if (!rmssd && !sdnn) throw new Error('Could not parse any HRV values from the CSV.')

  const windows = (rmssdVals.length > 0 ? rmssdVals : [rmssd]).map(generateHRVWindow)
  return { sdnn: Math.round(sdnn), rmssd: Math.round(rmssd), windows }
}

// ─── Apple Health XML parsing ──────────────────────────────────────────────

export interface AppleHealthResult {
  activity?: { dailyScores: number[]; windows: number[][]; rawSteps: number[] }
  hrv?:      { sdnn: number; rmssd: number; windows: number[][] }
}

export function parseAppleHealthXML(xmlText: string): AppleHealthResult {
  const doc     = new DOMParser().parseFromString(xmlText, 'text/xml')
  const records = Array.from(doc.querySelectorAll('Record'))

  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  // HRV — Apple Health stores SDNN from overnight HRV analysis
  const hrvRecs = records.filter(r =>
    r.getAttribute('type') === 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' &&
    new Date(r.getAttribute('startDate') ?? 0) > sevenDaysAgo
  )

  // Steps — aggregate per day
  const stepsByDay: Record<string, number> = {}
  records
    .filter(r =>
      r.getAttribute('type') === 'HKQuantityTypeIdentifierStepCount' &&
      new Date(r.getAttribute('startDate') ?? 0) > threeDaysAgo
    )
    .forEach(r => {
      const day = (r.getAttribute('startDate') ?? '').split(' ')[0]
      if (day) stepsByDay[day] = (stepsByDay[day] ?? 0) + parseFloat(r.getAttribute('value') ?? '0')
    })

  const result: AppleHealthResult = {}

  if (hrvRecs.length > 0) {
    const sdnnValues = hrvRecs.map(r => parseFloat(r.getAttribute('value') ?? '0')).filter(Boolean)
    const avgSdnn    = mean(sdnnValues)
    result.hrv = {
      sdnn:    Math.round(avgSdnn),
      rmssd:   Math.round(avgSdnn * 0.85),
      windows: sdnnValues.slice(0, 7).map(s => generateHRVWindow(s * 0.85)),
    }
  }

  const dailySteps = Object.values(stepsByDay).slice(0, 7)
  if (dailySteps.length > 0) {
    result.activity = {
      dailyScores: dailySteps.map(stepsToScore),
      windows:     dailySteps.map(generateActivityWindow),
      rawSteps:    dailySteps.map(Math.round),
    }
  }

  if (!result.activity && !result.hrv)
    throw new Error('No HRV or step-count records found in the last 7 days. Make sure you exported the full Apple Health archive.')

  return result
}

// ─── Window generators (synthetic actigraphy / RR sequences for the TCN) ──

function generateActivityWindow(steps: number): number[] {
  const level = Math.min(steps / 15000, 1.0)
  const arr: number[] = []
  for (let i = 0; i < 512; i++) {
    const t = i / 512
    const base  = level * 0.3
    const burst = level * 0.7 * Math.max(0, Math.sin(t * Math.PI * 6) + Math.random() * 0.4 - 0.2)
    arr.push(Math.max(0, base + burst + (Math.random() - 0.5) * 0.05))
  }
  return arr
}

function generateActivityWindowFromScore(score: number): number[] {
  const stepMap = [1500, 4000, 6500, 10000, 14000]
  return generateActivityWindow(stepMap[score - 1] ?? 6500)
}

function generateHRVWindow(rmssd: number): number[] {
  // R-R interval sequence (seconds), mean ~800ms (~75 bpm), SD ≈ rmssd
  const arr: number[] = []
  for (let i = 0; i < 512; i++) {
    const u = Math.random(), v = Math.random()
    const noise = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) // Box–Muller
    arr.push((800 + noise * rmssd) / 1000)
  }
  return arr
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function stepsToScore(steps: number): number {
  if (steps < 3000) return 1
  if (steps < 5000) return 2
  if (steps < 8000) return 3
  if (steps < 12000) return 4
  return 5
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function getLastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return formatDate(d)
  })
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ─── CSV template strings (shown in the UI) ────────────────────────────────

export const ACTIVITY_CSV_TEMPLATE = `date,steps
${getLastNDates(3).reverse().map(d => `${d},8000`).join('\n')}`

export const HRV_CSV_TEMPLATE = `date,sdnn,rmssd
${getLastNDates(7).reverse().map(d => `${d},52,44`).join('\n')}`
