import type { OPICQuestion, OPICScore } from '../lib/openai'

export interface ExamResult {
  question: OPICQuestion
  answer: string
  score: OPICScore
  timeSpent: number
}

export type { OPICQuestion, OPICScore }
