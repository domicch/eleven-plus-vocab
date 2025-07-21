-- Step 26: Add 'mode' column to quiz and music_quiz tables for Ultimate Quiz Mode
-- This enhancement supports both 'normal' and 'ultimate' quiz modes

-- Add mode column to quiz table
ALTER TABLE quiz 
ADD COLUMN mode VARCHAR(20) NOT NULL DEFAULT 'normal' 
CHECK (mode IN ('normal', 'ultimate'));

-- Add mode column to music_quiz table  
ALTER TABLE music_quiz 
ADD COLUMN mode VARCHAR(20) NOT NULL DEFAULT 'normal' 
CHECK (mode IN ('normal', 'ultimate'));

-- Update all existing records to have mode = 'normal' (should be automatic due to DEFAULT)
-- But let's be explicit for safety
UPDATE quiz SET mode = 'normal' WHERE mode IS NULL;
UPDATE music_quiz SET mode = 'normal' WHERE mode IS NULL;

-- Create indexes for performance on mode filtering
CREATE INDEX IF NOT EXISTS idx_quiz_mode ON quiz(mode);
CREATE INDEX IF NOT EXISTS idx_quiz_user_mode ON quiz(user_id, mode);
CREATE INDEX IF NOT EXISTS idx_music_quiz_mode ON music_quiz(mode);  
CREATE INDEX IF NOT EXISTS idx_music_quiz_user_mode ON music_quiz(user_id, mode);

-- Add column comments
COMMENT ON COLUMN quiz.mode IS 'Quiz mode: normal (regular quiz with selected question count) or ultimate (quiz with all available vocabulary)';
COMMENT ON COLUMN music_quiz.mode IS 'Quiz mode: normal (regular quiz with selected question count) or ultimate (quiz with all available vocabulary and music questions)';

-- Verify columns were added successfully
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('quiz', 'music_quiz')
  AND column_name = 'mode'
  AND table_schema = 'public'
ORDER BY table_name;

-- Show updated table structures
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name IN ('quiz', 'music_quiz')
  AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;