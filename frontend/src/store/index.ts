import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CptData, ActivityData, HrvData, QuestionnaireData, PredictionResult } from '../types'

interface AppState {
  sessionId: string | null
  userId: string | null
  isGuest: boolean
  userEmail: string | null
  cpt: CptData | null
  activity: ActivityData | null
  hrv: HrvData | null
  questionnaire: QuestionnaireData | null
  predictions: PredictionResult[]
  latestPrediction: PredictionResult | null

  startSession: (sessionId: string, isGuest: boolean, userId?: string, email?: string) => void
  setCpt: (d: CptData) => void
  setActivity: (d: ActivityData) => void
  setHrv: (d: HrvData) => void
  setQuestionnaire: (d: QuestionnaireData) => void
  addPrediction: (p: PredictionResult) => void
  clearSession: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      sessionId: null, userId: null, isGuest: true, userEmail: null,
      cpt: null, activity: null, hrv: null, questionnaire: null,
      predictions: [], latestPrediction: null,

      startSession: (sessionId, isGuest, userId, email) =>
        set({ sessionId, isGuest, userId: userId ?? null, userEmail: email ?? null,
              cpt: null, activity: null, hrv: null, questionnaire: null,
              predictions: [], latestPrediction: null }),

      setCpt: (d) => set({ cpt: d }),
      setActivity: (d) => set({ activity: d }),
      setHrv: (d) => set({ hrv: d }),
      setQuestionnaire: (d) => set({ questionnaire: d }),

      addPrediction: (p) =>
        set((s) => ({ predictions: [...s.predictions, p], latestPrediction: p })),

      clearSession: () =>
        set({ sessionId: null, userId: null, isGuest: true, userEmail: null,
              cpt: null, activity: null, hrv: null, questionnaire: null,
              predictions: [], latestPrediction: null }),
    }),
    { name: 'focuslens-v1', version: 1 }
  )
)
