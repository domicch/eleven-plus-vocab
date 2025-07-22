// Tests for get_quiz_review database function (11+ mode)
const { createClient } = require('@supabase/supabase-js');

describe('get_quiz_review Database Function (11+ Mode)', () => {
  let supabase;
  let testUser;
  let completedQuizId;

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

  beforeEach(async () => {
    // Clean up any existing quizzes
    await supabase
      .from('quiz')
      .delete()
      .eq('user_id', testUser.id);

    await supabase
      .from('quiz_scores')
      .delete()
      .eq('user_id', testUser.id);

    // Create and complete a quiz for testing
    const { data: quizResult, error: quizError } = await supabase.rpc('generatequiz', {
      user_id: testUser.id,
      question_count: 3
    });

    if (quizError) {
      throw new Error(`Failed to create test quiz: ${quizError.message}`);
    }

    completedQuizId = quizResult.quiz_id;

    // Submit answers for all questions to complete the quiz
    for (let i = 0; i < 3; i++) {
      const { error: submitError } = await supabase.rpc('submitquizanswer', {
        quiz_id: completedQuizId,
        question_index: i,
        selected_answer_index: Math.floor(Math.random() * 4) // Random answer
      });

      if (submitError) {
        throw new Error(`Failed to submit answer for question ${i}: ${submitError.message}`);
      }
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await supabase
        .from('quiz')
        .delete()
        .eq('user_id', testUser.id);

      await supabase
        .from('quiz_scores')
        .delete()
        .eq('user_id', testUser.id);
    }

    await supabase.auth.signOut();
  });

  describe('Basic Functionality', () => {
    test('should return quiz review data for completed quiz', async () => {
      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: completedQuizId
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.quiz_id).toBe(completedQuizId);
      expect(data.status).toBe('completed');
      expect(data.questions).toBeDefined();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions).toHaveLength(3);
      expect(data.answers_submitted).toBeDefined();
      expect(Array.isArray(data.answers_submitted)).toBe(true);
      expect(data.answers_submitted).toHaveLength(3);
    });

    test('should include all question details in review', async () => {
      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: completedQuizId
      });

      expect(error).toBeNull();
      
      data.questions.forEach((question, index) => {
        expect(question).toHaveProperty('word_id');
        expect(question).toHaveProperty('word');
        expect(question).toHaveProperty('correct_answer');
        expect(question).toHaveProperty('options');
        expect(question).toHaveProperty('correct_index');
        
        expect(Array.isArray(question.options)).toBe(true);
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.correct_index).toBeGreaterThanOrEqual(0);
        expect(question.correct_index).toBeLessThan(question.options.length);
        expect(question.options[question.correct_index]).toBe(question.correct_answer);
      });
    });

    test('should include user answers with correct/incorrect status', async () => {
      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: completedQuizId
      });

      expect(error).toBeNull();
      
      data.answers_submitted.forEach((answer, index) => {
        expect(answer).toHaveProperty('selected_index');
        expect(answer).toHaveProperty('is_correct');
        expect(typeof answer.selected_index).toBe('number');
        expect(typeof answer.is_correct).toBe('boolean');
        expect(answer.selected_index).toBeGreaterThanOrEqual(0);
        expect(answer.selected_index).toBeLessThan(data.questions[index].options.length);
        
        // Verify is_correct matches the actual correctness
        const expectedCorrect = answer.selected_index === data.questions[index].correct_index;
        expect(answer.is_correct).toBe(expectedCorrect);
      });
    });

    test('should include quiz metadata', async () => {
      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: completedQuizId
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('quiz_id');
      expect(data).toHaveProperty('user_id');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('score');
      expect(data).toHaveProperty('total_questions');
      expect(data).toHaveProperty('completed_at');
      expect(data).toHaveProperty('mode');
      
      expect(data.user_id).toBe(testUser.id);
      expect(data.status).toBe('completed');
      expect(data.total_questions).toBe(3);
      expect(typeof data.score).toBe('number');
      expect(data.score).toBeGreaterThanOrEqual(0);
      expect(data.score).toBeLessThanOrEqual(3);
      expect(data.completed_at).toBeDefined();
    });
  });

  describe('Access Control and Validation', () => {
    test('should return error for non-existent quiz ID', async () => {
      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: '00000000-0000-0000-0000-000000000000'
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Quiz not found');
      expect(data).toBeNull();
    });

    test('should return error for quiz belonging to different user', async () => {
      // Sign in as second user (assume this user already exists)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test2@example.com',
        password: 'testpassword123'
      });

      if (signInError) {
        throw new Error(`Failed to sign in as second user: ${signInError.message}`);
      }

      // Verify we're actually signed in as the second user
      const { data: { user } } = await supabase.auth.getUser();
      expect(user.email).toBe('test2@example.com');

      // Try to access first user's quiz
      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: completedQuizId
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Quiz not found');
      expect(data).toBeNull();

      // Sign back in as original test user
      await supabase.auth.signInWithPassword({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'testpassword123'
      });
    });

    test('should return error for active (incomplete) quiz', async () => {
      // Create a new quiz but don't complete it
      const { data: newQuizResult, error: newQuizError } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 2
      });

      expect(newQuizError).toBeNull();

      // Submit only one answer to keep it active
      await supabase.rpc('submitquizanswer', {
        quiz_id: newQuizResult.quiz_id,
        question_index: 0,
        selected_answer_index: 0
      });

      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: newQuizResult.quiz_id
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Quiz is not completed');
      expect(data).toBeNull();
    });

    test('should return error for abandoned quiz', async () => {
      // Create and abandon a quiz
      const { data: newQuizResult, error: newQuizError } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 2
      });

      expect(newQuizError).toBeNull();

      // Manually set status to abandoned
      await supabase
        .from('quiz')
        .update({ status: 'abandoned' })
        .eq('id', newQuizResult.quiz_id);

      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: newQuizResult.quiz_id
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Quiz is not completed');
      expect(data).toBeNull();
    });
  });

  describe('Data Integrity', () => {
    test('should maintain question order consistency', async () => {
      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: completedQuizId
      });

      expect(error).toBeNull();
      
      // Get the original quiz data to compare
      const { data: originalQuiz } = await supabase
        .from('quiz')
        .select('questions, answers_submitted')
        .eq('id', completedQuizId)
        .single();

      expect(data.questions).toEqual(originalQuiz.questions);
      expect(data.answers_submitted.length).toBe(originalQuiz.answers_submitted.length);
    });

    test('should handle ultimate quiz mode', async () => {
      // Create an ultimate quiz and complete it
      const { data: ultimateQuizResult, error: ultimateQuizError } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
      });

      expect(ultimateQuizError).toBeNull();

      // Get the quiz to see how many questions it has
      const { data: quizData } = await supabase
        .from('quiz')
        .select('questions')
        .eq('id', ultimateQuizResult.quiz_id)
        .single();

      // Complete all questions in the ultimate quiz
      for (let i = 0; i < quizData.questions.length; i++) {
        await supabase.rpc('submitquizanswer', {
          quiz_id: ultimateQuizResult.quiz_id,
          question_index: i,
          selected_answer_index: 0
        });
      }

      const { data, error } = await supabase.rpc('get_quiz_review', {
        target_quiz_id: ultimateQuizResult.quiz_id
      });

      expect(error).toBeNull();
      expect(data.mode).toBe('ultimate');
      expect(data.questions.length).toBeGreaterThan(10); // Ultimate quiz has many questions
      expect(data.status).toBe('completed');
    }, 30000);
  });
});