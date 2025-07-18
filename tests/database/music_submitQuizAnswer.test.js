// Tests for music_submitQuizAnswer database function
const { createClient } = require('@supabase/supabase-js');

describe('music_submitQuizAnswer Database Function', () => {
  let supabase;
  let testUser;
  let testQuizId;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Sign in with a test user for authenticated access
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (authError) {
      throw new Error(`Failed to authenticate test user: ${authError.message}`);
    }

    testUser = authData.user;
    console.log(`Test user authenticated: ${testUser.id}`);
  });

  beforeEach(async () => {
    // Clean up any existing quizzes and create a fresh one for each test
    await supabase
      .from('music_quiz')
      .delete()
      .eq('user_id', testUser.id);

    await supabase
      .from('music_quiz_scores')
      .delete()
      .eq('user_id', testUser.id);

    // Create a new quiz for testing
    const { data: quizResult, error: quizError } = await supabase.rpc('music_generatequiz', {
      user_id: testUser.id,
      question_count: 3
    });

    if (quizError) {
      throw new Error(`Failed to create test quiz: ${quizError.message}`);
    }

    testQuizId = quizResult.quiz_id;
  });

  afterAll(async () => {
    // Clean up test data
    if (supabase && testUser) {
      await supabase
        .from('music_quiz')
        .delete()
        .eq('user_id', testUser.id);

      await supabase
        .from('music_quiz_scores')
        .delete()
        .eq('user_id', testUser.id);
    }
    console.log('Test cleanup completed');
  });

  describe('Function Existence and Basic Structure', () => {
    test('should exist and be callable', async () => {
      const { data, error } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      // Function should exist and return something
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    test('should return success structure for valid submission', async () => {
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('is_correct');
      expect(data).toHaveProperty('new_score');
      expect(data).toHaveProperty('quiz_completed');
      expect(data).toHaveProperty('total_questions');
    });
  });

  describe('Input Validation', () => {
    test('should reject null quiz_id', async () => {
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: null,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error', 'Quiz ID is required');
    });

    test('should reject invalid question_index', async () => {
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: -1,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error', 'Valid question index is required');
    });

    test('should reject invalid selected_answer_index', async () => {
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 5
      });

      expect(data).toHaveProperty('error', 'Selected answer index must be between 0 and 3');
    });

    test('should reject non-existent quiz_id', async () => {
      const fakeQuizId = '00000000-0000-0000-0000-000000000000';
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: fakeQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error', 'Music quiz not found or not accessible');
    });
  });

  describe('Answer Submission Logic', () => {
    test('should correctly identify correct answers', async () => {
      // Get the quiz to find the correct answer
      const { data: quiz } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      const correctIndex = quiz.questions[0].correct_index;

      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: correctIndex
      });

      expect(data.success).toBe(true);
      expect(data.is_correct).toBe(true);
      expect(data.new_score).toBe(1);
    });

    test('should correctly identify incorrect answers', async () => {
      // Get the quiz to find a wrong answer
      const { data: quiz } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      const correctIndex = quiz.questions[0].correct_index;
      const wrongIndex = correctIndex === 0 ? 1 : 0;

      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: wrongIndex
      });

      expect(data.success).toBe(true);
      expect(data.is_correct).toBe(false);
      expect(data.new_score).toBe(0);
    });

    test('should track cumulative score correctly', async () => {
      // Get the quiz to find correct answers
      const { data: quiz } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      // Answer first question correctly
      const { data: result1 } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: quiz.questions[0].correct_index
      });

      expect(result1.new_score).toBe(1);

      // Answer second question incorrectly
      const wrongIndex = quiz.questions[1].correct_index === 0 ? 1 : 0;
      const { data: result2 } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: wrongIndex
      });

      expect(result2.new_score).toBe(1); // Still 1, didn't increase

      // Answer third question correctly
      const { data: result3 } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 2,
        selected_answer_index: quiz.questions[2].correct_index
      });

      expect(result3.new_score).toBe(2);
    });
  });

  describe('Question Order Enforcement', () => {
    test('should allow answering questions in order', async () => {
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });
      
      expect(data.success).toBe(true);
      expect(data.next_question_index).toBe(1);

      // Answer question 1
      const { data: result2 } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: 0
      });

      expect(result2.success).toBe(true);
      expect(result2.next_question_index).toBe(2);
    });

    test('should prevent answering questions out of order', async () => {
      // Try to answer question 1 before question 0
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error', 'Questions must be answered in order');
    });

    test('should prevent changing previous answers', async () => {
      // Answer question 0
      await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      // Try to answer question 0 again
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 1
      });

      expect(data).toHaveProperty('error', 'Question has already been answered');
    });
  });

  describe('Quiz Completion', () => {
    test('should complete quiz after final question', async () => {
      // Answer all questions
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase.rpc('music_submitquizanswer', {
          quiz_id: testQuizId,
          question_index: i,
          selected_answer_index: 0
        });

        if (i === 2) {
          // Final question
          expect(data.quiz_completed).toBe(true);
          expect(data.next_question_index).toBeNull();
          expect(data.final_score).toBeDefined();
        } else {
          expect(data.quiz_completed).toBe(false);
        }
      }
    });

    test('should update quiz status to completed', async () => {
      // Answer all questions
      for (let i = 0; i < 3; i++) {
        await supabase.rpc('music_submitquizanswer', {
          quiz_id: testQuizId,
          question_index: i,
          selected_answer_index: 0
        });
      }

      // Check quiz status
      const { data: quiz } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      expect(quiz.status).toBe('completed');
      expect(quiz.completed_at).not.toBeNull();
      expect(quiz.score).toBeDefined();
    });

    test('should create music_quiz_scores record when completed', async () => {
      // Answer all questions
      for (let i = 0; i < 3; i++) {
        await supabase.rpc('music_submitquizanswer', {
          quiz_id: testQuizId,
          question_index: i,
          selected_answer_index: 0
        });
      }

      // Check if score record was created
      const { data: scores } = await supabase
        .from('music_quiz_scores')
        .select('*')
        .eq('user_id', testUser.id)
        .order('created_at', { ascending: false });

      expect(scores.length).toBeGreaterThanOrEqual(1);
      expect(scores[0].total_questions).toBe(3);
    });

    test('should prevent submitting to completed quiz', async () => {
      // Complete the quiz
      for (let i = 0; i < 3; i++) {
        await supabase.rpc('music_submitquizanswer', {
          quiz_id: testQuizId,
          question_index: i,
          selected_answer_index: 0
        });
      }

      // Try to submit another answer
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 1
      });

      expect(data).toHaveProperty('error', 'Music quiz not found or not accessible');
    });
  });

  describe('Security and Access Control', () => {
    test('should only allow access to own quizzes', async () => {
      // This test assumes the function properly checks auth.uid()
      // In a real scenario, you'd need another user's quiz ID
      const fakeQuizId = '00000000-0000-0000-0000-000000000000';
      
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: fakeQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error', 'Music quiz not found or not accessible');
    });

    test('should require active quiz status', async () => {
      // Complete the quiz first
      for (let i = 0; i < 3; i++) {
        await supabase.rpc('music_submitquizanswer', {
          quiz_id: testQuizId,
          question_index: i,
          selected_answer_index: 0
        });
      }

      // Try to submit to completed quiz
      const { data } = await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error', 'Music quiz not found or not accessible');
    });
  });

  describe('Progress Tracking', () => {
    test('should update current_question_index', async () => {
      await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      const { data: quiz } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      expect(quiz.current_question_index).toBe(1);
    });

    test('should update current_score', async () => {
      // Get correct answer
      const { data: quiz } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: quiz.questions[0].correct_index
      });

      const { data: updatedQuiz } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      expect(updatedQuiz.current_score).toBe(1);
    });

    test('should store answers_submitted', async () => {
      await supabase.rpc('music_submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 2
      });

      const { data: quiz } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      expect(quiz.answers_submitted).toHaveLength(1);
      expect(quiz.answers_submitted[0]).toHaveProperty('question_index', 0);
      expect(quiz.answers_submitted[0]).toHaveProperty('selected_answer_index', 2);
      expect(quiz.answers_submitted[0]).toHaveProperty('is_correct');
      expect(quiz.answers_submitted[0]).toHaveProperty('submitted_at');
    });
  });
});