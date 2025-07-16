// Tests for submitQuizAnswer database function
const { createClient } = require('@supabase/supabase-js');

describe('submitQuizAnswer Database Function', () => {
  let supabase;
  let testUser;
  let testQuizId;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Sign in with test user
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (authError) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (signUpError) {
        throw new Error(`Failed to authenticate test user: ${signUpError.message}`);
      }
      testUser = signUpData.user;
    } else {
      testUser = authData.user;
    }

    console.log('Test user authenticated:', testUser.id);
  });

  afterAll(async () => {
    // Clean up test data
    if (testQuizId) {
      await supabase
        .from('quiz')
        .delete()
        .eq('id', testQuizId);
    }

    await supabase
      .from('quiz')
      .delete()
      .eq('user_id', testUser.id);

    await supabase
      .from('quiz_scores')
      .delete()
      .eq('user_id', testUser.id);

    await supabase.auth.signOut();
    console.log('Test cleanup completed');
  });

  beforeEach(async () => {
    // Clean up any existing test data in correct order (scores first, then quizzes)
    await supabase
      .from('quiz_scores')
      .delete()
      .eq('user_id', testUser.id);

    await supabase
      .from('quiz')
      .delete()
      .eq('user_id', testUser.id);
  });

  describe('Function Existence and Basic Structure', () => {
    test('should exist and be callable', async () => {
      // Create a test quiz first
      const { data: quizResult } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });

      testQuizId = quizResult.quiz_id;

      const { data, error } = await supabase.rpc('submitquizanswer', {
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
      const { data: quizResult } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });

      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: quizResult.quiz_id,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('is_correct');
      expect(data).toHaveProperty('new_score');
      expect(data).toHaveProperty('quiz_completed');
      expect(data).toHaveProperty('next_question_index');
      expect(data).toHaveProperty('total_questions');
    });
  });

  describe('Input Validation', () => {
    beforeEach(async () => {
      const { data: quizResult } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });
      testQuizId = quizResult.quiz_id;
    });

    test('should reject null quiz_id', async () => {
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: null,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/quiz.*id.*required/i);
    });

    test('should reject invalid question_index', async () => {
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: -1,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/question.*index/i);
    });

    test('should reject invalid selected_answer_index', async () => {
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 5
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/answer.*index.*between.*0.*3/i);
    });

    test('should reject non-existent quiz_id', async () => {
      const fakeQuizId = '00000000-0000-0000-0000-000000000000';
      
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: fakeQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/quiz.*not.*found/i);
    });
  });

  describe('Answer Submission Logic', () => {
    beforeEach(async () => {
      const { data: quizResult } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });
      testQuizId = quizResult.quiz_id;
    });

    test('should correctly identify correct answers', async () => {
      // Get the quiz to see the correct answer
      const { data: quiz } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      const correctIndex = quiz.questions[0].correct_index;

      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: correctIndex
      });

      expect(data.success).toBe(true);
      expect(data.is_correct).toBe(true);
      expect(data.new_score).toBe(1);
    });

    test('should correctly identify incorrect answers', async () => {
      // Get the quiz to see the correct answer
      const { data: quiz } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      const correctIndex = quiz.questions[0].correct_index;
      const wrongIndex = correctIndex === 0 ? 1 : 0; // Pick different index

      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: wrongIndex
      });

      expect(data.success).toBe(true);
      expect(data.is_correct).toBe(false);
      expect(data.new_score).toBe(0);
    });

    test('should track cumulative score correctly', async () => {
      // Get quiz data
      const { data: quiz } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      // Answer first question correctly
      let { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: quiz.questions[0].correct_index
      });
      
      expect(data.new_score).toBe(1);

      // Answer second question incorrectly
      const wrongIndex = quiz.questions[1].correct_index === 0 ? 1 : 0;
      
      ({ data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: wrongIndex
      }));
      
      expect(data.new_score).toBe(1); // Score should remain 1

      // Answer third question correctly
      ({ data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 2,
        selected_answer_index: quiz.questions[2].correct_index
      }));
      
      expect(data.new_score).toBe(2); // Score should be 2
      expect(data.quiz_completed).toBe(true);
    });
  });

  describe('Question Order Enforcement', () => {
    beforeEach(async () => {
      const { data: quizResult } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });
      testQuizId = quizResult.quiz_id;
    });

    test('should allow answering questions in order', async () => {
      // Answer question 0
      let { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });
      
      expect(data.success).toBe(true);
      expect(data.next_question_index).toBe(1);

      // Answer question 1
      ({ data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: 0
      }));
      
      expect(data.success).toBe(true);
      expect(data.next_question_index).toBe(2);
    });

    test('should prevent answering questions out of order', async () => {
      // Try to answer question 1 before question 0
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/order/i);
    });

    test('should prevent changing previous answers', async () => {
      // Answer question 0
      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      // Try to answer question 0 again
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 1
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/already.*answered/i);
    });
  });

  describe('Quiz Completion', () => {
    beforeEach(async () => {
      const { data: quizResult } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 2 // Use 2 questions for easier testing
      });
      testQuizId = quizResult.quiz_id;
    });

    test('should complete quiz after final question', async () => {
      // Answer first question
      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      // Answer final question
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: 0
      });

      expect(data.quiz_completed).toBe(true);
      expect(data.next_question_index).toBeNull();
      expect(data).toHaveProperty('final_score');
    });

    test('should update quiz status to completed', async () => {
      // Complete the quiz
      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: 0
      });

      // Check quiz status
      const { data: quiz } = await supabase
        .from('quiz')
        .select('status, score, completed_at')
        .eq('id', testQuizId)
        .single();

      expect(quiz.status).toBe('completed');
      expect(quiz.score).toBeGreaterThanOrEqual(0);
      expect(quiz.completed_at).not.toBeNull();
    });

    test('should create quiz_scores record when completed', async () => {
      // Complete the quiz
      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: 0
      });

      // Check if quiz_scores record was created
      const { data: scores } = await supabase
        .from('quiz_scores')
        .select('*')
        .eq('user_id', testUser.id)
        .order('created_at', { ascending: false }); // Get most recent first

      expect(scores.length).toBeGreaterThanOrEqual(1);
      expect(scores[0].total_questions).toBe(2);
      expect(scores[0].score).toBeGreaterThanOrEqual(0);
    });

    test('should prevent submitting to completed quiz', async () => {
      // Complete the quiz
      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 1,
        selected_answer_index: 0
      });

      // Try to submit another answer
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 1
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/not.*found.*not.*accessible/i);
    });
  });

  describe('Security and Access Control', () => {
    test('should only allow access to own quizzes', async () => {
      // This test would require a second user, which is complex to set up
      // For now, we'll test with an invalid quiz ID
      const fakeQuizId = '00000000-0000-0000-0000-000000000000';
      
      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: fakeQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/quiz.*not.*found/i);
    });

    test('should require active quiz status', async () => {
      // Create and immediately mark quiz as completed
      const { data: quizResult } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 2
      });

      // Manually update status to completed (must also set required fields for constraint)
      const { error: updateError } = await supabase
        .from('quiz')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          score: 0,
          current_question_index: 2
        })
        .eq('id', quizResult.quiz_id);

      expect(updateError).toBeNull(); // Ensure update succeeded

      // Verify the status was actually updated
      const { data: quizCheck } = await supabase
        .from('quiz')
        .select('status')
        .eq('id', quizResult.quiz_id)
        .single();

      expect(quizCheck.status).toBe('completed');

      const { data } = await supabase.rpc('submitquizanswer', {
        quiz_id: quizResult.quiz_id,
        question_index: 0,
        selected_answer_index: 0
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/quiz.*not.*found.*not.*accessible/i);
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      const { data: quizResult } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });
      testQuizId = quizResult.quiz_id;
    });

    test('should update current_question_index', async () => {
      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 0
      });

      const { data: quiz } = await supabase
        .from('quiz')
        .select('current_question_index')
        .eq('id', testQuizId)
        .single();

      expect(quiz.current_question_index).toBe(1);
    });

    test('should update current_score', async () => {
      // Get correct answer for first question
      const { data: quiz } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', testQuizId)
        .single();

      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: quiz.questions[0].correct_index
      });

      const { data: updatedQuiz } = await supabase
        .from('quiz')
        .select('current_score')
        .eq('id', testQuizId)
        .single();

      expect(updatedQuiz.current_score).toBe(1);
    });

    test('should store answers_submitted', async () => {
      await supabase.rpc('submitquizanswer', {
        quiz_id: testQuizId,
        question_index: 0,
        selected_answer_index: 2
      });

      const { data: quiz } = await supabase
        .from('quiz')
        .select('answers_submitted')
        .eq('id', testQuizId)
        .single();

      expect(Array.isArray(quiz.answers_submitted)).toBe(true);
      expect(quiz.answers_submitted).toHaveLength(1);
      expect(quiz.answers_submitted[0]).toHaveProperty('question_index', 0);
      expect(quiz.answers_submitted[0]).toHaveProperty('selected_answer_index', 2);
      expect(quiz.answers_submitted[0]).toHaveProperty('is_correct');
      expect(quiz.answers_submitted[0]).toHaveProperty('submitted_at');
    });
  });
});