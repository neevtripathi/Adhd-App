import { useRef, useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, ChevronRight, Award, Info, ArrowLeft } from 'lucide-react'
import { useStore } from '../store'
import { extractCptFeatures, generateTrialSeq } from '../utils/gameFeatures'
import type { TrialEvent } from '../types'
import DisclaimerBanner from '../components/DisclaimerBanner'
import NavBar from '../components/NavBar'

// ─── Game constants ───────────────────────────────────────────────────────────
const BLOCK_ISI = [1500, 1500, 1000, 1000, 3500, 3500]   // ms per block
const STIM_DURATION = 200                                  // ms stimulus visible
const RESPONSE_WINDOW = 1000                               // ms from stimulus onset
const TRIALS_PER_BLOCK = 30
const BLOCKS = 6
const PRACTICE_TRIALS = 10
const PERSEV_WINDOW = 150                                  // ms after trial end → perseveration

type GamePhase = 'INTRO'|'PRACTICE_INTRO'|'PRACTICE'|'PRACTICE_DONE'|'BLOCK_INTRO'|'RUNNING'|'INTER_BLOCK'|'DONE'
type TrialPhase = 'ISI'|'STIMULUS'|'POST_STIM'

interface LiveState {
  phase: GamePhase
  trialPhase: TrialPhase
  blockIdx: number
  trialIdx: number            // within block
  isPractice: boolean
  stimType: 'go'|'nogo'
  phaseStart: number          // performance.now()
  trialEnd: number            // when last trial ended (for persev detection)
  responded: boolean
  responseTime: number|null
  score: number
  streak: number
  maxStreak: number
  feedback: null|'hit'|'miss'|'commission'|'cr'
  feedbackStart: number
  events: TrialEvent[]
  sessionStart: number
  trialsSeq: ('go'|'nogo')[][]  // [block][trial]
}

function buildSequences(isPractice = false): ('go'|'nogo')[][] {
  if (isPractice) return [generateTrialSeq(PRACTICE_TRIALS)]
  return Array.from({ length: BLOCKS }, () => generateTrialSeq(TRIALS_PER_BLOCK))
}

