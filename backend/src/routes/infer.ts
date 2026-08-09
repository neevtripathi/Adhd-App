import { Router } from 'express'
import { runInference } from '../services/inference.js'

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL ?? 'http://localhost:9090'

async function callModelServer(payload: unknown) {
  const res = await fetch(`${MODEL_SERVER_URL}/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Model server ${res.status}: ${text}`)
  }
  return res.json()
}

export const inferRouter = Router()

// POST /api/infer — stateless, accepts all modalities at once
inferRouter.post('/', async (req, res) => {
  const { session_id = 'direct', cpt, activity, hrv, questionnaire } = req.body

  const inp: any = {}
  if (cpt)           inp.cpt           = cpt
  if (activity)      inp.activity      = activity
  if (hrv)           inp.hrv           = hrv
  if (questionnaire) inp.questionnaire = questionnaire

  if (!cpt && !activity && !hrv && !questionnaire) {
    return res.status(400).json({ error: 'At least one modality required.' })
  }

  let prediction
  if (MODEL_SERVER_URL) {
    try {
      prediction = await callModelServer({ session_id, ...inp })
    } catch (err) {
      console.warn('Model server unreachable, using fallback:', (err as Error).message)
      prediction = runInference(inp)
    }
  } else {
    prediction = runInference(inp)
  }

  res.json({ prediction })
})
