-- Step 17: Create music_generatequiz database function
-- This function generates a complete quiz with multiple questions and stores it in the music_quiz table

CREATE OR REPLACE FUNCTION music_generatequiz(
  user_id UUID,
  question_count INTEGER DEFAULT 10,
  include_word_to_definition BOOLEAN DEFAULT true,
  include_image_to_word BOOLEAN DEFAULT false,
  image_available_word_ids INTEGER[] DEFAULT NULL
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
  v_image_word_ids INTEGER[];
  v_non_image_word_ids INTEGER[];
  v_word_id INTEGER;
  v_question_type TEXT;
  v_result JSONB;
  v_image_question_count INTEGER;
  v_word_definition_count INTEGER;
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
  
  -- Validate that at least one question type is enabled
  IF NOT include_word_to_definition AND NOT include_image_to_word THEN
    RETURN jsonb_build_object('error', 'At least one question type must be enabled');
  END IF;
  
  -- Check if user already has an active quiz
  SELECT COUNT(*) FROM music_quiz 
  WHERE music_quiz.user_id = music_generatequiz.user_id 
    AND status = 'active' 
  INTO i;
  
  IF i > 0 THEN
    RETURN jsonb_build_object('error', 'User already has an active music quiz');
  END IF;
  
  -- Check if we have enough vocabulary words
  SELECT COUNT(*) FROM music_vocabulary INTO i;
  IF i < question_count THEN
    RETURN jsonb_build_object(
      'error', 
      'Insufficient music vocabulary data: need at least ' || question_count || ' words, but only ' || i || ' available'
    );
  END IF;
  
  -- Split word IDs based on image availability for image-to-word questions
  IF include_image_to_word AND image_available_word_ids IS NOT NULL THEN
    -- Filter provided image word IDs to only include those that exist in vocabulary
    SELECT ARRAY(
      SELECT id 
      FROM music_vocabulary 
      WHERE id = ANY(image_available_word_ids)
    ) INTO v_image_word_ids;
    
    -- Get non-image word IDs for word-to-definition questions
    SELECT ARRAY(
      SELECT id 
      FROM music_vocabulary 
      WHERE NOT (id = ANY(image_available_word_ids))
    ) INTO v_non_image_word_ids;
  ELSE
    -- No image questions requested, use all words for word-to-definition
    v_image_word_ids := ARRAY[]::INTEGER[];
    SELECT ARRAY(
      SELECT id 
      FROM music_vocabulary
    ) INTO v_non_image_word_ids;
  END IF;
  
  -- Calculate how many questions of each type to generate
  IF include_image_to_word AND include_word_to_definition THEN
    -- Mixed mode: roughly half and half, but prioritize available images
    v_image_question_count := LEAST(array_length(v_image_word_ids, 1), question_count / 2);
    v_word_definition_count := question_count - v_image_question_count;
  ELSIF include_image_to_word THEN
    -- Image-to-word only
    v_image_question_count := LEAST(array_length(v_image_word_ids, 1), question_count);
    v_word_definition_count := question_count - v_image_question_count;
    
    -- If not enough image words, fall back to word-to-definition
    IF v_image_question_count < question_count THEN
      v_word_definition_count := question_count - v_image_question_count;
    END IF;
  ELSE
    -- Word-to-definition only
    v_image_question_count := 0;
    v_word_definition_count := question_count;
  END IF;
  
  -- Generate image-to-word questions first
  IF v_image_question_count > 0 THEN
    SELECT ARRAY(
      SELECT id 
      FROM unnest(v_image_word_ids) AS id
      ORDER BY RANDOM() 
      LIMIT v_image_question_count
    ) INTO v_word_ids;
    
    FOR i IN 1 .. array_length(v_word_ids, 1) LOOP
      v_word_id := v_word_ids[i];
      
      -- Generate image-to-word question
      SELECT music_generatequizquestion(v_word_id, 'image_to_word') INTO v_question_data;
      
      -- Check if question generation was successful
      IF v_question_data IS NULL OR v_question_data ? 'error' THEN
        RETURN jsonb_build_object(
          'error', 
          'Failed to generate image-to-word question for music word ID ' || v_word_id
        );
      END IF;
      
      -- Rename fields to match quiz table schema
      v_question_data := jsonb_build_object(
        'word_id', v_word_id,
        'word', v_question_data ->> 'word',
        'correct_answer', v_question_data ->> 'correctWord',
        'options', v_question_data -> 'options',
        'correct_index', (v_question_data ->> 'correctIndex')::integer,
        'question_type', 'image_to_word'
      );
      
      -- Add question to questions array
      v_questions := v_questions || v_question_data;
    END LOOP;
  END IF;
  
  -- Generate word-to-definition questions
  IF v_word_definition_count > 0 THEN
    SELECT ARRAY(
      SELECT id 
      FROM unnest(v_non_image_word_ids) AS id
      ORDER BY RANDOM() 
      LIMIT v_word_definition_count
    ) INTO v_word_ids;
    
    FOR i IN 1 .. array_length(v_word_ids, 1) LOOP
      v_word_id := v_word_ids[i];
      
      -- Generate word-to-definition question
      SELECT music_generatequizquestion(v_word_id, 'word_to_definition') INTO v_question_data;
      
      -- Check if question generation was successful
      IF v_question_data IS NULL OR v_question_data ? 'error' THEN
        RETURN jsonb_build_object(
          'error', 
          'Failed to generate word-to-definition question for music word ID ' || v_word_id
        );
      END IF;
      
      -- Rename fields to match quiz table schema
      v_question_data := jsonb_build_object(
        'word_id', v_word_id,
        'word', v_question_data ->> 'word',
        'correct_answer', v_question_data ->> 'correctAnswer',
        'options', v_question_data -> 'options',
        'correct_index', (v_question_data ->> 'correctIndex')::integer,
        'question_type', 'word_to_definition'
      );
      
      -- Add question to questions array
      v_questions := v_questions || v_question_data;
    END LOOP;
  END IF;
  
  -- Generate UUID for the new quiz
  v_quiz_id := gen_random_uuid();
  
  -- Insert the quiz into the database
  INSERT INTO music_quiz (
    id,
    user_id,
    status,
    total_questions,
    questions,
    created_at,
    current_question_index,
    current_score,
    answers_submitted
  ) VALUES (
    v_quiz_id,
    user_id,
    'active',
    question_count,
    v_questions,
    NOW(),
    0,
    0,
    '[]'::jsonb
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
GRANT EXECUTE ON FUNCTION music_generatequiz(UUID, INTEGER, BOOLEAN, BOOLEAN, INTEGER[]) TO authenticated;

-- Create some test queries to verify the function works
-- (These are comments for manual testing)

/*
-- Test the function with valid parameters (default word-to-definition only)
SELECT music_generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 5);

-- Test with default question count
SELECT music_generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID);

-- Test with image-to-word questions
SELECT music_generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 5, false, true, ARRAY[3, 25, 27, 29]);

-- Test with mixed question types
SELECT music_generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 10, true, true, ARRAY[3, 25, 27, 29]);

-- Test with invalid parameters
SELECT music_generatequiz(NULL, 10);
SELECT music_generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 0);
SELECT music_generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 100);
SELECT music_generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 10, false, false);

-- Test performance
EXPLAIN ANALYZE SELECT music_generatequiz('123e4567-e89b-12d3-a456-426614174000'::UUID, 10);
*/

-- Add function documentation
COMMENT ON FUNCTION music_generatequiz(UUID, INTEGER, BOOLEAN, BOOLEAN, INTEGER[]) IS 
'Generates a complete music theory quiz with specified number of questions and question types for a user.
Parameters:
- user_id: UUID of the user creating the quiz
- question_count: Number of questions to generate (default 10, max 50)
- include_word_to_definition: Whether to include traditional word-to-definition questions (default true)
- include_image_to_word: Whether to include image-to-word questions (default false)
- image_available_word_ids: Array of word IDs that have images available (used for image-to-word questions)

Returns JSONB with:
- quiz_id: UUID of the created quiz
- total_questions: Number of questions generated
- status: Quiz status (always "active" for new quiz)
- success: Boolean indicating success

On error, returns JSONB with:
- error: Error message
- success: false

The function creates unique questions by selecting random music vocabulary words
and using the music_generatequizquestion function for each word. It supports
mixed quizzes with both word-to-definition and image-to-word question types.
When both types are enabled, it generates roughly half of each type, prioritizing
image questions based on available images.';

-- Verify function was created successfully
SELECT 
  routine_name, 
  routine_type, 
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'music_generatequiz' 
  AND routine_schema = 'public';