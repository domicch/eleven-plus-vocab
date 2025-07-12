-- Step 1: Create vocabulary table and import CSV data
-- This script creates the vocabulary table and populates it with data from vocabulary.csv

-- Create vocabulary table
CREATE TABLE IF NOT EXISTS vocabulary (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster word lookups
CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);

-- Enable RLS (Row Level Security)
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read vocabulary
CREATE POLICY "Allow authenticated users to read vocabulary" ON vocabulary
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert vocabulary data from CSV
-- Note: You can import this data in several ways:
-- 1. Use Supabase dashboard CSV import feature (recommended for large datasets)
-- 2. Use the INSERT statements below (sample shown)
-- 3. Use a custom import script

-- Sample vocabulary entries (first 10 words)
INSERT INTO vocabulary (word, definition) VALUES 
('Abode', 'The place someone calls home. This is usually a permanent place that they live and could be any type of shelter or habitat.'),
('Abstract', 'A thought of something that does not physically exist and cannot be referenced by a concrete object.'),
('Abundance', 'A large amount of something that is more than you require.'),
('Acclaim', 'Celebrate or give praise to someone in a public environment.'),
('Accolade', 'A way of honouring an achievement of a person or a place.'),
('Accompany', 'To go with or alongside something or someone.'),
('Achieve', 'To reach a goal or successfully reach a finishing point.'),
('Acquiesce', 'Despite not wanting to agree to something, you would rather not accept.'),
('Address', 'To share information to someone in a spoken or written medium.'),
('Adhere', 'To stick to something physically, emotionally or to follow rules.')
ON CONFLICT (word) DO NOTHING;

-- TODO: Add remaining 488 vocabulary words
-- For the complete import, recommend using Supabase dashboard:
-- 1. Go to Table Editor in Supabase dashboard
-- 2. Select vocabulary table
-- 3. Click "Insert" -> "Import data from CSV"
-- 4. Upload the vocabulary.csv file
-- 5. Map columns: word -> word, definition -> definition

-- Verify the table was created successfully
SELECT COUNT(*) as total_words FROM vocabulary;