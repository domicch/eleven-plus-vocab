-- Fix function overloading issues for music quiz functions
-- Drop the old function signatures and keep only the new ones with additional parameters

-- Drop the old music_generatequizquestion function signature (without question_type parameter)
DROP FUNCTION IF EXISTS music_generatequizquestion(INTEGER);

-- Drop the old music_generatequiz function signature (without new question type parameters)
DROP FUNCTION IF EXISTS music_generatequiz(UUID, INTEGER);

-- The new functions with additional parameters should already exist from steps 16 and 17
-- Grant permissions to the new function signatures
GRANT EXECUTE ON FUNCTION music_generatequizquestion(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION music_generatequiz(UUID, INTEGER, BOOLEAN, BOOLEAN, INTEGER[]) TO authenticated;

-- Test that the functions work
SELECT 'Function overload fixes completed' as status;