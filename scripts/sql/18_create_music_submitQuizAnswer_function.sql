-- Step 18: Create music_submitQuizAnswer function
-- This function securely handles quiz answer submissions for music theory quizzes

CREATE OR REPLACE FUNCTION music_submitQuizAnswer(
  quiz_id UUID,
  question_index INTEGER,
  selected_answer_index INTEGER
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_quiz_record music_quiz%ROWTYPE;
  v_question JSONB;
  v_is_correct BOOLEAN;
  v_new_score INTEGER;
  v_quiz_completed BOOLEAN := FALSE;
BEGIN
  -- Input validation
  IF quiz_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Quiz ID is required');
  END IF;
  
  IF question_index IS NULL OR question_index < 0 THEN
    RETURN jsonb_build_object('error', 'Valid question index is required');
  END IF;
  
  IF selected_answer_index IS NULL OR selected_answer_index < 0 OR selected_answer_index > 3 THEN
    RETURN jsonb_build_object('error', 'Selected answer index must be between 0 and 3');
  END IF;

  -- Get the quiz record with locking (this will fail if quiz doesn't exist or isn't accessible)
  SELECT * INTO v_quiz_record
  FROM music_quiz 
  WHERE id = quiz_id 
    AND user_id = auth.uid() 
    AND status = 'active'
  FOR UPDATE;

  -- Check if quiz was found
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Music quiz not found or not accessible');
  END IF;

  -- Check if this question has already been answered
  IF question_index < v_quiz_record.current_question_index THEN
    RETURN jsonb_build_object('error', 'Question has already been answered');
  END IF;

  -- Check if this is the next expected question
  IF question_index != v_quiz_record.current_question_index THEN
    RETURN jsonb_build_object('error', 'Questions must be answered in order');
  END IF;

  -- Get the specific question
  v_question := v_quiz_record.questions -> question_index;
  
  -- Check if answer is correct
  v_is_correct := selected_answer_index = (v_question ->> 'correct_index')::integer;
  
  -- Calculate new score
  v_new_score := v_quiz_record.current_score;
  IF v_is_correct THEN
    v_new_score := v_new_score + 1;
  END IF;

  -- Check if quiz is completed
  v_quiz_completed := (question_index + 1) >= v_quiz_record.total_questions;

  -- Update quiz record
  UPDATE music_quiz SET
    current_question_index = question_index + 1,
    current_score = v_new_score,
    answers_submitted = answers_submitted || jsonb_build_object(
      'question_index', question_index,
      'selected_answer_index', selected_answer_index,
      'is_correct', v_is_correct,
      'submitted_at', NOW()
    ),
    status = CASE WHEN v_quiz_completed THEN 'completed' ELSE 'active' END,
    score = CASE WHEN v_quiz_completed THEN v_new_score ELSE score END,
    completed_at = CASE WHEN v_quiz_completed THEN NOW() ELSE completed_at END
  WHERE id = quiz_id;

  -- If quiz is completed, insert into music_quiz_scores
  IF v_quiz_completed THEN
    INSERT INTO music_quiz_scores (
      user_id,
      score,
      total_questions,
      created_at
    ) VALUES (
      v_quiz_record.user_id,
      v_new_score,
      v_quiz_record.total_questions,
      NOW()
    );
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'new_score', v_new_score,
    'quiz_completed', v_quiz_completed,
    'next_question_index', CASE WHEN v_quiz_completed THEN null ELSE question_index + 1 END,
    'total_questions', v_quiz_record.total_questions,
    'final_score', CASE WHEN v_quiz_completed THEN v_new_score ELSE null END
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

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION music_submitQuizAnswer(UUID, INTEGER, INTEGER) TO authenticated;

-- Verify function was created
SELECT 
  routine_name, 
  routine_type, 
  data_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'music_submitquizanswer' 
  AND routine_schema = 'public';

-- Add function documentation
COMMENT ON FUNCTION music_submitQuizAnswer(UUID, INTEGER, INTEGER) IS 
'Securely handles quiz answer submissions for music theory quizzes.
Parameters:
- quiz_id: UUID of the quiz
- question_index: Index of the question being answered (0-based)
- selected_answer_index: Index of the selected answer (0-3)

Returns JSONB with:
- success: Boolean indicating success
- is_correct: Boolean indicating if answer was correct
- new_score: Updated score after this answer
- quiz_completed: Boolean indicating if quiz is now complete
- next_question_index: Index of next question (null if completed)
- total_questions: Total number of questions in quiz
- final_score: Final score (only if quiz_completed is true)

On error, returns JSONB with:
- error: Error message
- success: false

The function enforces question order, prevents duplicate answers, and automatically
completes the quiz when all questions are answered.';