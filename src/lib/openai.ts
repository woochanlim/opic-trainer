const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

export interface OPICQuestion {
  id: string
  type: 'personal_background' | 'survey_topic' | 'roleplaying' | 'unexpected'
  level: number
  topic: string
  question: string
  followUp?: string
}

export interface OPICScore {
  total: number
  grade: string
  fluency: number
  vocabulary: number
  grammar: number
  content: number
  coherence: number
  feedback: string
  modelAnswer: string
  improvedVersion: string
}

// 공통 API 호출 함수
async function callOpenAI(messages: { role: string; content: string }[], jsonMode = false): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다. .env 파일의 VITE_OPENAI_API_KEY를 확인하세요.')
  }

  let response: Response
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: jsonMode ? 0.3 : 0.7,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  } catch (e) {
    throw new Error(`네트워크 오류: OpenAI 서버에 연결할 수 없습니다. (${e})`)
  }

  if (!response.ok) {
    let errBody = ''
    try { errBody = await response.text() } catch { /* ignore */ }
    if (response.status === 401) throw new Error('API 키가 유효하지 않습니다. 키를 확인해 주세요.')
    if (response.status === 429) throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.')
    if (response.status >= 500) throw new Error('OpenAI 서버 오류입니다. 잠시 후 다시 시도해 주세요.')
    throw new Error(`OpenAI API 오류 (${response.status}): ${errBody.substring(0, 200)}`)
  }

  let data: { choices?: { message?: { content?: string } }[] }
  try { data = await response.json() } catch {
    throw new Error('API 응답 파싱 실패')
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('API 응답이 비어있습니다.')
  return content
}

export async function scoreOPICAnswer(
  question: string,
  userAnswer: string,
  targetLevel: string,
  questionType: string
): Promise<OPICScore> {
  const systemPrompt = `당신은 OPIC(Oral Proficiency Interview-computer) 전문 채점관입니다.
사용자의 영어 답변을 OPIC 기준으로 정확하고 엄격하게 채점하세요.

채점 기준 (각 항목 0-100점):
- fluency: 발화 자연스러움, 망설임 없는 표현, 연결어 사용
- vocabulary: 어휘 다양성, 고급 표현, 주제 관련 어휘 적절성
- grammar: 시제 일관성, 문장 구조 다양성, 오류 빈도
- content: 질문에 대한 충실도, 구체적 예시, 충분한 발화량
- coherence: 논리적 구조, 자연스러운 전개, 연결고리

OPIC 등급 기준 (total 점수 기반):
- NH: 0-29점 (단어·구절 수준)
- IL: 30-41점 (매우 짧은 문장)
- IM1: 42-53점 (단순 문장, 일상 주제)
- IM2: 54-65점 (문장 결합, 주제 확장)
- IM3: 66-77점 (다양한 구조, 복잡한 상황)
- IH: 78-89점 (문단 단위, 복잡한 주제)
- AL: 90-100점 (자연스러운 문단, 대부분 주제 처리)

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "total": 숫자(0-100),
  "grade": "NH|IL|IM1|IM2|IM3|IH|AL 중 하나",
  "fluency": 숫자(0-100),
  "vocabulary": 숫자(0-100),
  "grammar": 숫자(0-100),
  "content": 숫자(0-100),
  "coherence": 숫자(0-100),
  "feedback": "한국어 상세 피드백 (강점, 약점, 개선 방향 포함, 200자 이상)",
  "modelAnswer": "목표 등급(${targetLevel}) 수준의 영어 모범 답안",
  "improvedVersion": "사용자 답변을 개선한 영어 버전"
}`

  const userPrompt = `[질문 유형] ${questionType}
[목표 등급] ${targetLevel}
[OPIC 질문] ${question}
[사용자 답변] ${userAnswer.trim() || '(답변 없음)'}

위 답변을 채점하고 JSON을 반환하세요.`

  const content = await callOpenAI(
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    true
  )

  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(content) } catch {
    throw new Error(`채점 결과 파싱 오류: ${content.substring(0, 200)}`)
  }

  // 필수 필드 유효성 검사
  if (typeof parsed.total !== 'number' || !parsed.grade || !parsed.feedback) {
    throw new Error('채점 결과 형식이 올바르지 않습니다. 다시 시도해 주세요.')
  }

  // total 기반으로 grade 재검증 (GPT 오류 방지)
  const total = Math.max(0, Math.min(100, parsed.total as number))
  const grade = scoreToGrade(total)

  return {
    total,
    grade,
    fluency: clamp(parsed.fluency as number),
    vocabulary: clamp(parsed.vocabulary as number),
    grammar: clamp(parsed.grammar as number),
    content: clamp(parsed.content as number),
    coherence: clamp(parsed.coherence as number),
    feedback: String(parsed.feedback || ''),
    modelAnswer: String(parsed.modelAnswer || ''),
    improvedVersion: String(parsed.improvedVersion || ''),
  }
}

function clamp(v: unknown): number {
  const n = typeof v === 'number' ? v : 0
  return Math.max(0, Math.min(100, n))
}

export function scoreToGrade(score: number): string {
  if (score >= 90) return 'AL'
  if (score >= 78) return 'IH'
  if (score >= 66) return 'IM3'
  if (score >= 54) return 'IM2'
  if (score >= 42) return 'IM1'
  if (score >= 30) return 'IL'
  return 'NH'
}

