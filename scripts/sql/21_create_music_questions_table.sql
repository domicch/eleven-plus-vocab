-- Create music_questions table for music facts quiz questions
-- This table stores the pre-written music theory questions

CREATE TABLE music_questions (
  id INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Row Level Security (RLS)
ALTER TABLE music_questions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all authenticated users
CREATE POLICY "Allow read access to music questions" ON music_questions
  FOR SELECT TO authenticated
  USING (true);

-- Create index for performance
CREATE INDEX idx_music_questions_id ON music_questions(id);

-- Add comment
COMMENT ON TABLE music_questions IS 'Stores pre-written music theory questions for music facts quiz type';
COMMENT ON COLUMN music_questions.id IS 'Unique identifier for the question';
COMMENT ON COLUMN music_questions.question IS 'The text of the music theory question';