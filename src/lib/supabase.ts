import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Only create client if we have the required environment variables
export const supabase = typeof window !== 'undefined' && 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClientComponentClient()
  : null

export type Database = {
  public: {
    Tables: {
      vocabulary: {
        Row: {
          id: number
          word: string
          definition: string
          created_at: string
        }
        Insert: {
          id?: number
          word: string
          definition: string
          created_at?: string
        }
        Update: {
          id?: number
          word?: string
          definition?: string
          created_at?: string
        }
      }
      music_vocabulary: {
        Row: {
          id: number
          word: string
          definition: string
          created_at: string
        }
        Insert: {
          id?: number
          word: string
          definition: string
          created_at?: string
        }
        Update: {
          id?: number
          word?: string
          definition?: string
          created_at?: string
        }
      }
      quiz: {
        Row: {
          id: string
          user_id: string
          status: 'active' | 'completed' | 'abandoned'
          total_questions: number
          questions: QuizQuestion[]
          created_at: string
          completed_at: string | null
          score: number | null
          current_question_index: number
          current_score: number
          answers_submitted: Array<{
            question_index: number
            selected_answer_index: number
            is_correct: boolean
            submitted_at: string
          }>
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'active' | 'completed' | 'abandoned'
          total_questions?: number
          questions: QuizQuestion[]
          created_at?: string
          completed_at?: string | null
          score?: number | null
          current_question_index?: number
          current_score?: number
          answers_submitted?: Array<{
            question_index: number
            selected_answer_index: number
            is_correct: boolean
            submitted_at: string
          }>
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'active' | 'completed' | 'abandoned'
          total_questions?: number
          questions?: QuizQuestion[]
          created_at?: string
          completed_at?: string | null
          score?: number | null
          current_question_index?: number
          current_score?: number
          answers_submitted?: Array<{
            question_index: number
            selected_answer_index: number
            is_correct: boolean
            submitted_at: string
          }>
        }
      }
      music_quiz: {
        Row: {
          id: string
          user_id: string
          status: 'active' | 'completed' | 'abandoned'
          total_questions: number
          questions: QuizQuestion[]
          created_at: string
          completed_at: string | null
          score: number | null
          current_question_index: number
          current_score: number
          answers_submitted: Array<{
            question_index: number
            selected_answer_index: number
            is_correct: boolean
            submitted_at: string
          }>
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'active' | 'completed' | 'abandoned'
          total_questions?: number
          questions: QuizQuestion[]
          created_at?: string
          completed_at?: string | null
          score?: number | null
          current_question_index?: number
          current_score?: number
          answers_submitted?: Array<{
            question_index: number
            selected_answer_index: number
            is_correct: boolean
            submitted_at: string
          }>
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'active' | 'completed' | 'abandoned'
          total_questions?: number
          questions?: QuizQuestion[]
          created_at?: string
          completed_at?: string | null
          score?: number | null
          current_question_index?: number
          current_score?: number
          answers_submitted?: Array<{
            question_index: number
            selected_answer_index: number
            is_correct: boolean
            submitted_at: string
          }>
        }
      }
      quiz_scores: {
        Row: {
          id: string
          user_id: string
          score: number
          total_questions: number
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          score: number
          total_questions: number
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          score?: number
          total_questions?: number
          completed_at?: string
          created_at?: string
        }
      }
      music_quiz_scores: {
        Row: {
          id: string
          user_id: string
          score: number
          total_questions: number
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          score: number
          total_questions: number
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          score?: number
          total_questions?: number
          completed_at?: string
          created_at?: string
        }
      }
      daily_streaks: {
        Row: {
          id: string
          user_id: string
          date: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          completed?: boolean
          created_at?: string
        }
      }
      music_daily_streaks: {
        Row: {
          id: string
          user_id: string
          date: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          completed?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Quiz question structure for the questions JSONB field
export type QuizQuestion = {
  id: string
  word: string
  correctAnswer: string
  options: string[]
  correctIndex: number
  questionType?: 'word_to_definition' | 'image_to_word'
  correctWord?: string // For image-to-word questions
}