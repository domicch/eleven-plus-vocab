// Tests for music_generatequizquestion database function
const { createClient } = require('@supabase/supabase-js');

describe('music_generatequizquestion Database Function', () => {
  let supabase;
  let testWordId;
  let testWord;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Sign in with a test user for authenticated access
    // You can create a test user in Supabase Auth or use an existing one
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    console.log(`Attempting to sign in test user: ${testEmail}`);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (authError) {
      console.log('Auth error, trying to sign up test user...');
      // Try to sign up if user doesn't exist
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (signUpError) {
        throw new Error(`Failed to authenticate test user: ${signUpError.message}`);
      }
      
      console.log('Test user signed up successfully');
    } else {
      console.log('Test user signed in successfully');
    }

    // Get a test word ID from music_vocabulary table
    const { data: vocabularyData, error } = await supabase
      .from('music_vocabulary')
      .select('id, word, definition')
      .limit(1);

    if (error) {
      throw new Error(`Failed to get test word: ${error.message}`);
    }

    if (!vocabularyData || vocabularyData.length === 0) {
      throw new Error('No music vocabulary words found in database');
    }

    testWordId = vocabularyData[0].id;
    testWord = vocabularyData[0];
    console.log(`Using test word: ${testWord.word} (ID: ${testWordId})`);
  });

  afterAll(async () => {
    // Clean up: sign out
    if (supabase) {
      await supabase.auth.signOut();
      console.log('Test user signed out');
    }
  });

  describe('Function Existence and Basic Structure', () => {
    test('should exist and be callable with default question type', async () => {
      const { data, error } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      // Function should exist and return something
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    test('should exist and be callable with explicit word_to_definition type', async () => {
      const { data, error } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId,
        question_type: 'word_to_definition'
      });

      // Function should exist and return something
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    test('should exist and be callable with image_to_word type', async () => {
      const { data, error } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId,
        question_type: 'image_to_word'
      });

      // Function should exist and return something
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    test('should return correct structure', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('word');
      expect(data).toHaveProperty('correctAnswer');
      expect(data).toHaveProperty('options');
      expect(data).toHaveProperty('correctIndex');
      
      // Check data types
      expect(typeof data.id).toBe('string');
      expect(typeof data.word).toBe('string');
      expect(typeof data.correctAnswer).toBe('string');
      expect(Array.isArray(data.options)).toBe(true);
      expect(typeof data.correctIndex).toBe('number');
    });

    test('should return correct word and answer', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      expect(data.id).toBe(testWord.id.toString());
      expect(data.word).toBe(testWord.word);
      expect(data.correctAnswer).toBe(testWord.definition);
    });

    test('should return 4 options', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      expect(Array.isArray(data.options)).toBe(true);
      expect(data.options).toHaveLength(4);
    });

    test('should include correct answer in options', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      expect(data.options).toContain(testWord.definition);
    });

    test('should have valid correctIndex', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      expect(data.correctIndex).toBeGreaterThanOrEqual(0);
      expect(data.correctIndex).toBeLessThan(4);
      expect(data.options[data.correctIndex]).toBe(testWord.definition);
    });
  });

  describe('Question Type Specific Tests', () => {
    describe('word_to_definition questions', () => {
      test('should return correct structure for word_to_definition', async () => {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId,
          question_type: 'word_to_definition'
        });

        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('word');
        expect(data).toHaveProperty('correctAnswer');
        expect(data).toHaveProperty('options');
        expect(data).toHaveProperty('correctIndex');
        expect(data).toHaveProperty('questionType');
        
        expect(data.questionType).toBe('word_to_definition');
        expect(data.correctAnswer).toBe(testWord.definition);
        expect(data.options).toContain(testWord.definition);
      });

      test('should not have correctWord field for word_to_definition', async () => {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId,
          question_type: 'word_to_definition'
        });

        expect(data).not.toHaveProperty('correctWord');
      });
    });

    describe('image_to_word questions', () => {
      test('should return correct structure for image_to_word', async () => {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId,
          question_type: 'image_to_word'
        });

        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('word');
        expect(data).toHaveProperty('correctWord');
        expect(data).toHaveProperty('options');
        expect(data).toHaveProperty('correctIndex');
        expect(data).toHaveProperty('questionType');
        
        expect(data.questionType).toBe('image_to_word');
        expect(data.correctWord).toBe(testWord.word);
      });

      test('should not have correctAnswer field for image_to_word', async () => {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId,
          question_type: 'image_to_word'
        });

        expect(data).not.toHaveProperty('correctAnswer');
      });

      test('should have word options instead of definition options', async () => {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId,
          question_type: 'image_to_word'
        });

        // The correct answer should be the word itself
        expect(data.options).toContain(testWord.word);
        expect(data.options[data.correctIndex]).toBe(testWord.word);
        
        // All options should be words, not definitions
        for (const option of data.options) {
          expect(typeof option).toBe('string');
          expect(option.length).toBeGreaterThan(0);
        }
      });

      test('should generate different word options for image_to_word', async () => {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId,
          question_type: 'image_to_word'
        });

        // Get wrong answers (exclude the correct word)
        const wrongAnswers = data.options.filter(option => option !== testWord.word);
        expect(wrongAnswers).toHaveLength(3);
        
        // All wrong answers should be different
        const uniqueWrongAnswers = [...new Set(wrongAnswers)];
        expect(uniqueWrongAnswers).toHaveLength(3);
      });
    });

    describe('question type validation', () => {
      test('should reject invalid question type', async () => {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId,
          question_type: 'invalid_type'
        });

        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Invalid question_type');
      });

      test('should default to word_to_definition when no type specified', async () => {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId
        });

        expect(data).toHaveProperty('questionType');
        expect(data.questionType).toBe('word_to_definition');
        expect(data).toHaveProperty('correctAnswer');
        expect(data.correctAnswer).toBe(testWord.definition);
      });
    });
  });

  describe('Input Validation', () => {
    test('should return null for non-existent word ID', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: 999999
      });

      expect(data).toBeNull();
    });

    test('should return null for null word ID', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: null
      });

      expect(data).toBeNull();
    });

    test('should handle invalid word ID gracefully', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: -1
      });

      expect(data).toBeNull();
    });
  });

  describe('Randomization', () => {
    test('should randomize option order', async () => {
      const results = [];
      const numTests = 10;

      // Generate multiple quiz questions for the same word
      for (let i = 0; i < numTests; i++) {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId
        });
        results.push(data.correctIndex);
      }

      // Check that we don't always get the same correctIndex
      const uniqueIndices = [...new Set(results)];
      expect(uniqueIndices.length).toBeGreaterThan(1);
    });

    test('should provide different wrong answers', async () => {
      const results = [];
      const numTests = 5;

      // Generate multiple quiz questions for the same word
      for (let i = 0; i < numTests; i++) {
        const { data } = await supabase.rpc('music_generatequizquestion', {
          word_id: testWordId
        });
        
        // Get wrong answers (exclude the correct one)
        const wrongAnswers = data.options.filter(option => option !== testWord.definition);
        results.push(wrongAnswers.sort().join('|'));
      }

      // Check that we don't always get the same set of wrong answers
      const uniqueWrongAnswerSets = [...new Set(results)];
      expect(uniqueWrongAnswerSets.length).toBeGreaterThan(1);
    });
  });

  describe('Data Integrity', () => {
    test('should not include duplicate options', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      const uniqueOptions = [...new Set(data.options)];
      expect(uniqueOptions).toHaveLength(4);
    });

    test('should always include the correct answer exactly once', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      const correctAnswerCount = data.options.filter(option => option === testWord.definition).length;
      expect(correctAnswerCount).toBe(1);
    });

    test('should have 3 different wrong answers', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

      const wrongAnswers = data.options.filter(option => option !== testWord.definition);
      expect(wrongAnswers).toHaveLength(3);
      
      // Check that all wrong answers are different
      const uniqueWrongAnswers = [...new Set(wrongAnswers)];
      expect(uniqueWrongAnswers).toHaveLength(3);
    });
  });

  describe('Multiple Word Tests', () => {
    test('should work with different words', async () => {
      // Get multiple test words
      const { data: words } = await supabase
        .from('music_vocabulary')
        .select('id, word, definition')
        .limit(3);

      expect(words).toHaveLength(3);

      // Test each word
      for (const word of words) {
        const { data, error } = await supabase.rpc('music_generatequizquestion', {
          word_id: word.id
        });

        expect(error).toBeNull();
        expect(data.id).toBe(word.id.toString());
        expect(data.word).toBe(word.word);
        expect(data.correctAnswer).toBe(word.definition);
        expect(data.options).toHaveLength(4);
        expect(data.options).toContain(word.definition);
      }
    });
  });

  describe('Performance', () => {
    test('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(executionTime).toBeLessThan(5000);
    });
  });
});