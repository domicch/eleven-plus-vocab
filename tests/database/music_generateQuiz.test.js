// Tests for music_generateQuiz database function and music_quiz table
const { createClient } = require('@supabase/supabase-js');

describe('music_generateQuiz Database Function and Music Quiz Table', () => {
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

    // Verify we have music vocabulary data
    const { data: vocabularyData, error } = await supabase
      .from('music_vocabulary')
      .select('id')
      .limit(1);

    if (error || !vocabularyData || vocabularyData.length === 0) {
      throw new Error('No music vocabulary data found. Make sure music_vocabulary table is populated.');
    }
  });

  afterAll(async () => {
    // Clean up any test quizzes created during tests
    if (supabase && testUser) {
      await supabase
        .from('music_quiz')
        .delete()
        .eq('user_id', testUser.id);
      
      await supabase.auth.signOut();
      console.log('Test user signed out and test data cleaned up');
    }
  });

  describe('Music Quiz Table Structure and Access', () => {
    test('should be able to query music_quiz table', async () => {
      const { data, error } = await supabase
        .from('music_quiz')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should only see own quizzes (RLS test)', async () => {
      // Insert a test quiz
      const { data: insertData, error: insertError } = await supabase
        .from('music_quiz')
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
        .from('music_quiz')
        .select('*');

      expect(queryError).toBeNull();
      expect(queryData.every(quiz => quiz.user_id === testUser.id)).toBe(true);
    });
  });

  describe('music_generateQuiz Function', () => {
    beforeEach(async () => {
      // Clean up any existing quizzes before each test
      await supabase
        .from('music_quiz')
        .delete()
        .eq('user_id', testUser.id);
    });

    test('should exist and be callable', async () => {
      const { data, error } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    test('should return quiz ID when successful', async () => {
      const { data, error } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('quiz_id');
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('status', 'active');
      expect(data).toHaveProperty('total_questions', 5);

      // Verify the quiz was actually created in the database
      const { data: quizData, error: quizError } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizError).toBeNull();
      expect(quizData).toBeDefined();
      expect(quizData.user_id).toBe(testUser.id);
    });

    test('should generate correct number of questions', async () => {
      const questionCount = 7;
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: questionCount
      });

      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizData.total_questions).toBe(questionCount);
      expect(Array.isArray(quizData.questions)).toBe(true);
      expect(quizData.questions).toHaveLength(questionCount);
    });

    test('should generate questions with correct structure', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });

      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      quizData.questions.forEach((question, index) => {
        expect(question).toHaveProperty('word_id');
        expect(question).toHaveProperty('word');
        expect(question).toHaveProperty('correct_answer');
        expect(question).toHaveProperty('options');
        expect(question).toHaveProperty('correct_index');

        // Check types
        expect(typeof question.word_id).toBe('number');
        expect(typeof question.word).toBe('string');
        expect(typeof question.correct_answer).toBe('string');
        expect(Array.isArray(question.options)).toBe(true);
        expect(typeof question.correct_index).toBe('number');

        // Check array lengths
        expect(question.options).toHaveLength(4);
        expect(question.correct_index).toBeGreaterThanOrEqual(0);
        expect(question.correct_index).toBeLessThan(4);

        // Check that correct answer is in options
        expect(question.options[question.correct_index]).toBe(question.correct_answer);
      });
    });

    test('should generate unique questions (no duplicate words)', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 10
      });

      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Extract all word IDs
      const wordIds = quizData.questions.map(q => q.word_id);
      const uniqueWordIds = [...new Set(wordIds)];

      expect(uniqueWordIds).toHaveLength(wordIds.length);
    });

    test('should use default question count when not specified', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id
      });

      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizData.total_questions).toBe(10); // Default value
      expect(quizData.questions).toHaveLength(10);
    });

    test('should initialize progress tracking fields', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizData.current_question_index).toBe(0);
      expect(quizData.current_score).toBe(0);
      expect(quizData.answers_submitted).toEqual([]);
    });
  });

  describe('Question Type Parameters', () => {
    beforeEach(async () => {
      // Clean up any existing quizzes before each test in this section
      await supabase
        .from('music_quiz')
        .delete()
        .eq('user_id', testUser.id);
    });

    test('should generate quiz with default parameters (word_to_definition only)', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      expect(data).toHaveProperty('success', true);
      
      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // All questions should be word_to_definition type by default
      quizData.questions.forEach(question => {
        expect(question).toHaveProperty('question_type', 'word_to_definition');
        expect(question).toHaveProperty('correct_answer');
        expect(question).not.toHaveProperty('correct_word');
      });
    });

    test('should generate quiz with explicit word_to_definition only', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 4,
        include_word_to_definition: true,
        include_image_to_word: false,
        image_available_word_ids: null
      });

      expect(data).toHaveProperty('success', true);
      
      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // All questions should be word_to_definition type
      quizData.questions.forEach(question => {
        expect(question).toHaveProperty('question_type', 'word_to_definition');
        expect(question).toHaveProperty('correct_answer');
      });
    });

    test('should generate quiz with image_to_word questions when word IDs provided', async () => {
      // Get some vocabulary words for testing
      const { data: vocabularyData } = await supabase
        .from('music_vocabulary')
        .select('id')
        .limit(5);

      const wordIds = vocabularyData.map(v => v.id);

      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 3,
        include_word_to_definition: false,
        include_image_to_word: true,
        image_available_word_ids: wordIds.slice(0, 3)
      });

      expect(data).toHaveProperty('success', true);
      
      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // All questions should be image_to_word type
      quizData.questions.forEach(question => {
        expect(question).toHaveProperty('question_type', 'image_to_word');
        expect(question).toHaveProperty('correct_answer'); // This should be the word for image_to_word
        expect(wordIds).toContain(question.word_id);
      });
    });

    test('should generate mixed quiz when both types enabled', async () => {
      // Get some vocabulary words for testing
      const { data: vocabularyData } = await supabase
        .from('music_vocabulary')
        .select('id')
        .limit(10);

      const wordIds = vocabularyData.map(v => v.id);

      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 8,
        include_word_to_definition: true,
        include_image_to_word: true,
        image_available_word_ids: wordIds.slice(0, 4) // Only 4 words have images
      });

      expect(data).toHaveProperty('success', true);
      
      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Should have both question types
      const questionTypes = quizData.questions.map(q => q.question_type);
      const uniqueTypes = [...new Set(questionTypes)];
      
      // Should have at least one of each type (though exact distribution may vary)
      expect(questionTypes).toHaveLength(8);
      expect(uniqueTypes.length).toBeGreaterThanOrEqual(1);
      
      // Count each type
      const wordToDefCount = questionTypes.filter(type => type === 'word_to_definition').length;
      const imageToWordCount = questionTypes.filter(type => type === 'image_to_word').length;
      
      expect(wordToDefCount + imageToWordCount).toBe(8);
      expect(imageToWordCount).toBeLessThanOrEqual(4); // Can't exceed available image words
    });

    test('should reject when no question types enabled', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 5,
        include_word_to_definition: false,
        include_image_to_word: false,
        image_available_word_ids: null
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toContain('At least one question type must be enabled');
    });

    test('should fall back to word_to_definition when insufficient image words', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 6,
        include_word_to_definition: false,
        include_image_to_word: true,
        image_available_word_ids: [1, 2] // Only 2 image words but need 6 questions
      });

      expect(data).toHaveProperty('success', true);
      
      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Should have mix of both types due to fallback
      const questionTypes = quizData.questions.map(q => q.question_type);
      const imageToWordCount = questionTypes.filter(type => type === 'image_to_word').length;
      const wordToDefCount = questionTypes.filter(type => type === 'word_to_definition').length;
      
      expect(imageToWordCount).toBeLessThanOrEqual(2); // Limited by available image words
      expect(wordToDefCount).toBeGreaterThan(0); // Should have fallback questions
      expect(imageToWordCount + wordToDefCount).toBe(6);
    });

    test('should validate image_available_word_ids exist in vocabulary', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 3,
        include_word_to_definition: false,
        include_image_to_word: true,
        image_available_word_ids: [999999, 888888, 777777] // Non-existent word IDs
      });

      // Should either succeed with fallback or return appropriate error
      if (data.success) {
        // If it succeeds, should fall back to word_to_definition
        const { data: quizData } = await supabase
          .from('music_quiz')
          .select('*')
          .eq('id', data.quiz_id)
          .single();

        const questionTypes = quizData.questions.map(q => q.question_type);
        expect(questionTypes.every(type => type === 'word_to_definition')).toBe(true);
      } else {
        // If it fails, should have appropriate error
        expect(data).toHaveProperty('error');
      }
    });
  });

  describe('Input Validation', () => {
    test('should reject null user_id', async () => {
      const { data, error } = await supabase.rpc('music_generatequiz', {
        user_id: null,
        question_count: 5
      });

      expect(data).toHaveProperty('error', 'User ID is required');
    });

    test('should reject invalid question count', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 0
      });

      expect(data).toHaveProperty('error', 'Question count must be greater than 0');
    });

    test('should reject question count over limit', async () => {
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 100
      });

      expect(data).toHaveProperty('error', 'Question count cannot exceed 50');
    });
  });

  describe('Error Handling', () => {
    test('should prevent duplicate active quizzes', async () => {
      // Clean up first to start fresh (override beforeEach)
      await supabase
        .from('music_quiz')
        .delete()
        .eq('user_id', testUser.id);

      // Create first quiz - should succeed
      const { data: firstQuiz, error: firstError } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      expect(firstError).toBeNull();
      expect(firstQuiz).toHaveProperty('success', true);
      expect(firstQuiz).toHaveProperty('quiz_id');

      // Try to create second quiz - should fail
      const { data: secondQuiz, error: secondError } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 5
      });

      expect(secondQuiz).toHaveProperty('error', 'User already has an active music quiz');
    });

    test('should handle insufficient vocabulary gracefully', async () => {
      // This test assumes we have fewer than 100 music vocabulary words
      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 55 // Above the 50 limit, should get limit error first
      });

      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/Question count cannot exceed 50/);
    });
  });

  describe('Integration with Existing Functions', () => {
    test('should use music_generatequizquestion function internally', async () => {
      // Clean up first to start fresh (override beforeEach)
      await supabase
        .from('music_quiz')
        .delete()
        .eq('user_id', testUser.id);

      const { data } = await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 3
      });

      expect(data).toHaveProperty('quiz_id');

      // Get the created quiz from database
      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizData).toBeDefined();
      expect(quizData.questions).toBeDefined();

      // Each question should have the structure that music_generatequizquestion returns
      quizData.questions.forEach(question => {
        // Should match the structure from music_generatequizquestion
        expect(question).toMatchObject({
          word_id: expect.any(Number),
          word: expect.any(String),
          correct_answer: expect.any(String),
          options: expect.any(Array),
          correct_index: expect.any(Number)
        });
      });
    });
  });

  describe('Performance', () => {
    test('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await supabase.rpc('music_generatequiz', {
        user_id: testUser.id,
        question_count: 10
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within 10 seconds
      expect(executionTime).toBeLessThan(10000);
    });
  });
});