-- Step 3a: Create quiz table for storing generated quiz sessions
-- This table stores complete quiz sessions with all questions and answers

CREATE TABLE IF NOT EXISTS quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  total_questions INTEGER NOT NULL DEFAULT 10,
  questions JSONB NOT NULL, -- Array of quiz questions with answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER, -- Final score when completed
  
  -- Ensure reasonable constraints
  CONSTRAINT quiz_total_questions_check CHECK (total_questions > 0 AND total_questions <= 50),
  CONSTRAINT quiz_score_check CHECK (score IS NULL OR (score >= 0 AND score <= total_questions)),
  CONSTRAINT quiz_completed_logic CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND score IS NOT NULL) OR
    (status != 'completed' AND (completed_at IS NULL OR score IS NULL))
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_user_id ON quiz(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_status ON quiz(status);
CREATE INDEX IF NOT EXISTS idx_quiz_created_at ON quiz(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_user_active ON quiz(user_id, status) WHERE status = 'active';

-- Enable RLS (Row Level Security)
ALTER TABLE quiz ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own quizzes
CREATE POLICY "Users can view their own quizzes" ON quiz
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own quizzes
CREATE POLICY "Users can create their own quizzes" ON quiz
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own quizzes (for completing them)
CREATE POLICY "Users can update their own quizzes" ON quiz
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own quizzes
CREATE POLICY "Users can delete their own quizzes" ON quiz
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add table comment
COMMENT ON TABLE quiz IS 'Stores generated quiz sessions with questions, answers, and completion status';

-- Add column comments
COMMENT ON COLUMN quiz.questions IS 'JSONB array containing quiz questions with structure: [{"word_id": 1, "word": "word", "correct_answer": "definition", "options": ["opt1", "opt2", "opt3", "opt4"], "correct_index": 0}]';
COMMENT ON COLUMN quiz.status IS 'Quiz status: active (in progress), completed (finished), abandoned (user left)';
COMMENT ON COLUMN quiz.score IS 'Final score when quiz is completed (number of correct answers)';

-- Verify table was created
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'quiz' 
  AND table_schema = 'public'
ORDER BY ordinal_position;