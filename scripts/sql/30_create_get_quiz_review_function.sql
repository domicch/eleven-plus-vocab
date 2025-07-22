-- Create get_quiz_review function for 11+ mode quizzes
-- This function returns detailed quiz review data for completed quizzes only

CREATE OR REPLACE FUNCTION get_quiz_review(
  target_quiz_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quiz_record RECORD;
  result JSONB;
  answers_with_status JSONB[];
  answer_data JSONB;
  i INTEGER;
BEGIN
  -- Get quiz data - only if it belongs to the authenticated user
  SELECT 
    id,
    user_id,
    status,
    questions,
    answers_submitted,
    score,
    total_questions,
    completed_at,
    mode,
    created_at
  INTO quiz_record
  FROM quiz
  WHERE id = target_quiz_id
    AND user_id = auth.uid();

  -- Check if quiz exists and belongs to user
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  -- Check if quiz is completed
  IF quiz_record.status != 'completed' THEN
    RAISE EXCEPTION 'Quiz is not completed';
  END IF;

  -- Process answers_submitted to add is_correct flags
  answers_with_status := ARRAY[]::JSONB[];
  
  FOR i IN 0..(jsonb_array_length(quiz_record.answers_submitted) - 1) LOOP
    -- Get the user's selected answer index
    answer_data := quiz_record.answers_submitted->i;
    
    -- Transform the answer data to match expected format and add is_correct field
    answer_data := jsonb_build_object(
      'selected_index', (answer_data->>'selected_answer_index')::INTEGER,
      'is_correct', 
      (answer_data->>'selected_answer_index')::INTEGER = (quiz_record.questions->i->>'correct_index')::INTEGER
    );
    
    answers_with_status := answers_with_status || answer_data;
  END LOOP;

  -- Build result object
  result := jsonb_build_object(
    'quiz_id', quiz_record.id,
    'user_id', quiz_record.user_id,
    'status', quiz_record.status,
    'questions', quiz_record.questions,
    'answers_submitted', to_jsonb(answers_with_status),
    'score', quiz_record.score,
    'total_questions', quiz_record.total_questions,
    'completed_at', quiz_record.completed_at,
    'mode', quiz_record.mode,
    'created_at', quiz_record.created_at
  );

  RETURN result;
END;
$$;

-- Set up Row Level Security
-- Users can only access their own quiz reviews through existing RLS policies on quiz table

-- Add comment
COMMENT ON FUNCTION get_quiz_review(UUID) IS 'Returns detailed quiz review data for completed 11+ mode quizzes only';