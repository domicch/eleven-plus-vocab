// Tests for generatequiz_ultimate database function
const { createClient } = require('@supabase/supabase-js');

describe('generatequiz_ultimate Database Function', () => {
  let supabase;
  let testUser;
  let totalVocabularyCount;

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

    // Get total vocabulary count for ultimate quiz testing
    const { count: vocabularyCount, error: vocabError } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true });

    if (vocabError || vocabularyCount === null || vocabularyCount === 0) {
      throw new Error('No vocabulary data found. Make sure vocabulary table is populated.');
    }
    
    totalVocabularyCount = vocabularyCount;
    console.log(`Total vocabulary count: ${totalVocabularyCount}`);
    
    if (totalVocabularyCount < 10) {
      throw new Error('Need at least 10 vocabulary words for ultimate quiz testing.');
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

  describe('generatequiz_ultimate Function', () => {
    beforeEach(async () => {
      // Clean up any existing quizzes for test user before each test
      await supabase
        .from('quiz')
        .delete()
        .eq('user_id', testUser.id);
    });

    test('should exist and be callable', async () => {
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should return quiz ID when successful', async () => {
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
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

    test('should set mode to "ultimate"', async () => {
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
      });

      expect(error).toBeNull();

      // Check the generated quiz has ultimate mode
      const { data: quizData, error: quizError } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizError).toBeNull();
      expect(quizData.mode).toBe('ultimate');

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should generate questions using ALL available vocabulary', async () => {
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
      });

      expect(error).toBeNull();

      // Check the generated quiz contains all vocabulary
      const { data: quizData, error: quizError } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizError).toBeNull();
      expect(quizData.total_questions).toBe(totalVocabularyCount);
      expect(Array.isArray(quizData.questions)).toBe(true);
      expect(quizData.questions).toHaveLength(totalVocabularyCount);

      // Verify all questions have correct structure
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
      });

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should generate unique questions (no duplicate words)', async () => {
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
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

    test('should use all available vocabulary words', async () => {
      // Get all vocabulary words from database
      const { data: allVocabulary, error: vocabError } = await supabase
        .from('vocabulary')
        .select('id, word')
        .order('id');

      expect(vocabError).toBeNull();
      expect(allVocabulary.length).toBe(totalVocabularyCount);

      // Generate ultimate quiz
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Extract word IDs from quiz
      const quizWordIds = quizData.questions.map(q => q.word_id).sort();
      const allWordIds = allVocabulary.map(v => v.id).sort();

      // Ultimate quiz should contain all vocabulary word IDs
      expect(quizWordIds).toEqual(allWordIds);

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should set quiz status to active', async () => {
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
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

    test('should prevent duplicate active ultimate quizzes', async () => {
      // Create first ultimate quiz
      const { data: firstQuiz, error: firstError } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
      });

      expect(firstError).toBeNull();
      expect(firstQuiz).toHaveProperty('quiz_id');

      // Try to create second ultimate quiz - should fail
      const { data: secondQuiz, error: secondError } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
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

  describe('Error Handling', () => {
    test('should handle invalid user ID', async () => {
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: '00000000-0000-0000-0000-000000000000'
      });

      // Should either return error or handle gracefully
      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toBeDefined();
      }
    });

    test('should handle null user ID', async () => {
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: null
      });

      // Should return error for null user ID
      expect(error || (data && data.error)).toBeTruthy();
    });
  });

  describe('Performance', () => {
    test('should complete within 5 seconds maximum', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Ultimate quiz must complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      console.log(`Ultimate quiz generation took ${duration}ms for ${totalVocabularyCount} questions`);

      // Clean up
      if (data && data.quiz_id) {
        await supabase
          .from('quiz')
          .delete()
          .eq('id', data.quiz_id);
      }
    });
  });

  describe('Integration with Normal Quiz Function', () => {
    beforeEach(async () => {
      // Clean up any existing quizzes for test user before each test
      await supabase
        .from('quiz')
        .delete()
        .eq('user_id', testUser.id);
    });

    test('should not interfere with normal quiz creation', async () => {
      // Create normal quiz first
      const { data: normalQuiz, error: normalError } = await supabase.rpc('generatequiz', {
        user_id: testUser.id,
        question_count: 10
      });

      expect(normalError).toBeNull();

      // Complete normal quiz (must set current_question_index = total_questions for completed status)
      await supabase
        .from('quiz')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          score: 8,
          current_question_index: 10
        })
        .eq('id', normalQuiz.quiz_id);

      // Create ultimate quiz
      const { data: ultimateQuiz, error: ultimateError } = await supabase.rpc('generatequiz_ultimate', {
        user_id: testUser.id
      });

      expect(ultimateError).toBeNull();
      expect(ultimateQuiz.quiz_id).not.toBe(normalQuiz.quiz_id);

      // Verify both exist with correct modes
      const { data: bothQuizzes, error: queryError } = await supabase
        .from('quiz')
        .select('id, mode, total_questions')
        .eq('user_id', testUser.id)
        .order('created_at');

      expect(queryError).toBeNull();
      expect(bothQuizzes).toHaveLength(2);
      
      expect(bothQuizzes[0].mode).toBe('normal');
      expect(bothQuizzes[0].total_questions).toBe(10);
      
      expect(bothQuizzes[1].mode).toBe('ultimate');
      expect(bothQuizzes[1].total_questions).toBe(totalVocabularyCount);

      // Clean up
      await supabase
        .from('quiz')
        .delete()
        .in('id', [normalQuiz.quiz_id, ultimateQuiz.quiz_id]);
    });
  });
});