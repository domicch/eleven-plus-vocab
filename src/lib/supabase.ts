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
    }
  }
}