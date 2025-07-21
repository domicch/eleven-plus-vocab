-- Step 28: Create music_generatequiz_ultimate database function  
-- This function generates an ultimate music quiz using ALL available music vocabulary and music questions

CREATE OR REPLACE FUNCTION music_generatequiz_ultimate(
  user_id UUID,
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
  v_image_word_ids INTEGER[];
  v_non_image_word_ids INTEGER[];
  v_music_question_ids INTEGER[];
  v_word_id INTEGER;
  v_music_question_id INTEGER;
  v_total_vocab_questions INTEGER;
  v_total_music_questions INTEGER;
  v_total_questions INTEGER;
  v_result JSONB;
  i INTEGER;
BEGIN
  -- Validate input parameters
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User ID is required');
  END IF;
  
  -- Check if user already has an active ultimate music quiz
  SELECT COUNT(*) FROM music_quiz 
  WHERE music_quiz.user_id = music_generatequiz_ultimate.user_id 
    AND status = 'active' 
    AND mode = 'ultimate'
  INTO i;
  
  IF i > 0 THEN
    RETURN jsonb_build_object('error', 'User already has an active ultimate music quiz');
  END IF;
  
  -- Split vocabulary word IDs based on image availability
  IF image_available_word_ids IS NOT NULL THEN
    -- Filter provided image word IDs to only include those that exist in music_vocabulary
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
      ORDER BY id
    ) INTO v_non_image_word_ids;
  ELSE
    -- No image questions requested, use all words for word-to-definition
    v_image_word_ids := ARRAY[]::INTEGER[];
    SELECT ARRAY(
      SELECT id 
      FROM music_vocabulary
      ORDER BY id
    ) INTO v_non_image_word_ids;
  END IF;
  
  -- Get ALL music questions for music facts
  SELECT ARRAY(
    SELECT id 
    FROM music_questions
    ORDER BY id
  ) INTO v_music_question_ids;
  
  -- Calculate total questions
  v_total_vocab_questions := COALESCE(array_length(v_image_word_ids, 1), 0) + COALESCE(array_length(v_non_image_word_ids, 1), 0);
  v_total_music_questions := COALESCE(array_length(v_music_question_ids, 1), 0);
  v_total_questions := v_total_vocab_questions + v_total_music_questions;
  
  -- Check if we have any data for ultimate quiz
  IF v_total_questions = 0 THEN
    RETURN jsonb_build_object(
      'error', 
      'No music vocabulary or music questions available for ultimate quiz'
    );
  END IF;
  
  -- Generate image-to-word questions for vocabulary with images
  IF v_image_word_ids IS NOT NULL AND array_length(v_image_word_ids, 1) > 0 THEN
    FOR i IN 1 .. array_length(v_image_word_ids, 1) LOOP
      v_word_id := v_image_word_ids[i];
      
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
        'question_type', 'image_to_word',
        'music_question_id', NULL
      );
      
      -- Add question to questions array
      v_questions := v_questions || v_question_data;
    END LOOP;
  END IF;
  
  -- Generate word-to-definition questions for vocabulary without images
  IF v_non_image_word_ids IS NOT NULL AND array_length(v_non_image_word_ids, 1) > 0 THEN
    FOR i IN 1 .. array_length(v_non_image_word_ids, 1) LOOP
      v_word_id := v_non_image_word_ids[i];
      
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
        'question_type', 'word_to_definition',
        'music_question_id', NULL
      );
      
      -- Add question to questions array
      v_questions := v_questions || v_question_data;
    END LOOP;
  END IF;
  
  -- Generate music fact questions for ALL music questions
  IF v_music_question_ids IS NOT NULL AND array_length(v_music_question_ids, 1) > 0 THEN
    FOR i IN 1 .. array_length(v_music_question_ids, 1) LOOP
      v_music_question_id := v_music_question_ids[i];
      
      -- Generate music fact question
      SELECT music_generatequizquestion_direct(v_music_question_id) INTO v_question_data;
      
      -- Check if question generation was successful
      IF v_question_data IS NULL OR v_question_data ? 'error' THEN
        RETURN jsonb_build_object(
          'error', 
          'Failed to generate music fact question for music question ID ' || v_music_question_id
        );
      END IF;
      
      -- Rename fields to match quiz table schema
      v_question_data := jsonb_build_object(
        'word_id', NULL, -- Music facts don't have word_id
        'word', NULL,    -- Music facts don't have word
        'correct_answer', v_question_data ->> 'correctAnswer',
        'options', v_question_data -> 'options',
        'correct_index', (v_question_data ->> 'correctIndex')::integer,
        'question_type', 'music_fact',
        'music_question_id', v_music_question_id
      );
      
      -- Add question to questions array
      v_questions := v_questions || v_question_data;
    END LOOP;
  END IF;
  
  -- Generate UUID for the new quiz
  v_quiz_id := gen_random_uuid();
  
  -- Insert the quiz into the database with mode = 'ultimate'
  INSERT INTO music_quiz (
    id,
    user_id,
    status,
    total_questions,
    questions,
    created_at,
    current_question_index,
    current_score,
    answers_submitted,
    mode
  ) VALUES (
    v_quiz_id,
    user_id,
    'active',
    v_total_questions,
    v_questions,
    NOW(),
    0,
    0,
    '[]'::jsonb,
    'ultimate'
  );
  
  -- Return success with quiz ID
  v_result := jsonb_build_object(
    'quiz_id', v_quiz_id,
    'total_questions', v_total_questions,
    'vocabulary_questions', v_total_vocab_questions,
    'music_fact_questions', v_total_music_questions,
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
GRANT EXECUTE ON FUNCTION music_generatequiz_ultimate(UUID, INTEGER[]) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION music_generatequiz_ultimate(UUID, INTEGER[]) IS 
'Generates an ultimate music theory quiz using ALL available music vocabulary and music questions.
Parameters:
- user_id: UUID of the user creating the quiz
- image_available_word_ids: Array of music vocabulary word IDs that have images available (optional)

Returns JSONB with:
- quiz_id: UUID of the created quiz
- total_questions: Total number of questions generated
- vocabulary_questions: Number of vocabulary questions (image_to_word + word_to_definition)
- music_fact_questions: Number of music fact questions
- status: Quiz status (always "active" for new quiz)
- mode: Quiz mode (always "ultimate")
- success: Boolean indicating success

On error, returns JSONB with:
- error: Error message
- success: false

The function intelligently selects question types:
- Words with images available → image_to_word questions
- Words without images → word_to_definition questions  
- All music_questions → music_fact questions

This ensures comprehensive coverage of all available music theory content.';

-- Verify function was created successfully
SELECT 
  routine_name, 
  routine_type, 
  data_type,
  specific_name
FROM information_schema.routines 
WHERE routine_name = 'music_generatequiz_ultimate' 
  AND routine_schema = 'public';