export function gradeToColor(grade: string): string {
  switch (grade) {
    case 'AL': return 'text-amber-400'
    case 'IH': return 'text-violet-400'
    case 'IM3': return 'text-purple-400'
    case 'IM2': return 'text-indigo-400'
    case 'IM1': return 'text-blue-400'
    case 'IL': return 'text-gray-400'
    default: return 'text-gray-500'
  }
}

export async function generateModelAnswer(
  question: string,
  targetLevel: string,
  topic: string
): Promise<string> {
  const systemPrompt = `당신은 OPIC 전문 강사입니다. 주어진 OPIC 질문에 대해 목표 등급에 맞는 모범 답안을 영어로 작성하세요.

등급별 답변 길이/복잡도:
- IM1: 2-3문장, 단순 구조, 기본 어휘
- IM2: 3-4문장, 이유 1개 포함, 기본~중급 어휘
- IM3: 4-5문장, 이유+예시 포함, 중급 어휘
- IH: 5-6문장, 구체적 예시, 다양한 문법
- AL: 6-8문장, 자연스러운 전환, 고급 어휘

답변 영어 텍스트만 출력하세요.`

  const content = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `주제: ${topic}\n목표 등급: ${targetLevel}\n질문: ${question}` },
  ])

  return content.trim()
}

// ── OPIC 문제 데이터 ──────────────────────────────────────────
export const OPIC_QUESTIONS: OPICQuestion[] = [
  {
    id: 'pb_1', type: 'personal_background', level: 3, topic: '자기소개',
    question: 'Tell me about yourself. Where do you live? Who do you live with? What do you do for a living?',
    followUp: 'What do you enjoy doing in your free time?',
  },
  {
    id: 'pb_2', type: 'personal_background', level: 3, topic: '집/거주지',
    question: 'Tell me about your home. What does it look like? What do you like most about where you live?',
    followUp: 'What would you change about your home if you could?',
  },
  {
    id: 'st_1', type: 'survey_topic', level: 3, topic: '영화 보기',
    question: 'You indicated that you enjoy watching movies. What kinds of movies do you like to watch? Tell me about a movie you have seen recently.',
  },
  {
    id: 'st_2', type: 'survey_topic', level: 4, topic: '음악 감상',
    question: 'You said you like listening to music. What kind of music do you enjoy? How does music affect your mood?',
  },
  {
    id: 'st_3', type: 'survey_topic', level: 3, topic: '요리',
    question: 'You indicated that you enjoy cooking. What kinds of food do you like to cook? Tell me about a dish you recently cooked.',
  },
  {
    id: 'st_4', type: 'survey_topic', level: 4, topic: '여행',
    question: 'You said you like to travel. Where have you traveled recently? Tell me about a memorable trip you took.',
  },
  {
    id: 'st_5', type: 'survey_topic', level: 3, topic: '운동',
    question: 'You mentioned that you exercise regularly. What kind of exercise do you do? How often do you exercise and where?',
  },
  {
    id: 'st_6', type: 'survey_topic', level: 4, topic: '독서',
    question: 'You said you enjoy reading. What types of books do you like to read? Tell me about a book you recently read.',
  },
  {
    id: 'st_7', type: 'survey_topic', level: 5, topic: '쇼핑',
    question: 'You indicated that you enjoy shopping. What do you typically shop for? Describe your favorite shopping experience.',
  },
  {
    id: 'rp_1', type: 'roleplaying', level: 3, topic: '식당 예약',
    question: 'I would like to give you a situation and ask you to act it out. You want to make a reservation at a restaurant for a special occasion. Call the restaurant and make the reservation.',
  },
  {
    id: 'rp_2', type: 'roleplaying', level: 4, topic: '물건 교환',
    question: 'I would like to give you a situation to act out. You recently bought a jacket from a store, but when you got home, you found that it was defective. Call the store and explain the situation. Ask to exchange it for a new one.',
  },
  {
    id: 'rp_3', type: 'roleplaying', level: 4, topic: '약속 취소',
    question: 'I would like to give you a situation to act out. Something came up and you need to cancel your appointment with a friend. Call your friend, explain the situation, and arrange to meet at another time.',
  },
  {
    id: 'us_1', type: 'unexpected', level: 4, topic: '문제 해결',
    question: 'I would like to give you a situation to act out. You are at a hotel and you find out that your room has a broken air conditioner on a very hot day. Go to the front desk and ask them to fix the problem.',
  },
  {
    id: 'us_2', type: 'unexpected', level: 5, topic: '비교 설명',
    question: 'Tell me about the differences between how people spent their free time when you were young compared to how they spend it now. What has changed and why?',
  },
  {
    id: 'us_3', type: 'unexpected', level: 5, topic: '의견 제시',
    question: 'Some people believe that technology has made life more complicated rather than easier. Do you agree or disagree with this statement? Why?',
  },
]

export const OPIC_LEVELS = [
  { code: 'IM1', label: 'IM1', description: 'Intermediate Mid 1' },
  { code: 'IM2', label: 'IM2', description: 'Intermediate Mid 2' },
  { code: 'IM3', label: 'IM3', description: 'Intermediate Mid 3' },
  { code: 'IH',  label: 'IH',  description: 'Intermediate High' },
  { code: 'AL',  label: 'AL',  description: 'Advanced Low' },
]

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  personal_background: '개인 배경',
  survey_topic: '서베이 주제',
  roleplaying: '롤플레이',
  unexpected: '돌발 질문',
}
