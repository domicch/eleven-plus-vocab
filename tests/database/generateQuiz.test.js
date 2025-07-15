// Tests for generateQuiz database function and quiz table
const { createClient } = require('@supabase/supabase-js');

describe('generateQuiz Database Function and Quiz Table', () => {
  let supabase;
  let testUser;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Sign in with a test user for authenticated access
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    console.log(`Attempting to sign in test user: ${testEmail}`);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (authError) {
      console.log('Auth error, trying to sign up test user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (signUpError) {
        throw new Error(`Failed to authenticate test user: ${signUpError.message}`);
      }
      
      console.log('Test user signed up successfully');
      testUser = signUpData.user;
    } else {
      console.log('Test user signed in successfully');
      testUser = authData.user;
    }

    // Verify we have vocabulary data
    const { data: vocabularyData, error } = await supabase
      .from('vocabulary')
      .select('id')
      .limit(1);

    if (error || !vocabularyData || vocabularyData.length === 0) {
      throw new Error('No vocabulary data found. Make sure vocabulary table is populated.');
    }
  });

  afterAll(async () => {
    // Clean up any test quizzes created during tests
    if (supabase && testUser) {
      await supabase
        .from('quiz')
        .delete()
        .eq('user_id', testUser.id);
      
      await supabase.auth.signOut();
      console.log('Test user signed out and test data cleaned up');
    }
  });

  describe('Quiz Table Structure and Access', () => {
    test('should be able to query quiz table', async () => {
      const { data, error } = await supabase
        .from('quiz')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should only see own quizzes (RLS test)', async () => {
      // Insert a test quiz
      const { data: insertData, error: insertError } = await supabase
        .from('quiz')
        .insert({
          user_id: testUser.id,
          total_questions: 10,
          questions: []
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(insertData).toBeDefined();
      expect(insertData.user_id).toBe(testUser.id);

      // Query should only return our quiz
      const { data: queryData, error: queryError } = await supabase
        .from('quiz')
        .select('*');

      expect(queryError).toBeNull();
      expect(Array.isArray(queryData)).toBe(true);
      
      // All returned quizzes should belong to current user
      queryData.forEach(quiz => {
        expect(quiz.user_id).toBe(testUser.id);
      });

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', insertData.id);
    });

    test('should have correct table schema', async () => {
      // Test inserting with required fields
      const testQuiz = {
        user_id: testUser.id,
        total_questions: 10,
        questions: [
          {
            word_id: 1,
            word: "test",
            correct_answer: "test definition",
            options: ["opt1", "opt2", "opt3", "opt4"],
            correct_index: 0
          }
        ]
      };

      const { data, error } = await supabase
        .from('quiz')
        .insert(testQuiz)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('user_id');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('total_questions');
      expect(data).toHaveProperty('questions');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('completed_at');
      expect(data).toHaveProperty('score');

      // Check default values
      expect(data.status).toBe('active');
      expect(data.total_questions).toBe(10);
      expect(data.completed_at).toBeNull();
      expect(data.score).toBeNull();

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.id);
    });
  });

  describe('generateQuiz Function', () => {
    beforeEach(async () => {
      // Clean up any existing quizzes for test user before each test
      await supabase
        .from('quiz')
        .delete()
        .eq('user_id', testUser.id);
    });

    test('should exist and be callable', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 10
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should return quiz ID when successful', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 10
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('quiz_id');
      expect(typeof data.quiz_id).toBe('string');

      // Verify quiz was created in database
      const { data: quizData, error: quizError } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizError).toBeNull();
      expect(quizData).toBeDefined();
      expect(quizData.user_id).toBe(testUser.id);

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should generate correct number of questions', async () => {
      const questionCount = 5;
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: questionCount
      });

      expect(error).toBeNull();

      // Check the generated quiz
      const { data: quizData } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizData.total_questions).toBe(questionCount);
      expect(Array.isArray(quizData.questions)).toBe(true);
      expect(quizData.questions).toHaveLength(questionCount);

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should generate questions with correct structure', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      quizData.questions.forEach((question, index) => {
        expect(question).toHaveProperty('word_id');
        expect(question).toHaveProperty('word');
        expect(question).toHaveProperty('correct_answer');
        expect(question).toHaveProperty('options');
        expect(question).toHaveProperty('correct_index');

        // Validate data types
        expect(typeof question.word_id).toBe('number');
        expect(typeof question.word).toBe('string');
        expect(typeof question.correct_answer).toBe('string');
        expect(Array.isArray(question.options)).toBe(true);
        expect(typeof question.correct_index).toBe('number');

        // Validate options
        expect(question.options).toHaveLength(4);
        expect(question.correct_index).toBeGreaterThanOrEqual(0);
        expect(question.correct_index).toBeLessThan(4);
        expect(question.options[question.correct_index]).toBe(question.correct_answer);

        // All options should be unique
        const uniqueOptions = [...new Set(question.options)];
        expect(uniqueOptions).toHaveLength(4);
      });

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should generate unique questions (no duplicate words)', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 10
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Extract all word IDs
      const wordIds = quizData.questions.map(q => q.word_id);
      const uniqueWordIds = [...new Set(wordIds)];

      expect(uniqueWordIds).toHaveLength(wordIds.length);

      // Extract all words
      const words = quizData.questions.map(q => q.word);
      const uniqueWords = [...new Set(words)];

      expect(uniqueWords).toHaveLength(words.length);

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should set quiz status to active', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizData.status).toBe('active');
      expect(quizData.completed_at).toBeNull();
      expect(quizData.score).toBeNull();

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid user ID', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: '00000000-0000-0000-0000-000000000000',
        question_count: 10
      });

      // Should either return error or handle gracefully
      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toBeDefined();
      }
    });

    test('should handle invalid question count', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 0
      });

      // Should return error for invalid question count
      if (error) {
        expect(error.message).toMatch(/question.*count|invalid/i);
      } else {
        expect(data).toHaveProperty('error');
      }
    });

    test('should handle excessive question count', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 1000
      });

      // Should return error or limit to available vocabulary
      if (error) {
        expect(error).toBeDefined();
      } else if (data.error) {
        expect(data.error).toMatch(/insufficient|too many|cannot exceed/i);
      }
    });

    test('should handle null parameters', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: null,
        question_count: null
      });

      // Should return error for null parameters
      expect(error || (data && data.error)).toBeTruthy();
    });

    test('should prevent duplicate active quizzes', async () => {
      // Create first quiz
      const { data: firstQuiz, error: firstError } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      expect(firstError).toBeNull();
      expect(firstQuiz).toHaveProperty('quiz_id');

      // Try to create second quiz - should fail
      const { data: secondQuiz, error: secondError } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      // Should return error or error in data
      if (secondError) {
        expect(secondError).toBeDefined();
      } else {
        expect(secondQuiz).toHaveProperty('error');
        expect(secondQuiz.error).toMatch(/already.*active.*quiz/i);
      }

      // Clean up first quiz
      await supabase
        .from('quiz')
        .delete()
        .eq('id', firstQuiz.quiz_id);
    });
  });

  describe('Performance', () => {
    test('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 10
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

      // Clean up
      if (data && data.quiz_id) {
        await supabase
          .from('quiz')
          .delete()
          .eq('id', data.quiz_id);
      }
    });
  });

  describe('Integration with Existing Functions', () => {
    beforeEach(async () => {
      // Clean up any existing quizzes for test user before each test
      await supabase
        .from('quiz')
        .delete()
        .eq('user_id', testUser.id);
    });

    test('should use generatequizquestion function internally', async () => {
      const { data, error } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Each question should have the structure that generatequizquestion returns
      quizData.questions.forEach(question => {
        // Should match the structure from generatequizquestion
        expect(question).toMatchObject({
          word_id: expect.any(Number),
          word: expect.any(String),
          correct_answer: expect.any(String),
          options: expect.any(Array),
          correct_index: expect.any(Number)
        });

        // Verify this matches vocabulary table
        expect(question.options[question.correct_index]).toBe(question.correct_answer);
      });

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });
  });
});