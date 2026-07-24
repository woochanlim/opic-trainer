import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  OPIC_QUESTIONS,
  OPIC_LEVELS,
  QUESTION_TYPE_LABELS,
  scoreOPICAnswer,
  type OPICQuestion,
  type OPICScore,
} from '../lib/openai'

type Step = 'select' | 'question' | 'result'

export default function PracticePage() {
  const [step, setStep] = useState<Step>('select')
  const [selectedLevel, setSelectedLevel] = useState('IM2')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [currentQuestion, setCurrentQuestion] = useState<OPICQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [score, setScore] = useState<OPICScore | null>(null)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [error, setError] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

  const filteredQuestions = OPIC_QUESTIONS.filter((q) =>
    selectedType === 'all' || q.type === selectedType
  )

  const startQuestion = (q: OPICQuestion) => {
    setCurrentQuestion(q)
    setAnswer('')
    setScore(null)
    setTimer(0)
    setTimerRunning(true)
    setStep('question')
    setError('')
  }

  const startRandomQuestion = () => {
    if (filteredQuestions.length === 0) return
    const random = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)]
    startQuestion(random)
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해 주세요.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      setAnswer((prev) => {
        const base = prev.trimEnd()
        if (finalTranscript) return (base ? base + ' ' : '') + finalTranscript
        return base + (interimTranscript ? ' ' + interimTranscript : '')
      })
    }

    recognition.onerror = () => {
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const handleSubmit = async () => {
    if (!currentQuestion) return
    setTimerRunning(false)
    if (isRecording) stopRecording()
    setIsScoring(true)
    setError('')

    try {
      const result = await scoreOPICAnswer(
        currentQuestion.question,
        answer,
        selectedLevel,
        QUESTION_TYPE_LABELS[currentQuestion.type]
      )
      setScore(result)
      setStep('result')
    } catch (err) {
      setError(
        err instanceof Error
          ? `채점 오류: ${err.message}`
          : 'OpenAI API 오류가 발생했습니다. API 키를 확인해 주세요.'
      )
    } finally {
      setIsScoring(false)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const gradeColor = (grade: string) => {
    if (grade === 'AL') return 'text-amber-400'
    if (grade === 'IH') return 'text-violet-400'
    if (grade === 'IM3') return 'text-purple-400'
    if (grade === 'IM2') return 'text-indigo-400'
    if (grade === 'IM1') return 'text-blue-400'
    return 'text-gray-400'
  }

  // SELECT STEP
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← 대시보드
          </Link>
          <div className="font-bold text-xl">
            <span className="text-purple-400">SPEAK</span>ZEN
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-2">유형별 연습</h1>
          <p className="text-gray-400 mb-10">목표 등급과 문제 유형을 선택하세요.</p>

          {/* Level Select */}
          <div className="mb-8">
            <label className="block text-sm text-gray-400 mb-3">목표 등급</label>
            <div className="flex flex-wrap gap-2">
              {OPIC_LEVELS.map((lv) => (
                <button
                  key={lv.code}
                  onClick={() => setSelectedLevel(lv.code)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedLevel === lv.code
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {lv.code}
                  <span className="ml-1.5 text-xs opacity-60">{lv.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type Select */}
          <div className="mb-8">
            <label className="block text-sm text-gray-400 mb-3">문제 유형</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: '전체' },
                { value: 'personal_background', label: '개인 배경' },
                { value: 'survey_topic', label: '서베이 주제' },
                { value: 'roleplaying', label: '롤플레이' },
                { value: 'unexpected', label: '돌발 질문' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedType(t.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedType === t.value
                      ? 'bg-purple-600/80 text-white border border-purple-500'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Random Start */}
          <button
            onClick={startRandomQuestion}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-lg mb-8 transition-all hover:scale-[1.01] shadow-lg shadow-purple-500/20"
          >
            랜덤 문제로 시작 →
          </button>

          {/* Question List */}
          <div>
            <h3 className="text-sm text-gray-400 mb-4">또는 문제를 직접 선택하세요 ({filteredQuestions.length}개)</h3>
            <div className="space-y-3">
              {filteredQuestions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => startQuestion(q)}
                  className="w-full text-left bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                          {QUESTION_TYPE_LABELS[q.type]}
                        </span>
                        <span className="text-xs text-gray-500">{q.topic}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">{q.question}</p>
                    </div>
                    <span className="text-gray-600 group-hover:text-purple-400 transition-colors shrink-0 mt-1">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // QUESTION STEP
  if (step === 'question' && currentQuestion) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => { setStep('select'); setTimerRunning(false) }}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← 뒤로
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full">
              목표: {selectedLevel}
            </span>
            <span className="text-sm font-mono text-gray-400 bg-white/5 px-3 py-1 rounded-lg">
              {formatTime(timer)}
            </span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10">
          {/* Question Type Badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full">
              {QUESTION_TYPE_LABELS[currentQuestion.type]}
            </span>
            <span className="text-xs text-gray-500">{currentQuestion.topic}</span>
          </div>

          {/* Question */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Question</div>
            <p className="text-white text-lg leading-relaxed">{currentQuestion.question}</p>
            {currentQuestion.followUp && (
              <p className="text-gray-400 text-sm mt-3 pt-3 border-t border-white/10 leading-relaxed">
                Follow-up: {currentQuestion.followUp}
              </p>
            )}
          </div>

          {/* Answer Area */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">답변 (영어로 입력 또는 음성 인식)</label>
              <span className="text-xs text-gray-600">{answer.split(/\s+/).filter(Boolean).length}단어</span>
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="답변을 영어로 입력하세요... 또는 아래 마이크 버튼으로 말씀하세요."
              rows={8}
              className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 resize-none focus:outline-none transition-colors text-sm leading-relaxed"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 animate-pulse'
                  : 'bg-white/10 hover:bg-white/15 border border-white/20'
              }`}
            >
              {isRecording ? '🔴 중지' : '🎤 음성 인식'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={isScoring || !answer.trim()}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
            >
              {isScoring ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI 채점 중...
                </span>
              ) : '채점하기 →'}
            </button>
          </div>

          <p className="text-xs text-gray-600 mt-3 text-center">
            OPIC 실제 시험에서는 준비 시간 30초, 답변 시간 60~90초입니다
          </p>
        </main>
      </div>
    )
  }

  // RESULT STEP
  if (step === 'result' && score && currentQuestion) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← 대시보드
          </Link>
          <div className="font-bold">채점 결과</div>
          <button
            onClick={startRandomQuestion}
            className="text-sm bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            다음 문제
          </button>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10">
          {/* Score Header */}
          <div className="text-center mb-10">
            <div className={`text-7xl font-bold mb-2 ${gradeColor(score.grade)}`}>
              {score.grade}
            </div>
            <div className="text-2xl font-semibold text-gray-300 mb-1">{score.total}점</div>
            <div className="text-sm text-gray-500">소요 시간: {formatTime(timer)}</div>
          </div>

          {/* Score Breakdown */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-5 text-gray-300">세부 점수</h3>
            <div className="space-y-4">
              {[
                { label: '유창성 (Fluency)', value: score.fluency },
                { label: '어휘 (Vocabulary)', value: score.vocabulary },
                { label: '문법 (Grammar)', value: score.grammar },
                { label: '내용 (Content)', value: score.content },
                { label: '논리 (Coherence)', value: score.coherence },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-700"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Feedback */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-3 text-gray-300">AI 피드백</h3>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{score.feedback}</p>
          </div>

          {/* Model Answer */}
          <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-3 text-purple-300">모범 답안 ({selectedLevel} 수준)</h3>
            <p className="text-sm text-gray-200 leading-relaxed">{score.modelAnswer}</p>
          </div>

          {/* Improved Version */}
          {score.improvedVersion && (
            <div className="bg-green-900/20 border border-green-500/20 rounded-2xl p-6 mb-6">
              <h3 className="font-semibold mb-3 text-green-300">내 답변 개선 버전</h3>
              <p className="text-sm text-gray-200 leading-relaxed">{score.improvedVersion}</p>
            </div>
          )}

          {/* My Answer */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold mb-3 text-gray-300">내 답변</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('question')}
              className="flex-1 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl font-medium transition-colors"
            >
              다시 풀기
            </button>
            <button
              onClick={startRandomQuestion}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors"
            >
              다음 문제 →
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any
  }
}
