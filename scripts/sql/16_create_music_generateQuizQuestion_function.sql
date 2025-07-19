-- Step 16: Create music_generateQuizQuestion database function
-- This function generates a quiz question with 4 multiple choice options for a given music vocabulary word ID

CREATE OR REPLACE FUNCTION music_generatequizquestion(word_id INTEGER)
RETURNS JSONB
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  target_word RECORD;
  wrong_answers TEXT[];
  all_options TEXT[];
  shuffled_options TEXT[];
  correct_index INTEGER;
  i INTEGER;
  temp_text TEXT;
  random_pos INTEGER;
  result_json JSONB;
BEGIN
  -- Validate input
  IF word_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the target word and its definition
  SELECT id, word, definition 
  INTO target_word 
  FROM music_vocabulary 
  WHERE id = word_id;
  
  -- Return null if word not found
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get 3 random wrong answers (definitions from other words)
  SELECT ARRAY(
    SELECT definition 
    FROM music_vocabulary 
    WHERE id != word_id 
    ORDER BY RANDOM() 
    LIMIT 3
  ) INTO wrong_answers;
  
  -- Check if we have enough vocabulary words for wrong answers
  IF array_length(wrong_answers, 1) < 3 THEN
    RAISE EXCEPTION 'Insufficient music vocabulary data: need at least 4 words total';
  END IF;
  
  -- Create array with correct answer and wrong answers
  all_options := ARRAY[target_word.definition] || wrong_answers;
  
  -- Shuffle the options using Fisher-Yates algorithm
  shuffled_options := all_options;
  FOR i IN REVERSE 4 .. 2 LOOP
    -- Generate random position from 1 to i
    random_pos := floor(random() * i + 1)::INTEGER;
    
    -- Swap elements at positions i and random_pos
    temp_text := shuffled_options[i];
    shuffled_options[i] := shuffled_options[random_pos];
    shuffled_options[random_pos] := temp_text;
  END LOOP;
  
  -- Find the index of the correct answer in shuffled array
  FOR i IN 1 .. 4 LOOP
    IF shuffled_options[i] = target_word.definition THEN
      correct_index := i - 1; -- Convert to 0-based index for JavaScript
      EXIT;
    END IF;
  END LOOP;
  
  -- Build the result JSON
  result_json := jsonb_build_object(
    'id', target_word.id::TEXT,
    'word', target_word.word,
    'correctAnswer', target_word.definition,
    'options', to_jsonb(shuffled_options),
    'correctIndex', correct_index
  );
  
  RETURN result_json;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information for debugging
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION music_generatequizquestion(INTEGER) TO authenticated;

-- Create some test queries to verify the function works
-- (These are comments for manual testing)

/*
-- Test the function with a valid word ID
SELECT music_generatequizquestion(1);

-- Test with multiple calls to see randomization
SELECT music_generatequizquestion(1);
SELECT music_generatequizquestion(1);
SELECT music_generatequizquestion(1);

-- Test with invalid word ID
SELECT music_generatequizquestion(99999);

-- Test with NULL
SELECT music_generatequizquestion(NULL);

-- Test function performance
EXPLAIN ANALYZE SELECT music_generatequizquestion(1);
*/

-- Add function documentation
COMMENT ON FUNCTION music_generatequizquestion(INTEGER) IS 
'Generates a quiz question with 4 multiple choice options for a given music vocabulary word ID. 
Returns JSONB with: word (string), correctAnswer (string), options (array), correctIndex (number).
Options are randomly shuffled. Returns NULL for invalid word IDs.';

-- Create an index to optimize the random selection of wrong answers
-- This helps performance when selecting random vocabulary entries
CREATE INDEX IF NOT EXISTS idx_music_vocabulary_random ON music_vocabulary(id);

-- Verify function was created successfully
SELECT 
  routine_name, 
  routine_type, 
  data_type 
FROM information_schema.routines 
WHERE routine_name = 'music_generatequizquestion' 
  AND routine_schema = 'public';