// 사용자 목표/시험날짜/현재등급을 로컬스토리지에 저장/불러오는 훅

export interface UserGoal {
  targetLevel: string      // 목표 등급 (IM1~AL)
  currentLevel: string     // 현재 등급 (레벨테스트 결과)
  examDate: string         // 시험 날짜 (YYYY-MM-DD)
  userName: string         // 이름
}

const KEY = 'opic_user_goal'

export function getUserGoal(): UserGoal | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function saveUserGoal(goal: UserGoal) {
  localStorage.setItem(KEY, JSON.stringify(goal))
}

export function clearUserGoal() {
  localStorage.removeItem(KEY)
}

export function getDDay(examDate: string): number | null {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)
  return Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
