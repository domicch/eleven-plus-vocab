-- Step 29: Remove maximum question limits to allow ultimate quizzes with unlimited questions

-- Update quiz table constraint (11+ exam) - keep minimum check only
ALTER TABLE quiz DROP CONSTRAINT IF EXISTS quiz_total_questions_check;
ALTER TABLE quiz ADD CONSTRAINT quiz_total_questions_check 
  CHECK (total_questions > 0);

-- Update music_quiz table constraint (music theory) - keep minimum check only  
ALTER TABLE music_quiz DROP CONSTRAINT IF EXISTS music_quiz_total_questions_check;
ALTER TABLE music_quiz ADD CONSTRAINT music_quiz_total_questions_check 
  CHECK (total_questions > 0);

-- Score constraints remain the same since they reference total_questions dynamically
-- No changes needed for:
-- - quiz_score_check CHECK (score IS NULL OR (score >= 0 AND score <= total_questions))
-- - music_quiz_score_check CHECK (score IS NULL OR (score >= 0 AND score <= total_questions))
-- - music_quiz_current_question_index_check CHECK (current_question_index >= 0 AND current_question_index <= total_questions)
-- - music_quiz_current_score_check CHECK (current_score >= 0 AND current_score <= total_questions)

-- Verify constraints were updated
SELECT 
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('quiz', 'music_quiz') 
  AND cc.constraint_name LIKE '%total_questions_check'
ORDER BY tc.table_name, cc.constraint_name;