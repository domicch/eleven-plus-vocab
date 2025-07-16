-- Step 9: Add progress tracking to quiz table (FIXED VERSION)
-- This allows server-side tracking of which questions have been answered

-- Add new columns to quiz table for progress tracking
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0;
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS answers_submitted JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS current_score INTEGER DEFAULT 0;

-- Update existing data to satisfy the new constraints BEFORE adding them
-- For completed quizzes: set current_question_index = total_questions
UPDATE quiz 
SET current_question_index = total_questions,
    current_score = COALESCE(score, 0)
WHERE status = 'completed' AND current_question_index != total_questions;

-- For active quizzes: ensure current_question_index is within bounds
UPDATE quiz 
SET current_question_index = LEAST(current_question_index, total_questions)
WHERE status = 'active' AND current_question_index > total_questions;

-- For abandoned quizzes: set reasonable defaults
UPDATE quiz 
SET current_question_index = LEAST(current_question_index, total_questions),
    current_score = COALESCE(current_score, 0)
WHERE status = 'abandoned';

-- Add constraints for the new fields (after data is fixed)
ALTER TABLE quiz ADD CONSTRAINT quiz_current_question_index_check 
  CHECK (current_question_index >= 0 AND current_question_index <= total_questions);

ALTER TABLE quiz ADD CONSTRAINT quiz_current_score_check 
  CHECK (current_score >= 0 AND current_score <= total_questions);

-- Update the completion logic constraint to account for new fields
ALTER TABLE quiz DROP CONSTRAINT IF EXISTS quiz_completed_logic;
ALTER TABLE quiz ADD CONSTRAINT quiz_completed_logic CHECK (
  (status = 'completed' AND completed_at IS NOT NULL AND score IS NOT NULL AND current_question_index = total_questions) OR
  (status = 'active' AND current_question_index >= 0 AND current_question_index <= total_questions) OR
  (status != 'completed' AND status != 'active')
);

-- Create index for performance on progress queries
CREATE INDEX IF NOT EXISTS idx_quiz_progress ON quiz(user_id, status, current_question_index);

-- Add comments to document the new fields
COMMENT ON COLUMN quiz.current_question_index IS 'Index of the current question (0-based). Used to track quiz progress.';
COMMENT ON COLUMN quiz.answers_submitted IS 'Array of submitted answers with timestamps. Prevents answer manipulation.';
COMMENT ON COLUMN quiz.current_score IS 'Running score as questions are answered. Updated by server-side function only.';

-- Verify the new structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quiz' 
  AND table_schema = 'public'
ORDER BY ordinal_position;