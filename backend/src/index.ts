import express from 'express'
import cors from 'cors'
import { sessionsRouter } from './routes/sessions.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }))
app.use(express.json({ limit: '20mb' }))
app.use('/api/sessions', sessionsRouter)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`\n🧠  FocusLens API → http://localhost:${PORT}\n`))
