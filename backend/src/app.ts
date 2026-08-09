import express from 'express'
import cors from 'cors'
import { sessionsRouter } from './routes/sessions.js'
import { inferRouter } from './routes/infer.js'

const app = express()

const rawOrigins = process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173'
const corsOrigin = rawOrigins === '*' ? true : rawOrigins.split(',')
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '50mb' }))  // large for wearable windows

app.use('/api/sessions', sessionsRouter)
app.use('/api/infer',    inferRouter)
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', model_server: process.env.MODEL_SERVER_URL ?? null })
)

export default app
