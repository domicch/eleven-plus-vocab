-- Create music_answers table for music facts quiz answers
-- This table stores the pre-written answers for music theory questions

CREATE TABLE music_answers (
  question_id INTEGER NOT NULL REFERENCES music_questions(id) ON DELETE CASCADE,
  answer_id INTEGER NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (question_id, answer_id)
);

-- Add Row Level Security (RLS)
ALTER TABLE music_answers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all authenticated users
CREATE POLICY "Allow read access to music answers" ON music_answers
  FOR SELECT TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_music_answers_question_id ON music_answers(question_id);
CREATE INDEX idx_music_answers_is_correct ON music_answers(is_correct);

-- Add constraints for data integrity
-- Ensure each question has exactly one correct answer
CREATE UNIQUE INDEX idx_music_answers_one_correct_per_question 
  ON music_answers(question_id) 
  WHERE is_correct = true;

-- Add comments
COMMENT ON TABLE music_answers IS 'Stores pre-written answers for music theory questions';
COMMENT ON COLUMN music_answers.question_id IS 'References the question this answer belongs to';
COMMENT ON COLUMN music_answers.answer_id IS 'Sequential ID of the answer within the question (1, 2, 3, 4)';
COMMENT ON COLUMN music_answers.answer IS 'The text of the answer option';
COMMENT ON COLUMN music_answers.is_correct IS 'Whether this is the correct answer for the question';