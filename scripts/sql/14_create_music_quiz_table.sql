-- Step 14: Create music quiz table for storing generated quiz sessions
-- This table stores complete quiz sessions with all questions and answers for music theory

CREATE TABLE IF NOT EXISTS music_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  total_questions INTEGER NOT NULL DEFAULT 10,
  questions JSONB NOT NULL, -- Array of quiz questions with answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER, -- Final score when completed
  current_question_index INTEGER DEFAULT 0, -- Progress tracking
  answers_submitted JSONB DEFAULT '[]'::jsonb, -- Submitted answers
  current_score INTEGER DEFAULT 0, -- Running score
  
  -- Ensure reasonable constraints
  CONSTRAINT music_quiz_total_questions_check CHECK (total_questions > 0 AND total_questions <= 50),
  CONSTRAINT music_quiz_score_check CHECK (score IS NULL OR (score >= 0 AND score <= total_questions)),
  CONSTRAINT music_quiz_current_question_index_check CHECK (current_question_index >= 0 AND current_question_index <= total_questions),
  CONSTRAINT music_quiz_current_score_check CHECK (current_score >= 0 AND current_score <= total_questions),
  CONSTRAINT music_quiz_completed_logic CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND score IS NOT NULL AND current_question_index = total_questions) OR
    (status = 'active' AND current_question_index >= 0 AND current_question_index <= total_questions) OR
    (status != 'completed' AND status != 'active')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_music_quiz_user_id ON music_quiz(user_id);
CREATE INDEX IF NOT EXISTS idx_music_quiz_status ON music_quiz(status);
CREATE INDEX IF NOT EXISTS idx_music_quiz_created_at ON music_quiz(created_at);
CREATE INDEX IF NOT EXISTS idx_music_quiz_user_active ON music_quiz(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_music_quiz_progress ON music_quiz(user_id, status, current_question_index);

-- Enable RLS (Row Level Security)
ALTER TABLE music_quiz ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own quizzes
CREATE POLICY "Users can view their own music quizzes" ON music_quiz
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own quizzes
CREATE POLICY "Users can create their own music quizzes" ON music_quiz
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own quizzes (for completing them)
CREATE POLICY "Users can update their own music quizzes" ON music_quiz
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own quizzes
CREATE POLICY "Users can delete their own music quizzes" ON music_quiz
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add table comment
COMMENT ON TABLE music_quiz IS 'Stores generated quiz sessions with questions, answers, and completion status for music theory vocabulary';

-- Add column comments
COMMENT ON COLUMN music_quiz.questions IS 'JSONB array containing quiz questions with structure: [{"word_id": 1, "word": "word", "correct_answer": "definition", "options": ["opt1", "opt2", "opt3", "opt4"], "correct_index": 0}]';
COMMENT ON COLUMN music_quiz.status IS 'Quiz status: active (in progress), completed (finished), abandoned (user left)';
COMMENT ON COLUMN music_quiz.score IS 'Final score when quiz is completed (number of correct answers)';
COMMENT ON COLUMN music_quiz.current_question_index IS 'Index of the current question (0-based). Used to track quiz progress.';
COMMENT ON COLUMN music_quiz.answers_submitted IS 'Array of submitted answers with timestamps. Prevents answer manipulation.';
COMMENT ON COLUMN music_quiz.current_score IS 'Running score as questions are answered. Updated by server-side function only.';

-- Verify table was created
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'music_quiz' 
  AND table_schema = 'public'
ORDER BY ordinal_position;