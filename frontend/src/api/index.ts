// Points to the deployed Node.js backend when VITE_API_URL is set,
// otherwise falls back to the local dev proxy at /api.
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

async function post(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text().catch(() => '')}`)
  return r.json()
}

export async function checkBackendAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) })
    return r.ok
  } catch {
    return false
  }
}

export const api = {
  createSession: (isGuest: boolean, userId?: string) =>
    post('/sessions', { is_guest: isGuest, user_id: userId }),

  submitCpt:          (sid: string, data: unknown) => post(`/sessions/${sid}/cpt`, data),
  submitActivity:     (sid: string, data: unknown) => post(`/sessions/${sid}/activity`, data),
  submitHrv:          (sid: string, data: unknown) => post(`/sessions/${sid}/hrv`, data),
  submitQuestionnaire:(sid: string, data: unknown) => post(`/sessions/${sid}/questionnaire`, data),
  runSessionInfer:    (sid: string)                => post(`/sessions/${sid}/infer`, {}),

  // Stateless: submit all modalities + run inference in one call
  runInference: (payload: {
    session_id?: string
    cpt?:           unknown
    activity?:      unknown
    hrv?:           unknown
    questionnaire?: unknown
  }) => post('/infer', payload),
}
