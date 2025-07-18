-- Step 11: Create music vocabulary table and import CSV data
-- This script creates the music vocabulary table and populates it with data from vocabulary-music.csv

-- Create music vocabulary table
CREATE TABLE IF NOT EXISTS music_vocabulary (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster word lookups
CREATE INDEX IF NOT EXISTS idx_music_vocabulary_word ON music_vocabulary(word);

-- Enable RLS (Row Level Security)
ALTER TABLE music_vocabulary ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read music vocabulary
CREATE POLICY "Allow authenticated users to read music vocabulary" ON music_vocabulary
  FOR SELECT
  TO authenticated
  USING (true);

-- Sample music vocabulary entries (first 10 words)
INSERT INTO music_vocabulary (word, definition) VALUES 
('Allegro', 'A fast tempo marking in music, typically between 120-168 beats per minute.'),
('Andante', 'A moderately slow tempo marking in music, literally meaning "walking pace".'),
('Arpeggio', 'A broken chord where the notes are played in succession rather than simultaneously.'),
('Cadence', 'A harmonic progression that provides closure or resolution at the end of a musical phrase.'),
('Crescendo', 'A gradual increase in volume or intensity of sound.'),
('Diminuendo', 'A gradual decrease in volume or intensity of sound.'),
('Forte', 'A dynamic marking indicating music should be played loudly.'),
('Glissando', 'A continuous slide between two pitches.'),
('Harmony', 'The combination of simultaneously sounded musical notes to produce chords.'),
('Interval', 'The distance between two pitches, measured in semitones or scale degrees.')
ON CONFLICT (word) DO NOTHING;

-- TODO: Add remaining music vocabulary words
-- For the complete import, recommend using Supabase dashboard:
-- 1. Go to Table Editor in Supabase dashboard
-- 2. Select music_vocabulary table
-- 3. Click "Insert" -> "Import data from CSV"
-- 4. Upload the vocabulary-music.csv file
-- 5. Map columns: word -> word, definition -> definition

-- Verify the table was created successfully
SELECT COUNT(*) as total_words FROM music_vocabulary;