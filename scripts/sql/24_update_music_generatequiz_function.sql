-- Update music_generatequiz function to support music facts question type
-- This adds support for the new 'music_facts' question type alongside existing vocabulary questions

CREATE OR REPLACE FUNCTION music_generatequiz(
  user_id UUID,
  question_count INTEGER DEFAULT 10,
  include_word_to_definition BOOLEAN DEFAULT true,
  include_image_to_word BOOLEAN DEFAULT false,
  image_available_word_ids INTEGER[] DEFAULT NULL,
  include_music_facts BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz_id UUID;
  v_questions JSONB := '[]'::jsonb;
  v_question_data JSONB;
  v_word_ids INTEGER[];
  v_image_word_ids INTEGER[];
  v_non_image_word_ids INTEGER[];
  v_facts_question_ids INTEGER[];
  v_word_id INTEGER;
  v_question_id INTEGER;
  v_question_type TEXT;
  v_result JSONB;
  v_image_question_count INTEGER := 0;
  v_word_definition_count INTEGER := 0;
  v_facts_question_count INTEGER := 0;
  v_vocab_question_count INTEGER := 0;
  total_vocab_words INTEGER;
  total_facts_questions INTEGER;
  i INTEGER;
BEGIN
  -- Validate input parameters
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User ID is required');
  END IF;
  
  IF question_count IS NULL OR question_count <= 0 THEN
    RETURN jsonb_build_object('error', 'Question count must be greater than 0');
  END IF;
  
  -- Validate that at least one question type is enabled
  IF NOT include_word_to_definition AND NOT include_image_to_word AND NOT include_music_facts THEN
    RETURN jsonb_build_object('error', 'At least one question type must be enabled');
  END IF;
  
  -- Check if user already has an active normal music quiz
  SELECT COUNT(*) FROM music_quiz 
  WHERE music_quiz.user_id = music_generatequiz.user_id 
    AND status = 'active' 
    AND mode = 'normal'
  INTO i;
  
  IF i > 0 THEN
    RETURN jsonb_build_object('error', 'User already has an active normal music quiz');
  END IF;
  
  -- Count available vocabulary words and music facts questions
  SELECT COUNT(*) FROM music_vocabulary INTO total_vocab_words;
  SELECT COUNT(*) FROM music_questions INTO total_facts_questions;
  
  -- Determine question distribution
  IF include_word_to_definition OR include_image_to_word THEN
    IF include_music_facts THEN
      -- Mixed mode: split questions between vocabulary and facts
      v_vocab_question_count := question_count / 2;
      v_facts_question_count := question_count - v_vocab_question_count;
    ELSE
      -- Vocabulary only
      v_vocab_question_count := question_count;
      v_facts_question_count := 0;
    END IF;
  ELSE
    -- Music facts only
    v_vocab_question_count := 0;
    v_facts_question_count := question_count;
  END IF;
  
  -- Validate we have enough questions
  IF v_vocab_question_count > 0 AND total_vocab_words < v_vocab_question_count THEN
    RETURN jsonb_build_object('error', 'Insufficient vocabulary words available');
  END IF;
  
  IF v_facts_question_count > 0 AND total_facts_questions < v_facts_question_count THEN
    RETURN jsonb_build_object('error', 'Insufficient music facts questions available');
  END IF;
  
  -- Handle vocabulary questions (restored original logic)
  IF v_vocab_question_count > 0 THEN
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
    
    -- Calculate how many questions of each vocabulary type to generate
    IF include_image_to_word AND include_word_to_definition THEN
      -- Mixed mode: roughly half and half, but prioritize available images
      v_image_question_count := LEAST(array_length(v_image_word_ids, 1), v_vocab_question_count / 2);
      v_word_definition_count := v_vocab_question_count - v_image_question_count;
    ELSIF include_image_to_word THEN
      -- Image-to-word only
      v_image_question_count := LEAST(array_length(v_image_word_ids, 1), v_vocab_question_count);
      v_word_definition_count := v_vocab_question_count - v_image_question_count;
      
      -- If not enough image words, fall back to word-to-definition
      IF v_image_question_count < v_vocab_question_count THEN
        v_word_definition_count := v_vocab_question_count - v_image_question_count;
      END IF;
    ELSE
      -- Word-to-definition only
      v_image_question_count := 0;
      v_word_definition_count := v_vocab_question_count;
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
  END IF;
  
  -- Generate music facts questions
  IF v_facts_question_count > 0 THEN
    -- Select random music facts question IDs
    SELECT ARRAY(
      SELECT id FROM music_questions 
      ORDER BY RANDOM() 
      LIMIT v_facts_question_count
    ) INTO v_facts_question_ids;
    
    -- Generate music facts questions
    FOR i IN 1 .. array_length(v_facts_question_ids, 1) LOOP
      v_question_id := v_facts_question_ids[i];
      
      SELECT music_generatequizquestion_direct(v_question_id) INTO v_question_data;
      
      -- Check if question generation was successful
      IF v_question_data IS NULL OR v_question_data ? 'error' THEN
        RETURN jsonb_build_object(
          'error', 
          'Failed to generate music facts question for question ID ' || v_question_id
        );
      END IF;
      
      -- Add question to questions array
      v_questions := v_questions || v_question_data;
    END LOOP;
  END IF;
  
  -- Shuffle all questions together
  SELECT jsonb_agg(value ORDER BY RANDOM()) 
  FROM jsonb_array_elements(v_questions) AS value
  INTO v_questions;
  
  -- Generate UUID for the new quiz
  v_quiz_id := gen_random_uuid();
  
  -- Insert the quiz into the database with mode = 'normal'
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
    jsonb_array_length(v_questions),
    v_questions,
    NOW(),
    0,
    0,
    '[]'::jsonb,
    'normal'
  );
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'quiz_id', v_quiz_id,
    'status', 'active',
    'total_questions', jsonb_array_length(v_questions),
    'vocab_questions', v_vocab_question_count,
    'facts_questions', v_facts_question_count
  );
  
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION music_generatequiz(UUID, INTEGER, BOOLEAN, BOOLEAN, INTEGER[], BOOLEAN) TO authenticated;

-- Add comment
COMMENT ON FUNCTION music_generatequiz(UUID, INTEGER, BOOLEAN, BOOLEAN, INTEGER[], BOOLEAN) IS 'Generates a music theory quiz with support for vocabulary questions (word_to_definition, image_to_word) and music facts questions';