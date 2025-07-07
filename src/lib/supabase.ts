import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

export type Database = {
  public: {
    Tables: {
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
    }
  }
}