import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react'
import { useStore } from '../store'
import type { QuestionnaireData } from '../types'
import DisclaimerBanner from '../components/DisclaimerBanner'
import NavBar from '../components/NavBar'

type Question =
  | { id: string; type: 'single'; text: string; options: string[] }
  | { id: string; type: 'frequency'; text: string }
  | { id: string; type: 'binary'; text: string; options: [string, string] }

const FREQ_OPTIONS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often']

const QUESTIONS: Question[] = [
  { id:'age_range', type:'single', text:'What is your age range?', options:['18–24','25–34','35–44','45–54','55+'] },
  { id:'sex', type:'single', text:'What is your biological sex?', options:['Male','Female','Non-binary','Prefer not to say'] },
  { id:'education', type:'single', text:'What is your highest education level?', options:['High school',"Bachelor's",'Graduate','Other'] },
  { id:'asrs_1', type:'frequency', text:'How often do you have trouble finishing the final details of a project?' },
  { id:'asrs_2', type:'frequency', text:'How often do you have difficulty getting tasks organised and in order?' },
  { id:'asrs_3', type:'frequency', text:'How often do you forget appointments or obligations?' },
  { id:'asrs_4', type:'frequency', text:'When a task requires a lot of thought, how often do you avoid starting it?' },
  { id:'asrs_5', type:'frequency', text:'How often do you fidget or feel restless when sitting for a long time?' },
  { id:'asrs_6', type:'frequency', text:'How often do you feel driven or compelled to be active and moving?' },
  { id:'asrs_7', type:'frequency', text:'How often do you make careless mistakes on boring or difficult tasks?' },
  { id:'asrs_8', type:'frequency', text:'How often do you have difficulty sustaining attention on repetitive work?' },
  { id:'asrs_9', type:'frequency', text:'How often do you have difficulty concentrating on what people say to you directly?' },
  { id:'asrs_10', type:'frequency', text:'How often do you misplace or lose things you need?' },
  { id:'asrs_11', type:'frequency', text:'How often are you easily distracted by noise or activity around you?' },
  { id:'asrs_12', type:'frequency', text:'How often do you leave your seat in situations where you are expected to stay?' },
  { id:'sleep_quality', type:'single', text:'How was your sleep quality over the past week?', options:['Very poor','Poor','Fair','Good','Very good'] },
  { id:'stress_level', type:'single', text:'How would you describe your stress level this week?', options:['Very low','Low','Moderate','High','Very high'] },
  { id:'confounders', type:'single', text:'Did you consume caffeine or take medication in the last 4 hours?', options:['No','Caffeine only','Medication only','Both'] },
  { id:'diagnosis', type:'single', text:'Have you ever been diagnosed with ADHD by a licensed clinician?', options:['Yes','No','Unsure','Prefer not to say'] },
  { id:'donation', type:'binary', text:'Would you like to share your anonymised data to help improve this model for others?', options:['Yes, contribute','No thanks'] },
]

export default function Questionnaire() {
  const navigate = useNavigate()
  const { sessionId, setQuestionnaire } = useStore()
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [saving, setSaving] = useState(false)

  const q = QUESTIONS[idx]
  const progress = Math.round((idx / QUESTIONS.length) * 100)

  function answer(val: number | string) {
    setAnswers(a => ({ ...a, [q.id]: val }))
    if (idx < QUESTIONS.length - 1) setTimeout(() => setIdx(i => i + 1), 250)
    else setTimeout(handleFinish, 250)
  }

  async function handleFinish() {
    setSaving(true)
    const a = { ...answers }

    const asrsIds = ['asrs_1','asrs_2','asrs_3','asrs_4','asrs_5','asrs_6']
    const asrsHyperIds = ['asrs_7','asrs_8','asrs_9','asrs_10','asrs_11','asrs_12']
    const inattention = asrsIds.reduce((s,id) => s + (Number(a[id]) ?? 2), 0)
    const hyperactivity = asrsHyperIds.reduce((s,id) => s + (Number(a[id]) ?? 2), 0)

    const sleepMap: Record<string,number> = {'Very poor':1,'Poor':2,'Fair':3,'Good':4,'Very good':5}
    const stressMap: Record<string,number> = {'Very low':1,'Low':2,'Moderate':3,'High':4,'Very high':5}
    const confounderMap: Record<string,string[]> = {
      'No':[], 'Caffeine only':['caffeine'],
      'Medication only':['medication'], 'Both':['caffeine','medication']
    }

    const data: QuestionnaireData = {
      age_range: String(a['age_range'] ?? ''),
      sex: String(a['sex'] ?? ''),
      education: String(a['education'] ?? ''),
      asrs_inattention_score: inattention,
      asrs_hyperactivity_score: hyperactivity,
      sleep_quality: sleepMap[String(a['sleep_quality'])] ?? 3,
      stress_level: stressMap[String(a['stress_level'])] ?? 3,
      confounders: confounderMap[String(a['confounders'])] ?? [],
      data_donation_consent: a['donation'] === 'Yes, contribute',
      diagnosis_label: a['diagnosis'] === 'Yes' ? 'adhd' : a['diagnosis'] === 'No' ? 'no_adhd' : a['diagnosis'] === 'Unsure' ? 'unsure' : null,
      submitted_at: new Date().toISOString()
    }
    setQuestionnaire(data)
    navigate('/dashboard')
    setSaving(false)
  }

  function getButtonStyle(selected: boolean) {
    return `w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
      selected
        ? 'border-brand-500 bg-brand-50 text-brand-700'
        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/40'
    }`
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Dashboard
        </button>
        <DisclaimerBanner compact />

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Question {idx + 1} of {QUESTIONS.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {saving ? (
          <div className="text-center py-16 text-slate-400 animate-pulse">Saving your responses…</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 animate-fade-in" key={idx}>
            <p className="text-lg font-semibold text-slate-900 leading-snug">{q.text}</p>

            {q.type === 'frequency' && (
              <div className="space-y-2">
                {FREQ_OPTIONS.map((opt, i) => (
                  <button key={opt} onClick={() => answer(i)} className={getButtonStyle(answers[q.id] === i)}>
                    <span className="text-slate-400 mr-2">{i + 1}.</span> {opt}
                  </button>
                ))}
              </div>
            )}

            {(q.type === 'single' || q.type === 'binary') && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button key={opt} onClick={() => answer(opt)} className={getButtonStyle(answers[q.id] === opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {!saving && (
          <div className="flex justify-between">
            <button onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx === 0}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} /> Previous
            </button>
            {answers[q.id] !== undefined && idx < QUESTIONS.length - 1 && (
              <button onClick={() => setIdx(i => i+1)}
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
