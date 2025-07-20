-- Create function to generate quiz questions directly from music_questions and music_answers tables
-- This function is used for "Music Facts" question type

CREATE OR REPLACE FUNCTION music_generatequizquestion_direct(
  target_question_id INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_question RECORD;
  all_answers TEXT[];
  shuffled_options TEXT[];
  correct_index INTEGER;
  result_json JSONB;
  temp_text TEXT;
  random_pos INTEGER;
  i INTEGER;
BEGIN
  -- Get the target question
  SELECT id, question 
  INTO target_question 
  FROM music_questions 
  WHERE id = target_question_id;
  
  -- Return null if question not found
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get all answers for this question in order
  SELECT ARRAY(
    SELECT answer 
    FROM music_answers 
    WHERE question_id = target_question_id 
    ORDER BY answer_id
  ) INTO all_answers;
  
  -- Check if we have answers
  IF array_length(all_answers, 1) IS NULL OR array_length(all_answers, 1) = 0 THEN
    RAISE EXCEPTION 'No answers found for question ID: %', target_question_id;
  END IF;
  
  -- Shuffle the options using Fisher-Yates algorithm
  shuffled_options := all_answers;
  FOR i IN REVERSE array_length(shuffled_options, 1) .. 2 LOOP
    -- Generate random position from 1 to i
    random_pos := floor(random() * i + 1)::INTEGER;
    
    -- Swap elements at positions i and random_pos
    temp_text := shuffled_options[i];
    shuffled_options[i] := shuffled_options[random_pos];
    shuffled_options[random_pos] := temp_text;
  END LOOP;
  
  -- Find the index of the correct answer in shuffled array
  -- First get the correct answer text
  DECLARE
    correct_answer_text TEXT;
  BEGIN
    SELECT answer INTO correct_answer_text
    FROM music_answers 
    WHERE question_id = target_question_id AND is_correct = true;
    
    -- Find its position in the shuffled array
    FOR i IN 1 .. array_length(shuffled_options, 1) LOOP
      IF shuffled_options[i] = correct_answer_text THEN
        correct_index := i - 1; -- Convert to 0-based index for JavaScript
        EXIT;
      END IF;
    END LOOP;
  END;
  
  -- Build the result JSON for music facts questions
  result_json := jsonb_build_object(
    'question_id', target_question.id,
    'question_text', target_question.question,
    'options', to_jsonb(shuffled_options),
    'correct_index', correct_index,
    'question_type', 'music_facts'
  );
  
  RETURN result_json;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION music_generatequizquestion_direct(INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION music_generatequizquestion_direct(INTEGER) IS 'Generates a quiz question directly from music_questions and music_answers tables for music facts question type';