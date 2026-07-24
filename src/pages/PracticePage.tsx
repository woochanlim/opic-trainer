import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  OPIC_QUESTIONS, OPIC_LEVELS, QUESTION_TYPE_LABELS,
  scoreOPICAnswer, gradeToColor,
  type OPICQuestion, type OPICScore,
} from '../lib/openai'
import { speakText, stopSpeaking } from '../lib/tts'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useStopwatch } from '../hooks/useStopwatch'
import { getUserGoal } from '../hooks/useUserGoal'

type Step = 'select' | 'question' | 'result'

export default function PracticePage() {
  const goal = getUserGoal()
  const [step, setStep] = useState<Step>('select')
  const [selectedLevel, setSelectedLevel] = useState(goal?.targetLevel || 'IM2')
  const [selectedType, setSelectedType] = useState('all')
  const [currentQuestion, setCurrentQuestion] = useState<OPICQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [isSpeakingQ, setIsSpeakingQ] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [score, setScore] = useState<OPICScore | null>(null)
  const [error, setError] = useState('')
  const [timerRunning, setTimerRunning] = useState(false)
  const mountedRef = useRef(true)

  const { reset: resetTimer, format: formatTime } = useStopwatch(timerRunning)

  const { isRecording, toggle: toggleRecording, stop: stopRecording } = useSpeechRecognition({
    onTranscript: (text) => setAnswer((prev) => prev + text),
    onError: (msg) => setError(msg),
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopSpeaking()
    }
  }, [])

  const filteredQuestions = useMemo(
    () => OPIC_QUESTIONS.filter((q) => selectedType === 'all' || q.type === selectedType),
    [selectedType]
  )

  const startQuestion = (q: OPICQuestion) => {
    stopSpeaking()
    setIsSpeakingQ(false)
    setCurrentQuestion(q)
    setAnswer('')
    setScore(null)
    setError('')
    resetTimer()
    setTimerRunning(true)
    setStep('question')
  }

  const startRandom = () => {
    if (!filteredQuestions.length) return
    startQuestion(filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)])
  }

  const handleSpeak = () => {
    if (!currentQuestion) return
    if (isSpeakingQ) { stopSpeaking(); setIsSpeakingQ(false); return }
    setIsSpeakingQ(true)
    const text = currentQuestion.question + (currentQuestion.followUp ? ' ' + currentQuestion.followUp : '')
    speakText(text, () => { if (mountedRef.current) setIsSpeakingQ(false) })
  }

  const handleSubmit = async () => {
    if (!currentQuestion || isScoring) return
    setTimerRunning(false)
    stopRecording()
    stopSpeaking()
    setIsSpeakingQ(false)
    setIsScoring(true)
    setError('')
    try {
      const result = await scoreOPICAnswer(
        currentQuestion.question,
        answer,
        selectedLevel,
        QUESTION_TYPE_LABELS[currentQuestion.type]
      )
      if (!mountedRef.current) return
      setScore(result)
      setStep('result')
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : '채점 중 오류가 발생했습니다.')
    } finally {
      if (mountedRef.current) setIsScoring(false)
    }
  }

  const handleRetry = () => {
    resetTimer()
    setTimerRunning(true)
    setStep('question')
  }

  // ── SELECT ──────────────────────────────────────────────────
  if (step === 'select') return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">← 대시보드</Link>
        <div className="font-bold text-xl"><span className="text-purple-400">SPEAK</span>ZEN</div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">유형별 연습</h1>
        <p className="text-gray-400 mb-10">목표 등급과 문제 유형을 선택하세요.</p>

        <div className="mb-8">
          <label className="block text-sm text-gray-400 mb-3">목표 등급</label>
          <div className="flex flex-wrap gap-2">
            {OPIC_LEVELS.map((lv) => (
              <button key={lv.code} onClick={() => setSelectedLevel(lv.code)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedLevel === lv.code
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}>
                {lv.code} <span className="ml-1 text-xs opacity-60">{lv.description}</span>
              </button>
            ))}
          </div>
        </div>

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
              <button key={t.value} onClick={() => setSelectedType(t.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedType === t.value
                    ? 'bg-purple-600/80 text-white border border-purple-500'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startRandom}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-lg mb-8 transition-all hover:scale-[1.01] shadow-lg shadow-purple-500/20">
          랜덤 문제로 시작 →
        </button>

        <div>
          <h3 className="text-sm text-gray-400 mb-4">문제 직접 선택 ({filteredQuestions.length}개)</h3>
          <div className="space-y-3">
            {filteredQuestions.map((q) => (
              <button key={q.id} onClick={() => startQuestion(q)}
                className="w-full text-left bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all group">
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

  // ── QUESTION ─────────────────────────────────────────────────
  if (step === 'question' && currentQuestion) return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <button onClick={() => { setStep('select'); setTimerRunning(false); stopSpeaking(); setIsSpeakingQ(false) }}
          className="text-gray-400 hover:text-white text-sm transition-colors">← 뒤로</button>
        <div className="flex items-center gap-3">
          <span className="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full">
            목표: {selectedLevel}
          </span>
          <span className="text-sm font-mono text-gray-400 bg-white/5 px-3 py-1 rounded-lg">{formatTime()}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full">
            {QUESTION_TYPE_LABELS[currentQuestion.type]}
          </span>
          <span className="text-xs text-gray-500">{currentQuestion.topic}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Question</div>
            <button onClick={handleSpeak}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSpeakingQ ? 'bg-purple-600 text-white animate-pulse' : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}>
              {isSpeakingQ ? '🔊 재생 중...' : '🔊 음성 듣기'}
            </button>
          </div>
          <p className="text-white text-lg leading-relaxed">{currentQuestion.question}</p>
          {currentQuestion.followUp && (
            <p className="text-gray-400 text-sm mt-3 pt-3 border-t border-white/10 leading-relaxed">
              Follow-up: {currentQuestion.followUp}
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-400">답변 (영어)</label>
            <span className="text-xs text-gray-600">{answer.split(/\s+/).filter(Boolean).length}단어</span>
          </div>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder="답변을 영어로 입력하거나 마이크 버튼으로 말씀하세요..."
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
            {isRecording ? '🔴 중지' : '🎤 음성 인식'}
          </button>
          <button onClick={handleSubmit} disabled={isScoring || !answer.trim()}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all">
            {isScoring ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI 채점 중...
              </span>
            ) : '채점하기 →'}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-3 text-center">🔊 음성 듣기로 실제 시험처럼 문제를 들어보세요</p>
      </main>
    </div>
  )

  // ── RESULT ───────────────────────────────────────────────────
  if (step === 'result' && score && currentQuestion) return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">← 대시보드</Link>
        <div className="font-bold">채점 결과</div>
        <button onClick={startRandom}
          className="text-sm bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-colors">
          다음 문제
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className={`text-7xl font-bold mb-2 ${gradeToColor(score.grade)}`}>{score.grade}</div>
          <div className="text-2xl font-semibold text-gray-300 mb-1">{score.total}점</div>
          <div className="text-sm text-gray-500">소요 시간: {formatTime()}</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-5 text-gray-300">세부 점수</h3>
          <div className="space-y-4">
            {([
              ['유창성 (Fluency)', score.fluency],
              ['어휘 (Vocabulary)', score.vocabulary],
              ['문법 (Grammar)', score.grammar],
              ['내용 (Content)', score.content],
              ['논리 (Coherence)', score.coherence],
            ] as [string, number][]).map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-3 text-gray-300">AI 피드백</h3>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{score.feedback}</p>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-3 text-purple-300">모범 답안 ({selectedLevel} 수준)</h3>
          <p className="text-sm text-gray-200 leading-relaxed">{score.modelAnswer}</p>
        </div>

        {score.improvedVersion && (
          <div className="bg-green-900/20 border border-green-500/20 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-3 text-green-300">내 답변 개선 버전</h3>
            <p className="text-sm text-gray-200 leading-relaxed">{score.improvedVersion}</p>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="font-semibold mb-3 text-gray-300">내 답변</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleRetry}
            className="flex-1 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl font-medium transition-colors">
            다시 풀기
          </button>
          <button onClick={startRandom}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors">
            다음 문제 →
          </button>
        </div>
      </main>
    </div>
  )

  return null
}
