import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { scoreOPICAnswer, QUESTION_TYPE_LABELS } from '../lib/openai'
import { speakText, stopSpeaking } from '../lib/tts'
import { saveUserGoal, getUserGoal } from '../hooks/useUserGoal'

// 레벨테스트용 3문제 (유형 다양하게)
const LEVEL_TEST_QUESTIONS = [
  {
    id: 'lt1',
    type: 'personal_background',
    topic: '자기소개',
    question: 'Tell me about yourself. Where do you live, who do you live with, and what do you do?',
  },
  {
    id: 'lt2',
    type: 'survey_topic',
    topic: '여가 활동',
    question: 'Tell me about your favorite thing to do in your free time. How often do you do it and why do you enjoy it?',
  },
  {
    id: 'lt3',
    type: 'unexpected',
    topic: '비교/의견',
    question: 'How has the way people spend their free time changed compared to the past? What do you think caused these changes?',
  },
]

type Step = 'intro' | 'question' | 'scoring' | 'result'

interface AnswerResult {
  question: string
  answer: string
  score: number
  grade: string
}

// 평균 점수로 현재 등급 판정
function calcGrade(avg: number): string {
  if (avg >= 90) return 'AL'
  if (avg >= 78) return 'IH'
  if (avg >= 66) return 'IM3'
  if (avg >= 54) return 'IM2'
  if (avg >= 42) return 'IM1'
  if (avg >= 30) return 'IL'
  return 'NH'
}

// 현재 등급에서 한 단계 위 추천
function recommendTarget(current: string): string {
  const ladder = ['NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL']
  const idx = ladder.indexOf(current)
  if (idx === -1 || idx >= ladder.length - 1) return current
  return ladder[idx + 1]
}