// ─── Canvas draw ─────────────────────────────────────────────────────────────
function drawFrame(canvas: HTMLCanvasElement, s: LiveState) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  const cx = W/2, cy = H/2

  // Background
  ctx.fillStyle = '#080b14'
  ctx.fillRect(0,0,W,H)

  const isRunning = s.phase === 'RUNNING'
  const stimVisible = isRunning && s.trialPhase === 'STIMULUS'
  const feedbackActive = s.feedback && (performance.now() - s.feedbackStart) < 300

  // Stimulus circle
  if (stimVisible) {
    const isGo = s.stimType === 'go'
    const radius = 72

    // Glow
    const grd = ctx.createRadialGradient(cx,cy,0,cx,cy,radius+30)
    const glowColor = isGo ? '99,102,241' : '148,163,184'
    grd.addColorStop(0, `rgba(${glowColor},0.15)`)
    grd.addColorStop(1, `rgba(${glowColor},0)`)
    ctx.fillStyle = grd
    ctx.fillRect(cx-radius-30, cy-radius-30, (radius+30)*2, (radius+30)*2)

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI*2)
    if (isGo) {
      ctx.fillStyle = '#6366f1'
      ctx.fill()
    } else {
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 8
      ctx.stroke()
    }
  } else if (isRunning) {
    // Fixation cross during ISI / post-stim
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx-12,cy); ctx.lineTo(cx+12,cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx,cy-12); ctx.lineTo(cx,cy+12); ctx.stroke()
  }

  // Feedback flash ring
  if (feedbackActive && isRunning) {
    const colors: Record<string, string> = { hit:'#4ade80', miss:'#f87171', commission:'#f87171', cr:'#4ade80' }
    const alpha = 1 - (performance.now() - s.feedbackStart)/300
    ctx.strokeStyle = (colors[s.feedback!]??'#888') + Math.round(alpha*255).toString(16).padStart(2,'0')
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI*2); ctx.stroke()
  }

  // Top-left: block / trial
  ctx.fillStyle = '#475569'
  ctx.font = '500 13px Inter, system-ui'
  ctx.textAlign = 'left'
  if (s.phase==='RUNNING'||s.phase==='INTER_BLOCK') {
    const label = s.isPractice ? 'Practice' : `Round ${s.blockIdx+1}/${BLOCKS}`
    const trialLabel = s.isPractice ? `Trial ${s.trialIdx+1}/${PRACTICE_TRIALS}` : `Trial ${s.trialIdx+1}/${TRIALS_PER_BLOCK}`
    ctx.fillText(label, 20, 28)
    ctx.fillStyle = '#334155'
    ctx.font = '400 12px Inter, system-ui'
    ctx.fillText(trialLabel, 20, 46)
  }

  // Top-right: score
  ctx.textAlign = 'right'
  ctx.fillStyle = '#f1f5f9'
  ctx.font = `700 ${s.score > 9999 ? '22' : '26'}px Inter, system-ui`
  ctx.fillText(s.score.toString(), W-20, 34)
  ctx.fillStyle = '#475569'
  ctx.font = '500 11px Inter, system-ui'
  ctx.fillText('SCORE', W-20, 50)

  // Streak
  if (s.streak >= 3) {
    ctx.textAlign = 'center'
    ctx.fillStyle = `rgba(74,222,128,${Math.min(1, s.streak/10)})`
    ctx.font = `700 ${14 + Math.min(s.streak,8)}px Inter, system-ui`
    ctx.fillText(`${s.streak}× Streak!`, cx, H-28)
  }

  // SPACE hint (only when no stimulus / ISI early phase)
  if (isRunning && s.trialPhase === 'ISI') {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1e293b'
    ctx.font = '400 11px Inter, system-ui'
    ctx.fillText('SPACE or tap to respond', cx, H-10)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GameModule() {
  const navigate = useNavigate()
  const { sessionId, setCpt } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<LiveState>({
    phase:'INTRO', trialPhase:'ISI', blockIdx:0, trialIdx:0,
    isPractice:false, stimType:'go', phaseStart:0, trialEnd:0,
    responded:false, responseTime:null, score:0, streak:0, maxStreak:0,
    feedback:null, feedbackStart:0, events:[], sessionStart:0,
    trialsSeq:buildSequences()
  })
  const rafRef = useRef<number>(0)
  const [uiPhase, setUiPhase] = useState<GamePhase>('INTRO')
  const [gameData, setGameData] = useState<{score:number;badges:string[];events:TrialEvent[]}|null>(null)
  const [saving, setSaving] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  // Sync ui phase from ref
  const setPhase = useCallback((p: GamePhase) => {
    stateRef.current.phase = p
    setUiPhase(p)
  }, [])

  const advanceTrial = useCallback(() => {
    const s = stateRef.current
    const total = s.isPractice ? PRACTICE_TRIALS : TRIALS_PER_BLOCK
    if (s.trialIdx + 1 < total) {
      s.trialIdx++
    } else {
      // block/practice done
      if (s.isPractice) { setPhase('PRACTICE_DONE'); return }
      if (s.blockIdx + 1 < BLOCKS) {
        s.blockIdx++; s.trialIdx = 0
        setPhase('INTER_BLOCK'); s.phaseStart = performance.now()
        return
      } else {
        setPhase('DONE')
        cancelAnimationFrame(rafRef.current)
        // Compute badges
        const ev = s.events
        const goEv = ev.filter(e=>e.stimulus_type==='go')
        const nogoEv = ev.filter(e=>e.stimulus_type==='nogo')
        const omit = goEv.filter(e=>!e.response_given).length
        const comm = nogoEv.filter(e=>e.response_given&&!e.is_perseveration).length
        const hits = goEv.filter(e=>e.response_given&&!e.is_perseveration)
        const rts = hits.map(e=>e.response_time_ms!).filter(Boolean)
        const rtMean = rts.length ? rts.reduce((a,b)=>a+b)/rts.length : 999
        const rtSd = rts.length>1 ? Math.sqrt(rts.reduce((a,b)=>a+(b-rtMean)**2)/rts.length) : 999
        const badges: string[] = []
        if (omit === 0) badges.push('🎯 Iron Focus — zero missed targets')
        if (comm === 0) badges.push('🧘 Perfect Control — zero false alarms')
        if (rtMean < 280) badges.push('⚡ Hair Trigger — avg RT under 280ms')
        if (rtSd < 70) badges.push('🪨 Rock Steady — very consistent timing')
        if (s.maxStreak >= 15) badges.push('🔥 Streak Master — 15+ consecutive hits')
        setGameData({ score: s.score, badges, events: ev })
        return
      }
    }
    // Start new ISI
    s.trialPhase = 'ISI'
    s.phaseStart = performance.now()
    s.trialEnd = performance.now()
    s.responded = false
    s.responseTime = null
    s.stimType = s.trialsSeq[s.isPractice ? 0 : s.blockIdx][s.trialIdx]
  }, [setPhase])

  const recordResponse = useCallback(() => {
    const s = stateRef.current
    if (s.phase !== 'RUNNING') return
    const now = performance.now()

    // Perseveration: response during ISI within PERSEV_WINDOW of trial end
    if (s.trialPhase === 'ISI') {
      const sincePrev = now - s.trialEnd
      if (sincePrev < PERSEV_WINDOW) {
        // record as perseveration on the previous event if it exists
        const last = s.events[s.events.length-1]
        if (last) last.is_perseveration = true
      }
      return
    }

    if (s.responded) return
    s.responded = true
    const rt = now - s.phaseStart  // rt from stimulus onset

    if (s.stimType === 'go') {
      // Hit
      const streakBonus = s.streak >= 10 ? 2 : s.streak >= 5 ? 1.5 : 1
      s.score += Math.round(10 * streakBonus)
      s.streak++
      s.maxStreak = Math.max(s.maxStreak, s.streak)
      s.feedback = 'hit'
    } else {
      // Commission
      s.streak = 0
      s.feedback = 'commission'
    }
    s.feedbackStart = now
    s.responseTime = rt

    if (!s.isPractice) {
      const ev = s.events[s.events.length-1]
      if (ev) {
        ev.response_given = true
        ev.response_time_ms = Math.round(rt)
      }
    }
  }, [])

  // Main game loop
  const gameLoop = useCallback((ts: number) => {
    const s = stateRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    const now = performance.now()
    const elapsed = now - s.phaseStart

    if (s.phase === 'RUNNING') {
      if (s.trialPhase === 'ISI') {
        const isi = BLOCK_ISI[s.isPractice ? 1 : s.blockIdx]
        if (elapsed >= isi) {
          // Start stimulus
          s.trialPhase = 'STIMULUS'
          s.phaseStart = now
          s.responded = false
          // Record trial event
          if (!s.isPractice) {
            s.events.push({
              trial_index: s.blockIdx * TRIALS_PER_BLOCK + s.trialIdx,
              block_index: s.blockIdx,
              isi_ms: isi,
              stimulus_type: s.stimType,
              stimulus_onset_ms: Math.round(now - s.sessionStart),
              response_given: false,
              response_time_ms: null,
              is_perseveration: false,
            })
          }
        }
      } else if (s.trialPhase === 'STIMULUS') {
        if (elapsed >= STIM_DURATION) {
          s.trialPhase = 'POST_STIM'
          s.phaseStart = now
        }
      } else if (s.trialPhase === 'POST_STIM') {
        const remainingWindow = RESPONSE_WINDOW - STIM_DURATION - elapsed
        if (remainingWindow <= 0) {
          // Response window closed
          if (!s.responded) {
            if (s.stimType === 'go') { s.streak = 0; s.feedback = 'miss'; s.feedbackStart = now }
            else { s.feedback = 'cr'; s.feedbackStart = now; s.score += 5 }
            if (!s.isPractice) {
              const ev = s.events[s.events.length-1]
              if (ev) { ev.response_given = false; ev.response_time_ms = null }
            }
          }
          s.trialEnd = now
          advanceTrial()
        }
      }
    } else if (s.phase === 'INTER_BLOCK') {
      if (elapsed >= 5000) {  // 5 second inter-block break
        s.trialsSeq[s.blockIdx] // ensure next block seq exists
        s.trialPhase = 'ISI'
        s.phaseStart = now
        s.responded = false
        s.responseTime = null
        s.stimType = s.trialsSeq[s.blockIdx][s.trialIdx]
        setPhase('RUNNING')
      }
    }

    drawFrame(canvas, s)
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [advanceTrial, setPhase])

  // Start / restart RAF
  const startGameLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [gameLoop])

  // Event listeners
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code==='Space'||e.code==='Enter') { e.preventDefault(); recordResponse() } }
    const onClick = () => recordResponse()
    window.addEventListener('keydown', onKey)
    canvasRef.current?.addEventListener('click', onClick)
    canvasRef.current?.addEventListener('touchstart', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      canvasRef.current?.removeEventListener('click', onClick)
      canvasRef.current?.removeEventListener('touchstart', onClick)
    }
  }, [recordResponse])

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current; if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function startPractice() {
    const s = stateRef.current
    s.isPractice = true
    s.blockIdx = 0; s.trialIdx = 0
    s.trialsSeq = buildSequences(true)
    s.trialPhase = 'ISI'
    s.phaseStart = performance.now()
    s.stimType = s.trialsSeq[0][0]
    s.responded = false
    s.sessionStart = performance.now()
    setPhase('PRACTICE')
    startGameLoop()
  }

  function startMainGame() {
    const s = stateRef.current
    s.isPractice = false
    s.blockIdx = 0; s.trialIdx = 0
    s.score = 0; s.streak = 0; s.maxStreak = 0
    s.events = []
    s.trialsSeq = buildSequences(false)
    s.trialPhase = 'ISI'
    s.phaseStart = performance.now()
    s.stimType = s.trialsSeq[0][0]
    s.responded = false
    s.sessionStart = performance.now()
    setPhase('RUNNING')
    startGameLoop()
  }

  function handleSaveResults() {
    if (!gameData) return
    setSaving(true)
    const features = extractCptFeatures(gameData.events)
    setCpt({
      source: 'game', features, trials: gameData.events,
      score: gameData.score, badges: gameData.badges,
      submitted_at: new Date().toISOString()
    })
    navigate('/dashboard')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const interBlockElapsed = stateRef.current.phase === 'INTER_BLOCK'
    ? performance.now() - stateRef.current.phaseStart : 0
  const interBlockCountdown = Math.ceil((5000 - interBlockElapsed) / 1000)

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-4 h-12 flex items-center justify-between">
        <button onClick={() => { cancelAnimationFrame(rafRef.current); navigate('/dashboard') }}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </button>
        <span className="flex items-center gap-2 text-brand-400 font-bold text-sm"><Zap size={14}/> Attention Challenge</span>
        <button onClick={() => setShowInfo(v=>!v)} className="text-slate-400 hover:text-white transition-colors">
          <Info size={16} />
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="bg-slate-800 border-b border-slate-700 px-5 py-4 max-w-2xl mx-auto w-full text-sm text-slate-300 space-y-1.5">
          <p className="font-semibold text-white">What this measures</p>
          <p>This game measures how consistently you respond over time, how quickly you react, and whether your responses change as the challenge progresses across rounds.</p>
          <p className="text-slate-400 text-xs">Press SPACE or tap the screen to respond to targets (filled circle). Withhold for non-targets (outlined circle).</p>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">

        {/* INTRO */}
        {uiPhase === 'INTRO' && (
          <div className="max-w-lg w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand-900/40">
              <Zap size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Attention Challenge</h1>
              <p className="text-slate-400 leading-relaxed">
                A focus challenge across 6 rounds, ~8 minutes total.<br/>
                React to <strong className="text-white">filled circles</strong> — hold back for <strong className="text-white">outlined circles</strong>.
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-600 rounded-full shrink-0" />
                <span className="text-sm text-slate-300">Filled circle → <strong className="text-white">Press SPACE or tap</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-slate-400 rounded-full shrink-0" />
                <span className="text-sm text-slate-300">Outlined circle → <strong className="text-white">Do nothing</strong></span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={startPractice}
                className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                Start Practice <ChevronRight size={16} />
              </button>
              <button onClick={startMainGame}
                className="px-5 py-3 border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl text-sm transition-colors">
                Skip practice
              </button>
            </div>
            <DisclaimerBanner compact />
          </div>
        )}

        {/* PRACTICE_DONE */}
        {uiPhase === 'PRACTICE_DONE' && (
          <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center space-y-5 animate-fade-in">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold text-white">Practice complete!</h2>
            <p className="text-slate-400">Now the real challenge begins. 6 rounds, 30 trials each.<br/>Your score and data collection start now.</p>
            <button onClick={startMainGame}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              Start Challenge <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* INTER_BLOCK overlay */}
        {uiPhase === 'INTER_BLOCK' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center space-y-4 max-w-sm w-full mx-4">
              <p className="text-slate-400 text-sm uppercase tracking-wide">Round {stateRef.current.blockIdx} complete</p>
              <h2 className="text-2xl font-bold text-white">Take a breath</h2>
              <div className="text-5xl font-black text-brand-400">{interBlockCountdown}</div>
              <p className="text-slate-400 text-sm">Score: <span className="text-white font-bold">{stateRef.current.score}</span></p>
            </div>
          </div>
        )}

        {/* DONE */}
        {uiPhase === 'DONE' && gameData && (
          <div className="max-w-lg w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="text-5xl mb-3">🏁</div>
              <h2 className="text-2xl font-bold text-white">Challenge complete!</h2>
              <p className="text-slate-400 mt-1">Here's how you did</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Score', value: gameData.score.toLocaleString() },
                { label: 'Trials', value: `${gameData.events.length}` },
                { label: 'Hits', value: `${gameData.events.filter(e=>e.stimulus_type==='go'&&e.response_given).length}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-700 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-white">{value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {gameData.badges.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-300 font-semibold">
                  <Award size={14} className="text-amber-400" /> Badges earned
                </div>
                {gameData.badges.map(b => (
                  <div key={b} className="bg-amber-900/30 border border-amber-700/30 rounded-lg px-3 py-2 text-sm text-amber-300">{b}</div>
                ))}
              </div>
            )}
            <DisclaimerBanner compact />
            <button onClick={handleSaveResults} disabled={saving}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <>Save results & continue <ChevronRight size={16}/></>}
            </button>
          </div>
        )}

        {/* Canvas — shown during game phases */}
        {(uiPhase === 'RUNNING' || uiPhase === 'PRACTICE' || uiPhase === 'INTER_BLOCK') && (
          <canvas
            ref={canvasRef}
            className="w-full max-w-2xl rounded-2xl cursor-pointer"
            style={{ aspectRatio: '16/9', maxHeight: '55vh' }}
          />
        )}
      </div>
    </div>
  )
}
