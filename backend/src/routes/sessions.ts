import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { extractCptFeatures } from '../services/featureExtraction.js'
import { runInference } from '../services/inference.js'

export const sessionsRouter = Router()

const sessions: Record<string, any> = {}

sessionsRouter.post('/', (req, res) => {
  const { user_id, is_guest } = req.body
  const sessionId = uuidv4()
  sessions[sessionId] = {
    session_id: sessionId, user_id: user_id||null,
    is_guest: is_guest!==false, status: 'in_progress',
    completed_modalities: [], cpt_data:null, activity_data:null,
    hrv_data:null, questionnaire_data:null, predictions:[],
    created_at: new Date().toISOString(), last_updated_at: new Date().toISOString()
  }
  res.json({ session_id: sessionId })
})

sessionsRouter.get('/:id', (req, res) => {
  const s = sessions[req.params.id]
  if (!s) return res.status(404).json({ error: 'Session not found' })
  res.json(s)
})

sessionsRouter.post('/:id/cpt', (req, res) => {
  const s = sessions[req.params.id]
  if (!s) return res.status(404).json({ error: 'Session not found' })
  const { trials, source, features: preFeatures } = req.body
  const features = source==='self_report' ? preFeatures : extractCptFeatures(trials)
  s.cpt_data = { source: source||'game', features, trials: trials||[], submitted_at: new Date().toISOString() }
  if (!s.completed_modalities.includes('cpt')) s.completed_modalities.push('cpt')
  s.last_updated_at = new Date().toISOString()
  res.json({ features })
})

sessionsRouter.post('/:id/activity', (req, res) => {
  const s = sessions[req.params.id]
  if (!s) return res.status(404).json({ error: 'Session not found' })
  s.activity_data = { ...req.body, submitted_at: new Date().toISOString() }
  if (!s.completed_modalities.includes('activity')) s.completed_modalities.push('activity')
  s.last_updated_at = new Date().toISOString()
  res.json({ ok: true })
})

sessionsRouter.post('/:id/hrv', (req, res) => {
  const s = sessions[req.params.id]
  if (!s) return res.status(404).json({ error: 'Session not found' })
  s.hrv_data = { ...req.body, submitted_at: new Date().toISOString() }
  if (!s.completed_modalities.includes('hrv')) s.completed_modalities.push('hrv')
  s.last_updated_at = new Date().toISOString()
  res.json({ ok: true })
})

sessionsRouter.post('/:id/questionnaire', (req, res) => {
  const s = sessions[req.params.id]
  if (!s) return res.status(404).json({ error: 'Session not found' })
  s.questionnaire_data = { ...req.body, submitted_at: new Date().toISOString() }
  if (!s.completed_modalities.includes('questionnaire')) s.completed_modalities.push('questionnaire')
  s.last_updated_at = new Date().toISOString()
  res.json({ ok: true })
})

sessionsRouter.post('/:id/infer', (req, res) => {
  const s = sessions[req.params.id]
  if (!s) return res.status(404).json({ error: 'Session not found' })
  const inp: any = {}
  if (s.cpt_data) inp.cpt = { source: s.cpt_data.source, features: s.cpt_data.features }
  if (s.activity_data) inp.activity = s.activity_data
  if (s.hrv_data) inp.hrv = s.hrv_data
  if (s.questionnaire_data) inp.questionnaire = s.questionnaire_data
  const prediction = runInference(inp)
  s.predictions.push(prediction)
  s.status = 'has_prediction'
  s.last_updated_at = new Date().toISOString()
  res.json({ prediction })
})
