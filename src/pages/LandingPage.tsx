import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="font-bold text-xl tracking-tight">
          <span className="text-purple-400">SPEAK</span>ZEN
        </div>
        <div className="flex gap-3">
          <Link to="/signup" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
            등록하기
          </Link>
          <Link to="/login" className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors">
            로그인 →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-8">
          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
          OpenAI GPT-4o · 실시간 AI 채점
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          OPIC, AI가<br />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            끌어올린다.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 mb-4 max-w-2xl mx-auto leading-relaxed">
          실제 OPIC 시험 형식 그대로.<br />
          AI 채점, 음성 인식, 맞춤 모범답안으로 한 등급 위로.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
          <Link
            to="/signup"
            className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-purple-500/25"
          >
            등록하고 시작하기 →
          </Link>
          <Link
            to="/login"
            className="px-8 py-3.5 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-colors"
          >
            로그인
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-lg mx-auto">
          {[
            { value: '15문항', label: '유형별 연습' },
            { value: '5등급', label: 'IM1 ~ AL' },
            { value: 'GPT-4o', label: 'AI 채점 엔진' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold tracking-widest text-purple-400 uppercase mb-3">FEATURES</div>
          <h2 className="text-3xl md:text-4xl font-bold">SPEAKZEN의 기능</h2>
          <p className="text-gray-400 mt-3">학습부터 채점까지, 한 화면에서 끝내세요.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🎯',
              title: 'AI 엄격 채점',
              desc: '유창성·어휘·문법·내용·논리 5개 축으로 GPT-4o 기반 정밀 채점. 실제 OPIC 등급에 맞게 정직하게 평가합니다.',
            },
            {
              icon: '🎤',
              title: '음성 인식 답변',
              desc: 'Web Speech API로 실시간 영어 음성 → 텍스트 변환. 실제 시험처럼 말로 연습하세요.',
            },
            {
              icon: '📖',
              title: '4가지 문제 유형',
              desc: '개인 배경 / 서베이 주제 / 롤플레이 / 돌발 질문. 실제 OPIC 구성과 동일한 유형으로 연습합니다.',
            },
            {
              icon: '⭐',
              title: '맞춤 모범답안',
              desc: '목표 등급(IM1~AL)에 맞춘 모범답안 생성. 너무 어렵지도, 쉽지도 않게 최적화된 답변을 제공합니다.',
            },
            {
              icon: '⏱️',
              title: '실전 모의고사',
              desc: '실제 OPIC과 유사한 15분 모의고사. 개인배경→서베이→롤플레이→돌발 순서로 진행됩니다.',
            },
            {
              icon: '📊',
              title: '학습 통계',
              desc: '유형별 강약점, 점수 추이, 모의고사 히스토리. 어느 유형이 약한지 한눈에 확인하세요.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OPIC Info */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-3xl p-10 md:p-16 text-center">
          <div className="text-xs font-semibold tracking-widest text-purple-400 uppercase mb-3">ABOUT OPIC</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            OPIC이란?
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto mb-4">
            OPIC(Oral Proficiency Interview-computer)은 실제 생활에서 얼마나 효과적으로 의사소통할 수 있는지를 평가하는 말하기 시험입니다.
          </p>
          <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
            삼성, 현대, LG 등 국내 주요 대기업에서 공인 어학 점수로 인정하며,<br />
            NH~AL까지 총 9개 등급으로 평가됩니다.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {['NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL'].map((level, i) => (
              <div
                key={level}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  i >= 2 ? 'bg-purple-600/60 text-purple-100 border border-purple-500/40' : 'bg-white/10 text-gray-400'
                }`}
              >
                {level}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">SPEAKZEN은 IM1~AL 구간을 집중적으로 훈련합니다</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">준비되셨나요?</h2>
        <p className="text-gray-400 mb-8">처음이라면 <strong className="text-white">등록하기</strong>, 이미 등록했다면 <strong className="text-white">로그인</strong>.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/signup"
            className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold text-lg transition-all hover:scale-105"
          >
            등록하기 →
          </Link>
          <Link
            to="/login"
            className="px-8 py-3.5 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-colors"
          >
            로그인
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-600">
        <div className="font-bold text-gray-400 mb-1">
          <span className="text-purple-400">SPEAK</span>ZEN
        </div>
        <div>OPIC AI 트레이너 · powered by OpenAI GPT-4o</div>
      </footer>
    </div>
  )
}
