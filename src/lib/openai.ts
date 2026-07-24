const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

export interface OPICQuestion {
  id: string
  type: 'personal_background' | 'survey_topic' | 'roleplaying' | 'unexpected'
  level: number // 1~6 (IM1~AL)
  topic: string
  question: string
  followUp?: string
}

export interface OPICScore {
  total: number        // 0~100
  grade: string        // NH, IL, IM1~3, IH, AL
  fluency: number      // 발화 유창성
  vocabulary: number   // 어휘 다양성
  grammar: number      // 문법 정확도
  content: number      // 내용 충실도
  coherence: number    // 논리적 흐름
  feedback: string     // 한국어 피드백
  modelAnswer: string  // 모범 답안
  improvedVersion: string // 개선된 사용자 답변
}

export async function scoreOPICAnswer(
  question: string,
  userAnswer: string,
  targetLevel: string,
  questionType: string
): Promise<OPICScore> {
  const systemPrompt = `당신은 OPIC(Oral Proficiency Interview - computer) 전문 채점관입니다.
사용자의 영어 답변을 OPIC 기준으로 정확하고 엄격하게 채점하세요.

채점 기준:
- 유창성(Fluency): 발화 속도, 망설임 없는 표현, 자연스러운 연결
- 어휘(Vocabulary): 다양한 어휘 사용, 고급 표현, 주제 관련 어휘
- 문법(Grammar): 시제 일관성, 문장 구조 다양성, 오류 빈도
- 내용(Content): 질문에 대한 충실한 답변, 구체적인 예시
- 논리(Coherence): 명확한 구조, 자연스러운 전개

OPIC 등급 기준:
- NH (Novice High): 단어나 구절 수준의 매우 제한적 표현
- IL (Intermediate Low): 매우 짧은 문장으로 기본적 의사소통
- IM1 (Intermediate Mid 1): 간단한 문장, 일상적 주제 처리
- IM2 (Intermediate Mid 2): 기본 문장들의 결합, 주제 확장 시작
- IM3 (Intermediate Mid 3): 다양한 문장 구조, 복잡한 상황 처리 시작
- IH (Intermediate High): 거의 일관된 문단 단위 표현, 복잡한 주제
- AL (Advanced Low): 자연스러운 문단 구성, 대부분의 주제 처리

반드시 다음 JSON 형식으로만 응답하세요:
{
  "total": 0-100,
  "grade": "등급",
  "fluency": 0-100,
  "vocabulary": 0-100,
  "grammar": 0-100,
  "content": 0-100,
  "coherence": 0-100,
  "feedback": "한국어로 상세한 피드백 (300자 이상)",
  "modelAnswer": "영어 모범 답안 (목표 등급 기준, 3-5문장)",
  "improvedVersion": "사용자 답변을 개선한 버전 (영어)"
}`

  const userPrompt = `질문 유형: ${questionType}
목표 등급: ${targetLevel}

OPIC 질문:
${question}

사용자 답변:
${userAnswer || '(답변 없음)'}

위 답변을 채점하고 JSON으로 반환하세요.`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API 오류: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content
  return JSON.parse(content) as OPICScore
}

