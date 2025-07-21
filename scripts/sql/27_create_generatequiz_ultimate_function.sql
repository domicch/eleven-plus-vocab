-- Step 27: Create generatequiz_ultimate database function
-- This function generates an ultimate quiz using ALL available vocabulary for 11+ exam

CREATE OR REPLACE FUNCTION generatequiz_ultimate(
  user_id UUID
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
  v_total_questions INTEGER;
  v_result JSONB;
  i INTEGER;
BEGIN
  -- Validate input parameters
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User ID is required');
  END IF;
  
  -- Check if user already has an active ultimate quiz
  SELECT COUNT(*) FROM quiz 
  WHERE quiz.user_id = generatequiz_ultimate.user_id 
    AND status = 'active' 
    AND mode = 'ultimate'
  INTO i;
  
  IF i > 0 THEN
    RETURN jsonb_build_object('error', 'User already has an active ultimate quiz');
  END IF;
  
  -- Get ALL vocabulary words for ultimate quiz
  SELECT ARRAY(
    SELECT id 
    FROM vocabulary
    ORDER BY id
  ) INTO v_word_ids;
  
  v_total_questions := array_length(v_word_ids, 1);
  
  -- Check if we have any vocabulary words
  IF v_total_questions IS NULL OR v_total_questions = 0 THEN
    RETURN jsonb_build_object(
      'error', 
      'No vocabulary data available for ultimate quiz'
    );
  END IF;
  
  -- Generate questions for ALL vocabulary words
  FOR i IN 1 .. v_total_questions LOOP
    v_word_id := v_word_ids[i];
    
    -- Generate word-to-definition question using existing function
    SELECT generatequizquestion(v_word_id) INTO v_question_data;
    
    -- Check if question generation was successful
    IF v_question_data IS NULL OR v_question_data ? 'error' THEN
      RETURN jsonb_build_object(
        'error', 
        'Failed to generate question for word ID ' || v_word_id
      );
    END IF;
    
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
  
  -- Insert the quiz into the database with mode = 'ultimate'
  INSERT INTO quiz (
    id,
    user_id,
    status,
    total_questions,
    questions,
    created_at,
    mode
  ) VALUES (
    v_quiz_id,
    user_id,
    'active',
    v_total_questions,
    v_questions,
    NOW(),
    'ultimate'
  );
  
  -- Return success with quiz ID
  v_result := jsonb_build_object(
    'quiz_id', v_quiz_id,
    'total_questions', v_total_questions,
    'status', 'active',
    'mode', 'ultimate',
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
GRANT EXECUTE ON FUNCTION generatequiz_ultimate(UUID) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION generatequiz_ultimate(UUID) IS 
'Generates an ultimate 11+ exam quiz using ALL available vocabulary words for a user.
Parameters:
- user_id: UUID of the user creating the quiz

Returns JSONB with:
- quiz_id: UUID of the created quiz
- total_questions: Number of questions generated (equals total vocabulary count)
- status: Quiz status (always "active" for new quiz)
- mode: Quiz mode (always "ultimate")
- success: Boolean indicating success

On error, returns JSONB with:
- error: Error message
- success: false

The function creates a quiz containing every vocabulary word in the database,
ensuring comprehensive coverage for ultimate practice. Each vocabulary word
appears exactly once as a word-to-definition question.';

-- Verify function was created successfully
SELECT 
  routine_name, 
  routine_type, 
  data_type,
  specific_name
FROM information_schema.routines 
WHERE routine_name = 'generatequiz_ultimate' 
  AND routine_schema = 'public';