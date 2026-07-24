import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || '학습자'

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-xl">
          <span className="text-purple-400">SPEAK</span>ZEN
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{name}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">안녕하세요, {name}님 👋</h1>
          <p className="text-gray-400">오늘도 OPIC 목표 등급을 향해 연습해 보세요.</p>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link
            to="/practice"
            className="group bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-8 transition-all hover:scale-[1.02]"
          >
            <div className="text-4xl mb-4">🎤</div>
            <h2 className="text-2xl font-bold mb-2">유형별 연습</h2>
            <p className="text-gray-400 text-sm mb-6">
              개인 배경, 서베이 주제, 롤플레이, 돌발 질문<br />
              유형별로 선택해 집중 연습하세요.
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
              4개 문제를 연속으로 풀고 종합 채점 받기.
            </p>
            <div className="flex items-center gap-2 text-pink-400 font-semibold text-sm group-hover:gap-3 transition-all">
              모의고사 시작 <span>→</span>
            </div>
          </Link>
        </div>

        {/* OPIC Level Guide */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4 text-gray-300">OPIC 등급 가이드</h3>
          <div className="grid grid-cols-7 gap-2">
            {[
              { level: 'NH', desc: 'Novice High', color: 'bg-gray-700' },
              { level: 'IL', desc: 'Intermediate Low', color: 'bg-gray-600' },
              { level: 'IM1', desc: 'IM 1', color: 'bg-indigo-700' },
              { level: 'IM2', desc: 'IM 2', color: 'bg-purple-700' },
              { level: 'IM3', desc: 'IM 3', color: 'bg-purple-600' },
              { level: 'IH', desc: 'Intermediate High', color: 'bg-violet-500' },
              { level: 'AL', desc: 'Advanced Low', color: 'bg-amber-500' },
            ].map((g) => (
              <div key={g.level} className="text-center">
                <div className={`${g.color} rounded-lg py-2 text-xs font-bold mb-1`}>
                  {g.level}
                </div>
                <div className="text-[10px] text-gray-600 leading-tight hidden sm:block">{g.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">SPEAKZEN은 IM1부터 AL까지 집중 훈련합니다</p>
        </div>

        {/* Tips */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-gray-300">학습 팁</h3>
          <ul className="space-y-2.5 text-sm text-gray-400">
            {[
              '음성 인식을 사용하면 실제 시험에 더 가까운 연습이 됩니다.',
              '모범 답안을 그대로 외우기보다는 나만의 표현으로 바꿔보세요.',
              '롤플레이 문제에서는 상황을 구체적으로 묘사할수록 높은 점수가 납니다.',
              '돌발 질문은 과거-현재-미래 비교 구조로 답하면 IH 이상 등급 받기 유리합니다.',
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