export async function generateModelAnswer(
  question: string,
  targetLevel: string,
  topic: string
): Promise<string> {
  const systemPrompt = `당신은 OPIC 전문 강사입니다. 주어진 OPIC 질문에 대해 목표 등급에 맞는 모범 답안을 영어로 작성하세요.

등급별 답변 특징:
- IM1: 2-3문장, 단순한 구조, 기본 어휘
- IM2: 3-4문장, 약간의 설명 추가, 기본~중급 어휘
- IM3: 4-5문장, 이유와 예시 포함, 중급 어휘
- IH: 5-6문장, 구체적 예시, 다양한 문법 구조
- AL: 6-8문장, 자연스러운 전환, 풍부한 표현, 고급 어휘

답변만 출력하세요. 별도 설명 없이.`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `주제: ${topic}\n목표 등급: ${targetLevel}\n\n질문: ${question}` },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API 오류: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// OPIC 문제 데이터
export const OPIC_QUESTIONS: OPICQuestion[] = [
  // Personal Background (서베이 기반)
  {
    id: 'pb_1',
    type: 'personal_background',
    level: 3,
    topic: '자기소개',
    question: 'Tell me about yourself. Where do you live? Who do you live with? What do you do for a living?',
    followUp: 'What do you enjoy doing in your free time?'
  },
  {
    id: 'pb_2',
    type: 'personal_background',
    level: 3,
    topic: '집/거주지',
    question: 'Tell me about your home. What does it look like? What do you like most about where you live?',
    followUp: 'What would you change about your home if you could?'
  },
  // Survey Topic - 여가/취미
  {
    id: 'st_1',
    type: 'survey_topic',
    level: 3,
    topic: '영화 보기',
    question: 'You indicated that you enjoy watching movies. What kinds of movies do you like to watch? Tell me about a movie you have seen recently.',
  },
  {
    id: 'st_2',
    type: 'survey_topic',
    level: 4,
    topic: '음악 감상',
    question: 'You said you like listening to music. What kind of music do you enjoy? How does music affect your mood?',
  },
  {
    id: 'st_3',
    type: 'survey_topic',
    level: 3,
    topic: '요리',
    question: 'You indicated that you enjoy cooking. What kinds of food do you like to cook? Tell me about a dish you recently cooked.',
  },
  {
    id: 'st_4',
    type: 'survey_topic',
    level: 4,
    topic: '여행',
    question: 'You said you like to travel. Where have you traveled recently? Tell me about a memorable trip you took.',
  },
  {
    id: 'st_5',
    type: 'survey_topic',
    level: 3,
    topic: '운동',
    question: 'You mentioned that you exercise regularly. What kind of exercise do you do? How often do you exercise and where?',
  },
  {
    id: 'st_6',
    type: 'survey_topic',
    level: 4,
    topic: '독서',
    question: 'You said you enjoy reading. What types of books do you like to read? Tell me about a book you recently read.',
  },
  {
    id: 'st_7',
    type: 'survey_topic',
    level: 5,
    topic: '쇼핑',
    question: 'You indicated that you enjoy shopping. What do you typically shop for? Describe your favorite shopping experience.',
  },
  // Role Playing
  {
    id: 'rp_1',
    type: 'roleplaying',
    level: 3,
    topic: '식당 예약',
    question: 'I would like to give you a situation and ask you to act it out. You want to make a reservation at a restaurant for a special occasion. Call the restaurant and make the reservation.',
  },
  {
    id: 'rp_2',
    type: 'roleplaying',
    level: 4,
    topic: '물건 교환',
    question: 'I would like to give you a situation to act out. You recently bought a jacket from a store, but when you got home, you found that it was defective. Call the store and explain the situation. Ask to exchange it for a new one.',
  },
  {
    id: 'rp_3',
    type: 'roleplaying',
    level: 4,
    topic: '약속 취소',
    question: 'I would like to give you a situation to act out. Something came up and you need to cancel your appointment with a friend. Call your friend, explain the situation, and arrange to meet at another time.',
  },
  // Unexpected Situation
  {
    id: 'us_1',
    type: 'unexpected',
    level: 4,
    topic: '문제 해결',
    question: 'I would like to give you a situation to act out. You are at a hotel and you find out that your room has a broken air conditioner on a very hot day. Go to the front desk and ask them to fix the problem.',
  },
  {
    id: 'us_2',
    type: 'unexpected',
    level: 5,
    topic: '비교 설명',
    question: 'Tell me about the differences between how people spent their free time when you were young compared to how they spend it now. What has changed and why?',
  },
  {
    id: 'us_3',
    type: 'unexpected',
    level: 5,
    topic: '의견 제시',
    question: 'Some people believe that technology has made life more complicated rather than easier. Do you agree or disagree with this statement? Why?',
  },
]

export const OPIC_LEVELS = [
  { code: 'IM1', label: 'IM1', description: 'Intermediate Mid 1', color: '#6366f1' },
  { code: 'IM2', label: 'IM2', description: 'Intermediate Mid 2', color: '#8b5cf6' },
  { code: 'IM3', label: 'IM3', description: 'Intermediate Mid 3', color: '#a855f7' },
  { code: 'IH', label: 'IH', description: 'Intermediate High', color: '#d946ef' },
  { code: 'AL', label: 'AL', description: 'Advanced Low', color: '#f59e0b' },
]

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  personal_background: '개인 배경',
  survey_topic: '서베이 주제',
  roleplaying: '롤플레이',
  unexpected: '돌발 질문',
}
