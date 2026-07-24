import { Link, useLocation, useNavigate } from 'react-router-dom'
import { QUESTION_TYPE_LABELS, gradeToColor, scoreToGrade } from '../lib/openai'
import type { ExamResult } from '../types'

interface LocationState { results: ExamResult[]; level: string }

export default function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null

  if (!state?.results?.length) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
      <div className="text-center">
        <p className="text-gray-400 mb-4">결과 데이터가 없습니다.</p>
        <Link to="/dashboard" className="text-purple-400 hover:text-purple-300">대시보드로 →</Link>
      </div>
    </div>
  )

  const { results, level } = state
  const avgTotal = Math.round(results.reduce((s, r) => s + r.score.total, 0) / results.length)
  const avgFluency = Math.round(results.reduce((s, r) => s + r.score.fluency, 0) / results.length)
  const avgVocab = Math.round(results.reduce((s, r) => s + r.score.vocabulary, 0) / results.length)
  const avgGrammar = Math.round(results.reduce((s, r) => s + r.score.grammar, 0) / results.length)
  const avgContent = Math.round(results.reduce((s, r) => s + r.score.content, 0) / results.length)
  const avgCoherence = Math.round(results.reduce((s, r) => s + r.score.coherence, 0) / results.length)

  // GPT 채점 등급을 기반으로 종합 등급 결정 (일관성 유지)
  const overallGrade = scoreToGrade(avgTotal)
  const totalTime = results.reduce((s, r) => s + r.timeSpent, 0)
  const formatTime = (s: number) => `${Math.floor(s / 60)}분 ${s % 60}초`

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">← 대시보드</Link>
        <div className="font-bold">모의고사 결과</div>
        <button onClick={() => navigate('/mock-exam')}
          className="text-sm bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-colors">
          다시 도전
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* 종합 점수 */}
        <div className="text-center mb-10">
          <div className={`text-8xl font-bold mb-3 ${gradeToColor(overallGrade)}`}>{overallGrade}</div>
          <div className="text-4xl font-semibold text-gray-200 mb-2">{avgTotal}점</div>
          <div className="text-sm text-gray-500">
            목표 등급: {level} · 총 소요 시간: {formatTime(totalTime)} · {results.length}문제
          </div>
        </div>

        {/* 평균 세부 점수 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-5 text-gray-300">평균 세부 점수</h3>
          <div className="space-y-4">
            {([
              ['유창성 (Fluency)', avgFluency],
              ['어휘 (Vocabulary)', avgVocab],
              ['문법 (Grammar)', avgGrammar],
              ['내용 (Content)', avgContent],
              ['논리 (Coherence)', avgCoherence],
            ] as [string, number][]).map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 문제별 결과 */}
        <div className="space-y-4 mb-8">
          <h3 className="font-semibold text-gray-300">문제별 결과</h3>
          {results.map((result, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 bg-purple-600/30 text-purple-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-purple-400">{QUESTION_TYPE_LABELS[result.question.type]}</span>
                    <span className="text-xs text-gray-500">{result.question.topic}</span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">{result.question.question}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold ${gradeToColor(result.score.grade)}`}>{result.score.grade}</div>
                  <div className="text-sm text-gray-500">{result.score.total}점</div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {([
                  ['유창', result.score.fluency],
                  ['어휘', result.score.vocabulary],
                  ['문법', result.score.grammar],
                  ['내용', result.score.content],
                  ['논리', result.score.coherence],
                ] as [string, number][]).map(([label, v]) => (
                  <div key={label} className="text-center bg-white/5 rounded-lg py-2">
                    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                    <div className="text-sm font-semibold">{v}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{result.score.feedback}</p>
            </div>
          ))}
        </div>

        {/* 다음 단계 */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-3 text-purple-300">다음 단계 추천</h3>
          <ul className="text-sm text-gray-300 space-y-2 leading-relaxed">
            {avgTotal < 50 && <li>• 개인 배경 문제부터 집중 연습하세요. 자기소개와 거주지 설명을 먼저 완성하세요.</li>}
            {avgTotal >= 50 && avgTotal < 70 && <li>• IM 등급 진입을 위해 "이유 + 예시" 구조를 연습하세요.</li>}
            {avgTotal >= 70 && <li>• IH/AL 등급을 위해 비교·대조, 의견 제시형 답변 구조를 훈련하세요.</li>}
            <li>• 가장 점수가 낮은 유형을 집중적으로 연습하세요.</li>
            <li>• 모범 답안을 소리 내어 읽으며 자연스러운 발화 패턴을 익히세요.</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Link to="/practice"
            className="flex-1 py-3 text-center border border-white/20 hover:border-white/40 rounded-xl font-medium transition-colors">
            유형별 연습 →
          </Link>
          <button onClick={() => navigate('/mock-exam')}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors">
            모의고사 다시 →
          </button>
        </div>
      </main>
    </div>
  )
}
