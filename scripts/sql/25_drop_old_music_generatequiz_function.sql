-- Drop the old version of music_generatequiz function before creating the new one
-- This ensures clean deployment without function overload conflicts

-- Drop the old function signature
DROP FUNCTION IF EXISTS music_generatequiz(UUID, INTEGER, BOOLEAN, BOOLEAN, INTEGER[]);

-- Also drop any other potential overloads to ensure clean slate
DROP FUNCTION IF EXISTS music_generatequiz(UUID, INTEGER);
DROP FUNCTION IF EXISTS music_generatequiz(UUID);

-- Verify the function is removed
-- This query should return no rows after the drop
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'music_generatequiz';