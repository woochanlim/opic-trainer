import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveUserGoal, getUserGoal, getDDay } from '../hooks/useUserGoal'
import { OPIC_LEVELS } from '../lib/openai'

function getSafeUserName(existingName?: string): string {
  if (existingName) return existingName
  try {
    const raw = localStorage.getItem('opic_user')
    return raw ? (JSON.parse(raw)?.user_metadata?.name || '학습자') : '학습자'
  } catch { return '학습자' }
}

export default function GoalSetupPage() {
  const navigate = useNavigate()
  const existing = getUserGoal()
  const userName = getSafeUserName(existing?.userName)

  const [targetLevel, setTargetLevel] = useState(existing?.targetLevel || 'IM2')
  const [examDate, setExamDate] = useState(existing?.examDate || '')

  const dday = examDate ? getDDay(examDate) : null
  const ddayLabel = dday === null ? null : dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`
  const ddayColor = dday === null ? '' : dday <= 7 ? 'text-red-400' : dday <= 30 ? 'text-amber-400' : 'text-purple-400'

  const handleSave = () => {
    if (!examDate) return
    saveUserGoal({
      targetLevel,
      currentLevel: existing?.currentLevel || '',
      examDate,
      userName,
    })
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/dashboard')}
          className="text-gray-500 hover:text-white text-sm mb-8 transition-colors">
          ← 대시보드
        </button>

        <h1 className="text-3xl font-bold mb-2">목표 설정</h1>
        <p className="text-gray-400 text-sm mb-10">목표 등급과 시험 날짜를 설정하세요.</p>

        {/* 목표 등급 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
          <div className="text-sm text-gray-400 mb-4 font-medium">목표 등급</div>
          <div className="grid grid-cols-5 gap-2">
            {OPIC_LEVELS.map((lv) => (
              <button key={lv.code} onClick={() => setTargetLevel(lv.code)}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                  targetLevel === lv.code
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 scale-105'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}>
                {lv.code}
              </button>
            ))}
          </div>
          <div className="mt-4 text-center text-xs text-gray-500">
            {OPIC_LEVELS.find((l) => l.code === targetLevel)?.description}
          </div>
        </div>

        {/* 시험 날짜 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="text-sm text-gray-400 mb-4 font-medium">OPIC 시험 날짜</div>
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white focus:outline-none transition-colors text-sm" />
          {ddayLabel && (
            <div className="mt-4 text-center">
              <div className={`text-4xl font-bold mb-1 ${ddayColor}`}>{ddayLabel}</div>
              <div className="text-xs text-gray-600">
                {new Date(examDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          )}
        </div>

        {/* 레벨테스트 유도 */}
        {!existing?.currentLevel && (
          <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <div className="text-2xl">🎯</div>
            <div className="flex-1">
              <div className="text-sm font-semibold mb-0.5">현재 수준을 모르시나요?</div>
              <div className="text-xs text-gray-400">5분 레벨 테스트로 맞춤 목표 등급을 추천받으세요.</div>
            </div>
            <button onClick={() => navigate('/level-test')}
              className="text-xs bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded-lg font-medium transition-colors shrink-0">
              테스트 →
            </button>
          </div>
        )}

        <button onClick={handleSave} disabled={!examDate}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-all hover:scale-[1.01]">
          저장하기
        </button>
        {!examDate && <p className="text-xs text-gray-600 text-center mt-2">시험 날짜를 선택해주세요</p>}
      </div>
    </div>
  )
}
