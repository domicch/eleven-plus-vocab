-- Step 19: Secure music quiz scores table
-- Remove direct user access to music_quiz_scores table for security
-- Users should only access this table through the music_submitQuizAnswer function

-- Remove INSERT/UPDATE policies to prevent direct manipulation
-- Keep only SELECT policy so users can view their scores

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own music quiz scores" ON music_quiz_scores;
DROP POLICY IF EXISTS "Users can update their own music quiz scores" ON music_quiz_scores;

-- Keep only the SELECT policy for users to view their own scores
-- This policy should already exist, but we'll recreate it to be sure
DROP POLICY IF EXISTS "Users can view their own music quiz scores" ON music_quiz_scores;

CREATE POLICY "Users can view their own music quiz scores" ON music_quiz_scores
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

-- Add comment explaining the security model
COMMENT ON TABLE music_quiz_scores IS 
'Music quiz scores table with restricted access. Users can only view their own scores.
Score insertion is handled exclusively by the music_submitQuizAnswer function to prevent manipulation.
Direct INSERT/UPDATE access is disabled for security.';

-- Verify the policies are correct
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'music_quiz_scores'
ORDER BY policyname;