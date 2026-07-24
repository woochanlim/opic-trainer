import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserGoal, getDDay } from '../hooks/useUserGoal'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [goal, setGoal] = useState(getUserGoal())
  const name = goal?.userName || user?.user_metadata?.name || user?.email?.split('@')[0] || '학습자'

  // 페이지 포커스될 때마다 목표 새로고침
  useEffect(() => {
    const refresh = () => setGoal(getUserGoal())
    window.addEventListener('focus', refresh)
    refresh()
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const dday = goal?.examDate ? getDDay(goal.examDate) : null

  const ddayColor = dday === null ? '' : dday <= 7 ? 'text-red-400' : dday <= 30 ? 'text-amber-400' : 'text-purple-400'
  const ddayLabel = dday === null ? null : dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-xl">
          <span className="text-purple-400">SPEAK</span>ZEN
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{name}</span>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-white transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Welcome + D-DAY 카드 */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* 인사 */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">안녕하세요, {name}님 👋</h1>
            <p className="text-gray-400 text-sm">오늘도 목표 등급을 향해 연습해 보세요.</p>
          </div>

          {/* D-DAY 카드 */}
          {goal ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-6 min-w-[280px]">
              {/* D-DAY */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">시험까지</div>
                <div className={`text-4xl font-bold ${ddayColor}`}>{ddayLabel ?? '-'}</div>
                {goal.examDate && (
                  <div className="text-xs text-gray-600 mt-1">
                    {new Date(goal.examDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </div>
                )}
              </div>
              <div className="w-px h-12 bg-white/10" />
              {/* 등급 */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">목표 등급</div>
                <div className="text-4xl font-bold text-purple-400">{goal.targetLevel}</div>
                {goal.currentLevel && (
                  <div className="text-xs text-gray-600 mt-1">현재 {goal.currentLevel}</div>
                )}
              </div>
              {/* 수정 버튼 */}
              <Link to="/goal-setup" className="ml-auto text-gray-600 hover:text-white transition-colors text-xs border border-white/10 px-2 py-1 rounded-lg">
                수정
              </Link>
            </div>
          ) : (
            <Link
              to="/goal-setup"
              className="bg-purple-900/30 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl px-6 py-4 flex items-center gap-3 min-w-[260px] transition-all group"
            >
              <div className="text-3xl">🎯</div>
              <div>
                <div className="font-semibold mb-0.5">목표 설정하기</div>
                <div className="text-xs text-gray-400">시험 날짜와 목표 등급을 입력하세요</div>
              </div>
              <span className="ml-auto text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          )}
        </div>

        {/* 레벨 테스트 배너 (현재 등급 없을 때) */}
        {!goal?.currentLevel && (
          <Link
            to="/level-test"
            className="flex items-center gap-4 bg-gradient-to-r from-purple-900/40 to-pink-900/20 border border-purple-500/20 hover:border-purple-500/50 rounded-2xl p-5 mb-6 transition-all group"
          >
            <div className="text-3xl">🎯</div>
            <div className="flex-1">
              <div className="font-semibold mb-0.5">5분 레벨 테스트</div>
              <div className="text-sm text-gray-400">현재 OPIC 수준을 파악하고 맞춤 목표 등급을 추천받으세요</div>
            </div>
            <span className="text-purple-400 text-sm font-semibold group-hover:gap-3 transition-all">시작 →</span>
          </Link>
        )}

        {/* 메인 액션 */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link
            to="/practice"
            className="group bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-8 transition-all hover:scale-[1.02]"
          >
            <div className="text-4xl mb-4">🎤</div>
            <h2 className="text-2xl font-bold mb-2">유형별 연습</h2>
            <p className="text-gray-400 text-sm mb-6">
              개인 배경, 서베이 주제, 롤플레이, 돌발 질문<br />
              문제 음성 듣기 + AI 채점
            </p>
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm group-hover:gap-3 transition-all">
              연습 시작 <span>→</span>
            </div>
          </Link>

          <Link
            to="/mock-exam"
            className="group bg-gradient-to-br from-pink-600/20 to-purple-900/20 border border-pink-500/30 hover:border-pink-500/60 rounded-2xl p-8 transition-all hover:scale-[1.02]"
          >
            <div className="text-4xl mb-4">⏱️</div>
            <h2 className="text-2xl font-bold mb-2">실전 모의고사</h2>
            <p className="text-gray-400 text-sm mb-6">
              실제 OPIC과 유사한 방식으로<br />
              4개 문제 연속 + 종합 채점
            </p>
            <div className="flex items-center gap-2 text-pink-400 font-semibold text-sm group-hover:gap-3 transition-all">
              모의고사 시작 <span>→</span>
            </div>
          </Link>
        </div>

        {/* OPIC 등급 가이드 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4 text-gray-300">OPIC 등급 가이드</h3>
          <div className="grid grid-cols-7 gap-2">
            {[
              { level: 'NH', color: 'bg-gray-700' },
              { level: 'IL', color: 'bg-gray-600' },
              { level: 'IM1', color: 'bg-indigo-700' },
              { level: 'IM2', color: 'bg-purple-700' },
              { level: 'IM3', color: 'bg-purple-600' },
              { level: 'IH', color: 'bg-violet-500' },
              { level: 'AL', color: 'bg-amber-500' },
            ].map((g) => (
              <div key={g.level} className="text-center">
                <div className={`${g.color} rounded-lg py-2 text-xs font-bold mb-1 ${goal?.targetLevel === g.level ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0a0a0f]' : ''}`}>
                  {g.level}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">흰 테두리 = 목표 등급</p>
        </div>

        {/* 학습 팁 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-gray-300">학습 팁</h3>
          <ul className="space-y-2.5 text-sm text-gray-400">
            {[
              '문제 음성 듣기 버튼으로 실제 시험처럼 영어 발음을 들으며 연습하세요.',
              '음성 인식을 사용하면 실제 시험에 더 가까운 연습이 됩니다.',
              '모범 답안을 그대로 외우기보다는 나만의 표현으로 바꿔보세요.',
              '롤플레이 문제는 상황을 구체적으로 묘사할수록 높은 점수가 납니다.',
            ].map((tip, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-purple-500 shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