export default function LevelTestPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeakingQ, setIsSpeakingQ] = useState(false)
  const [timer, setTimer] = useState(0)
  const [results, setResults] = useState<AnswerResult[]>([])
  const [currentGrade, setCurrentGrade] = useState('')
  const [targetGrade, setTargetGrade] = useState('')
  const [examDate, setExamDate] = useState('')
  const [error, setError] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const existingGoal = getUserGoal()

  useEffect(() => {
    if (step === 'question') {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step, currentIdx])

  useEffect(() => {
    return () => { stopSpeaking() }
  }, [])

  const currentQ = LEVEL_TEST_QUESTIONS[currentIdx]
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleSpeak = () => {
    if (isSpeakingQ) {
      stopSpeaking()
      setIsSpeakingQ(false)
      return
    }
    setIsSpeakingQ(true)
    speakText(currentQ.question, () => setIsSpeakingQ(false))
  }

  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setIsRecording(false)
  }

  const toggleRecording = () => {
    if (isRecording) { stopRecording(); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Chrome 브라우저에서만 음성 인식이 지원됩니다.'); return }
    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' '
      }
      if (final) setAnswer((prev) => prev + final)
    }
    recognition.onend = () => setIsRecording(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const handleNext = async () => {
    if (isRecording) stopRecording()
    stopSpeaking()
    setIsSpeakingQ(false)
    setStep('scoring')
    setError('')

    try {
      const scored = await scoreOPICAnswer(
        currentQ.question,
        answer,
        'IM2',
        QUESTION_TYPE_LABELS[currentQ.type]
      )
      const newResults = [...results, {
        question: currentQ.question,
        answer,
        score: scored.total,
        grade: scored.grade,
      }]
      setResults(newResults)

      if (currentIdx < LEVEL_TEST_QUESTIONS.length - 1) {
        setCurrentIdx((i) => i + 1)
        setAnswer('')
        setTimer(0)
        setStep('question')
      } else {
        // 최종 결과 계산
        const avg = Math.round(newResults.reduce((s, r) => s + r.score, 0) / newResults.length)
        const current = calcGrade(avg)
        const recommended = recommendTarget(current)
        setCurrentGrade(current)
        setTargetGrade(recommended)
        // 기존 목표 날짜 유지
        if (existingGoal?.examDate) setExamDate(existingGoal.examDate)
        setStep('result')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 오류가 발생했습니다.')
      setStep('question')
    }
  }

  const handleSaveGoal = () => {
    const userName = existingGoal?.userName ||
      (JSON.parse(localStorage.getItem('opic_user') || '{}'))?.user_metadata?.name || '학습자'
    saveUserGoal({
      targetLevel: targetGrade,
      currentLevel: currentGrade,
      examDate,
      userName,
    })
    navigate('/dashboard')
  }

  // INTRO
  if (step === 'intro') return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">🎯</div>
        <h1 className="text-4xl font-bold mb-3">5분 레벨 테스트</h1>
        <p className="text-gray-400 mb-2">3문제로 현재 OPIC 수준을 파악하고</p>
        <p className="text-gray-400 mb-10">맞춤 목표 등급을 추천해드립니다.</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-3">
          {LEVEL_TEST_QUESTIONS.map((q, i) => (
            <div key={q.id} className="flex gap-3 items-start">
              <span className="w-6 h-6 bg-purple-600/40 text-purple-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
              <div>
                <div className="text-xs text-purple-400 mb-0.5">{QUESTION_TYPE_LABELS[q.type]} · {q.topic}</div>
                <div className="text-sm text-gray-300 leading-relaxed">{q.question}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="flex-1 py-3 border border-white/20 hover:border-white/40 rounded-xl font-medium transition-colors">
            취소
          </button>
          <button
            onClick={() => { setTimer(0); setStep('question') }}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all hover:scale-[1.01]"
          >
            테스트 시작 →
          </button>
        </div>
      </div>
    </div>
  )

  // SCORING
  if (step === 'scoring') return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-2">AI 채점 중...</h2>
        <p className="text-gray-500 text-sm">{currentIdx + 1} / {LEVEL_TEST_QUESTIONS.length} 문제 분석 중</p>
      </div>
    </div>
  )

  // RESULT
  if (step === 'result') return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">📊</div>
          <h1 className="text-3xl font-bold mb-2">레벨 테스트 결과</h1>
          <p className="text-gray-400 text-sm">3문제 평균으로 현재 수준을 분석했습니다</p>
        </div>

        {/* 현재/목표 등급 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">현재 수준</div>
            <div className="text-5xl font-bold text-indigo-400">{currentGrade}</div>
          </div>
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-6 text-center">
            <div className="text-xs text-purple-400 mb-2 font-semibold uppercase tracking-wider">추천 목표</div>
            <div className="text-5xl font-bold text-purple-300">{targetGrade}</div>
          </div>
        </div>

        {/* 목표 등급 직접 수정 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="text-sm text-gray-400 mb-3">목표 등급 조정 (직접 선택 가능)</div>
          <div className="flex flex-wrap gap-2">
            {['IM1', 'IM2', 'IM3', 'IH', 'AL'].map((lv) => (
              <button
                key={lv}
                onClick={() => setTargetGrade(lv)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  targetGrade === lv
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>

        {/* 시험 날짜 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="text-sm text-gray-400 mb-3">OPIC 시험 날짜</div>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white focus:outline-none transition-colors"
          />
          {examDate && (() => {
            const today = new Date(); today.setHours(0,0,0,0)
            const exam = new Date(examDate); exam.setHours(0,0,0,0)
            const dday = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
            return (
              <div className="mt-3 text-center">
                <span className={`text-2xl font-bold ${dday <= 7 ? 'text-red-400' : dday <= 30 ? 'text-amber-400' : 'text-purple-400'}`}>
                  {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`}
                </span>
              </div>
            )
          })()}
        </div>

        <button
          onClick={handleSaveGoal}
          disabled={!examDate}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-all hover:scale-[1.01]"
        >
          목표 저장하고 시작하기 →
        </button>
        {!examDate && <p className="text-xs text-gray-600 text-center mt-2">시험 날짜를 입력해주세요</p>}
      </div>
    </div>
  )

  // QUESTION
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          문제 <strong className="text-white">{currentIdx + 1}</strong> / {LEVEL_TEST_QUESTIONS.length}
        </div>
        <span className="text-sm font-mono bg-white/5 px-3 py-1 rounded-lg text-gray-400">
          {formatTime(timer)}
        </span>
      </header>

      {/* 진행 바 */}
      <div className="h-1 bg-white/5">
        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${(currentIdx / LEVEL_TEST_QUESTIONS.length) * 100}%` }} />
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full">
            {QUESTION_TYPE_LABELS[currentQ.type]}
          </span>
          <span className="text-xs text-gray-500">{currentQ.topic}</span>
        </div>

        {/* 질문 + 음성 버튼 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Question {currentIdx + 1}</div>
            <button
              onClick={handleSpeak}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSpeakingQ
                  ? 'bg-purple-600 text-white animate-pulse'
                  : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}
            >
              {isSpeakingQ ? '🔊 재생 중...' : '🔊 음성 듣기'}
            </button>
          </div>
          <p className="text-white text-lg leading-relaxed">{currentQ.question}</p>
        </div>

        {/* 답변 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-400">답변 (영어)</label>
            <span className="text-xs text-gray-600">{answer.split(/\s+/).filter(Boolean).length}단어</span>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="답변을 영어로 입력하거나 음성으로 말씀하세요..."
            rows={7}
            className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 resize-none focus:outline-none transition-colors text-sm leading-relaxed"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
              isRecording ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/15 border border-white/20'
            }`}
          >
            {isRecording ? '🔴 중지' : '🎤 음성 인식'}
          </button>
          <button
            onClick={handleNext}
            disabled={!answer.trim()}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
          >
            {currentIdx < LEVEL_TEST_QUESTIONS.length - 1 ? '다음 문제 →' : '결과 보기 →'}
          </button>
        </div>
      </main>
    </div>
  )
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any
  }
}
