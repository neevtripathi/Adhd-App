const BASE = '/api'

async function post(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

export const api = {
  createSession: (isGuest: boolean, userId?: string) =>
    post('/sessions', { is_guest: isGuest, user_id: userId }),
  submitCpt: (sid: string, data: unknown) => post(`/sessions/${sid}/cpt`, data),
  submitActivity: (sid: string, data: unknown) => post(`/sessions/${sid}/activity`, data),
  submitHrv: (sid: string, data: unknown) => post(`/sessions/${sid}/hrv`, data),
  submitQuestionnaire: (sid: string, data: unknown) => post(`/sessions/${sid}/questionnaire`, data),
  runInference: (sid: string) => post(`/sessions/${sid}/infer`, {}),
}
