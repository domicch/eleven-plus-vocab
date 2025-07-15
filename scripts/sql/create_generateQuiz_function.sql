-- Step 3b: Create generatequiz database function
-- This function generates a complete quiz with multiple questions and stores it in the quiz table

CREATE OR REPLACE FUNCTION generatequiz(
  user_id UUID,
  question_count INTEGER DEFAULT 10
)
RETURNS JSONB
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_quiz_id UUID;
  v_questions JSONB := '[]'::jsonb;
  v_question_data JSONB;
  v_word_ids INTEGER[];
  v_word_id INTEGER;
  v_result JSONB;
  i INTEGER;
BEGIN
  -- Validate input parameters
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User ID is required');
  END IF;
  
  IF question_count IS NULL OR question_count <= 0 THEN
    RETURN jsonb_build_object('error', 'Question count must be greater than 0');
  END IF;
  
  IF question_count > 50 THEN
    RETURN jsonb_build_object('error', 'Question count cannot exceed 50');
  END IF;
  
  -- Check if user already has an active quiz
  SELECT COUNT(*) FROM quiz 
  WHERE quiz.user_id = generatequiz.user_id 
    AND status = 'active' 
  INTO i;
  
  IF i > 0 THEN
    RETURN jsonb_build_object('error', 'User already has an active quiz');
  END IF;
  
  -- Check if we have enough vocabulary words
  SELECT COUNT(*) FROM vocabulary INTO i;
  IF i < question_count THEN
    RETURN jsonb_build_object(
      'error', 
      'Insufficient vocabulary data: need at least ' || question_count || ' words, but only ' || i || ' available'
    );
  END IF;
  
  -- Get random unique word IDs for the quiz
  SELECT ARRAY(
    SELECT id 
    FROM vocabulary 
    ORDER BY RANDOM() 
    LIMIT question_count
  ) INTO v_word_ids;
  
  -- Generate questions for each selected word
  FOR i IN 1 .. array_length(v_word_ids, 1) LOOP
    v_word_id := v_word_ids[i];
    
    -- Generate question using existing generatequizquestion function
    SELECT generatequizquestion(v_word_id) INTO v_question_data;
    
    -- Check if question generation was successful
    IF v_question_data IS NULL OR v_question_data ? 'error' THEN
      RETURN jsonb_build_object(
        'error', 
        'Failed to generate question for word ID ' || v_word_id
      );
    END IF;
    
    -- Add word_id to the question data for tracking
    v_question_data := v_question_data || jsonb_build_object('word_id', v_word_id);
    
    -- Rename fields to match quiz table schema
    v_question_data := jsonb_build_object(
      'word_id', v_word_id,
      'word', v_question_data ->> 'word',
      'correct_answer', v_question_data ->> 'correctAnswer',
      'options', v_question_data -> 'options',
      'correct_index', (v_question_data ->> 'correctIndex')::integer
    );
    
    -- Add question to questions array
    v_questions := v_questions || v_question_data;
  END LOOP;
  
  -- Generate UUID for the new quiz
  v_quiz_id := gen_random_uuid();
  
  -- Insert the quiz into the database
  INSERT INTO quiz (
    id,
    user_id,
    status,
    total_questions,
    questions,
    created_at
  ) VALUES (
    v_quiz_id,
    user_id,
    'active',
    question_count,
    v_questions,
    NOW()
  );
  
  -- Return success with quiz ID
  v_result := jsonb_build_object(
    'quiz_id', v_quiz_id,
    'total_questions', question_count,
    'status', 'active',
    'success', true
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information for debugging
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'success', false
    );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION generatequiz(UUID, INTEGER) TO authenticated;

-- Create some test queries to verify the function works
-- (These are comments for manual testing)

/*
-- Test the function with valid parameters
SELECT generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 5);

-- Test with default question count
SELECT generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID);

-- Test with invalid parameters
SELECT generatequiz(NULL, 10);
SELECT generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 0);
SELECT generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 100);

-- Test performance
EXPLAIN ANALYZE SELECT generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 10);
*/

-- Add function documentation
COMMENT ON FUNCTION generatequiz(UUID, INTEGER) IS 
'Generates a complete quiz with specified number of questions for a user.
Parameters:
- user_id: UUID of the user creating the quiz
- question_count: Number of questions to generate (default 10, max 50)

Returns JSONB with:
- quiz_id: UUID of the created quiz
- total_questions: Number of questions generated
- status: Quiz status (always "active" for new quiz)
- success: Boolean indicating success

On error, returns JSONB with:
- error: Error message
- success: false

The function creates unique questions by selecting random vocabulary words
and using the generatequizquestion function for each word.';

-- Verify function was created successfully
SELECT 
  routine_name, 
  routine_type, 
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'generatequiz' 
  AND routine_schema = 'public';