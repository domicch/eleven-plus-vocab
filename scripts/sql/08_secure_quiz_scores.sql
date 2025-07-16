-- Step 8: Secure quiz_scores table - Remove direct user access
-- Users should not be able to directly modify quiz scores

-- Remove existing policies that allow direct user access
DROP POLICY IF EXISTS "Users can view their own quiz scores" ON quiz_scores;
DROP POLICY IF EXISTS "Users can insert their own quiz scores" ON quiz_scores;

-- Create new restrictive policies
-- Users can only view their scores (read-only)
CREATE POLICY "Users can view their own quiz scores" ON quiz_scores
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only the server (via SECURITY DEFINER functions) can insert/update scores
-- No direct INSERT/UPDATE policies for users

-- Add comment to document the security change
COMMENT ON TABLE quiz_scores IS 
'Quiz scores table - READ ONLY for users. 
Scores can only be inserted/updated via server-side functions with SECURITY DEFINER.
This prevents users from directly manipulating their scores.';

-- Verify current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'quiz_scores'
ORDER BY policyname;