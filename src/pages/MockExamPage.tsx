import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  OPIC_QUESTIONS, OPIC_LEVELS, QUESTION_TYPE_LABELS, scoreOPICAnswer,
  type OPICQuestion, type OPICScore,
} from '../lib/openai'
import { speakText, stopSpeaking } from '../lib/tts'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useStopwatch } from '../hooks/useStopwatch'
import { getUserGoal } from '../hooks/useUserGoal'
import type { ExamResult } from '../types'

type ExamStep = 'intro' | 'question' | 'scoring' | 'complete'

function buildExamQuestions(): OPICQuestion[] {
  const types = ['personal_background', 'survey_topic', 'roleplaying', 'unexpected'] as const
  return types.map((type) => {
    const pool = OPIC_QUESTIONS.filter((q) => q.type === type)
    if (!pool.length) throw new Error(`${type} 유형 문제가 없습니다.`)
    return pool[Math.floor(Math.random() * pool.length)]
  })
}

export default function MockExamPage() {
  const navigate = useNavigate()
  const goal = getUserGoal()
  const [step, setStep] = useState<ExamStep>('intro')
  const [selectedLevel, setSelectedLevel] = useState(goal?.targetLevel || 'IM2')
  const [examQuestions] = useState<OPICQuestion[]>(() => buildExamQuestions())
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [isSpeakingQ, setIsSpeakingQ] = useState(false)
  const [, setResults] = useState<ExamResult[]>([])
  const [error, setError] = useState('')
  const mountedRef = useRef(true)

  const timerRunning = step === 'question'
  const { elapsed, reset: resetTimer, format: formatTime } = useStopwatch(timerRunning)

  const { isRecording, toggle: toggleRecording, stop: stopRecording } = useSpeechRecognition({
    onTranscript: (text) => setAnswer((prev) => prev + text),
    onError: (msg) => setError(msg),
  })

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; stopSpeaking() }
  }, [])

  const currentQuestion = examQuestions[currentIdx]

  const handleSpeak = () => {
    if (isSpeakingQ) { stopSpeaking(); setIsSpeakingQ(false); return }
    setIsSpeakingQ(true)
    speakText(currentQuestion.question, () => { if (mountedRef.current) setIsSpeakingQ(false) })
  }

  const handleNext = async () => {
    stopRecording()
    stopSpeaking()
    setIsSpeakingQ(false)
    setStep('scoring')
    setError('')

    try {
      const scored: OPICScore = await scoreOPICAnswer(
        currentQuestion.question,
        answer,
        selectedLevel,
        QUESTION_TYPE_LABELS[currentQuestion.type]
      )
      if (!mountedRef.current) return

      const result: ExamResult = { question: currentQuestion, answer, score: scored, timeSpent: elapsed }

      setResults((prev) => {
        const newResults = [...prev, result]

        if (currentIdx < examQuestions.length - 1) {
          setCurrentIdx((i) => i + 1)
          setAnswer('')
          resetTimer()
          setStep('question')
        } else {
          navigate('/result', { state: { results: newResults, level: selectedLevel } })
        }

        return newResults
      })
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'API 오류가 발생했습니다.')
      setStep('question')
    }
  }

  // INTRO
  if (step === 'intro') return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">← 대시보드</Link>
        <div className="font-bold text-xl"><span className="text-purple-400">SPEAK</span>ZEN</div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-6xl mb-6">⏱️</div>
        <h1 className="text-4xl font-bold mb-4">실전 모의고사</h1>
        <p className="text-gray-400 mb-2">총 4문제 · 개인배경 → 서베이 → 롤플레이 → 돌발</p>
        <p className="text-gray-500 text-sm mb-10">각 문제 완료 후 AI가 채점합니다. 모든 문제 완료 후 종합 점수를 확인합니다.</p>

        <div className="mb-8">
          <label className="block text-sm text-gray-400 mb-3">목표 등급 선택</label>
          <div className="flex flex-wrap gap-2 justify-center">
            {OPIC_LEVELS.map((lv) => (
              <button key={lv.code} onClick={() => setSelectedLevel(lv.code)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedLevel === lv.code
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}>
                {lv.code}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-left">
          <div className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">문제 구성</div>
          {examQuestions.map((q, i) => (
            <div key={q.id} className="flex gap-3 py-2.5 border-b border-white/5 last:border-0">
              <span className="w-6 h-6 bg-purple-600/30 text-purple-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <div>
                <div className="text-xs text-purple-400 mb-0.5">{QUESTION_TYPE_LABELS[q.type]}</div>
                <div className="text-sm text-gray-300 line-clamp-2">{q.question}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setStep('question')}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-lg transition-all hover:scale-[1.01] shadow-lg shadow-purple-500/20">
          모의고사 시작 →
        </button>
      </main>
    </div>
  )

  // SCORING
  if (step === 'scoring') return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-2">AI 채점 중...</h2>
        <p className="text-gray-400 text-sm">GPT-4o가 답변을 분석하고 있습니다</p>
        <p className="text-gray-500 text-xs mt-2">{currentIdx + 1} / {examQuestions.length} 문제</p>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    </div>
  )

  // QUESTION
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          문제 <strong className="text-white">{currentIdx + 1}</strong> / {examQuestions.length}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full">
            목표: {selectedLevel}
          </span>
          <span className="text-sm font-mono bg-white/5 px-3 py-1 rounded-lg text-gray-400">{formatTime()}</span>
        </div>
      </header>

      <div className="h-1 bg-white/5">
        <div className="h-full bg-purple-500 transition-all duration-500"
          style={{ width: `${(currentIdx / examQuestions.length) * 100}%` }} />
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full">
            {QUESTION_TYPE_LABELS[currentQuestion.type]}
          </span>
          <span className="text-xs text-gray-500">{currentQuestion.topic}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Question {currentIdx + 1}
            </div>
            <button onClick={handleSpeak}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSpeakingQ ? 'bg-purple-600 text-white animate-pulse' : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}>
              {isSpeakingQ ? '🔊 재생 중...' : '🔊 음성 듣기'}
            </button>
          </div>
          <p className="text-white text-lg leading-relaxed">{currentQuestion.question}</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-400">답변</label>
            <span className="text-xs text-gray-600">{answer.split(/\s+/).filter(Boolean).length}단어</span>
          </div>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder="답변을 영어로 입력하거나 음성으로 말씀하세요..."
            rows={8}
            className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 resize-none focus:outline-none transition-colors text-sm leading-relaxed" />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={toggleRecording}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
              isRecording ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/15 border border-white/20'
            }`}>
            {isRecording ? '🔴 중지' : '🎤 음성'}
          </button>
          <button onClick={handleNext} disabled={!answer.trim()}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all">
            {currentIdx < examQuestions.length - 1 ? '다음 문제 →' : '채점 완료 →'}
          </button>
        </div>
      </main>
    </div>
  )
}
