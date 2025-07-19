// Tests for generatequizquestion database function
const { createClient } = require('@supabase/supabase-js');

describe('generatequizquestion Database Function', () => {
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

    // Get a test word ID from vocabulary table
    const { data: vocabularyData, error } = await supabase
      .from('vocabulary')
      .select('id, word, definition')
      .limit(1);

    if (error) {
      throw new Error(`Failed to get test vocabulary: ${error.message}`);
    }

    if (!vocabularyData || vocabularyData.length === 0) {
      throw new Error('No vocabulary data found. Make sure vocabulary table is populated.');
    }

    testWordId = vocabularyData[0].id;
    testWord = vocabularyData[0];
  });

  afterAll(async () => {
    // Sign out test user
    if (supabase) {
      await supabase.auth.signOut();
      console.log('Test user signed out');
    }
  });

  describe('Function Existence and Basic Structure', () => {
    test('should exist and be callable', async () => {
      const { data, error } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      // Should not have errors (function exists)
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should return correct JSON structure', async () => {
      const { data, error } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      expect(error).toBeNull();
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
  });

  describe('Options Array Validation', () => {
    test('should return exactly 4 options', async () => {
      const { data } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      expect(data.options).toHaveLength(4);
    });

    test('should include correct answer in options', async () => {
      const { data } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      expect(data.options).toContain(data.correctAnswer);
    });

    test('should have all unique options', async () => {
      const { data } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      const uniqueOptions = [...new Set(data.options)];
      expect(uniqueOptions).toHaveLength(4);
    });

    test('should have all non-empty options', async () => {
      const { data } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      data.options.forEach(option => {
        expect(option).toBeTruthy();
        expect(typeof option).toBe('string');
        expect(option.trim()).not.toBe('');
      });
    });
  });

  describe('Correct Answer Validation', () => {
    test('should return correct word and ID for given ID', async () => {
      const { data } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      expect(data.id).toBe(testWord.id.toString());
      expect(data.word).toBe(testWord.word);
      expect(data.correctAnswer).toBe(testWord.definition);
    });

    test('should have correctIndex pointing to correct answer', async () => {
      const { data } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      expect(data.correctIndex).toBeGreaterThanOrEqual(0);
      expect(data.correctIndex).toBeLessThan(4);
      expect(data.options[data.correctIndex]).toBe(data.correctAnswer);
    });
  });

  describe('Wrong Answers Validation', () => {
    test('should have 3 wrong answers from vocabulary table', async () => {
      const { data } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      // Get all vocabulary definitions
      const { data: allVocab } = await supabase
        .from('vocabulary')
        .select('definition');

      const allDefinitions = allVocab.map(v => v.definition);
      
      // Filter out the correct answer to get wrong answers
      const wrongAnswers = data.options.filter(option => option !== data.correctAnswer);
      
      expect(wrongAnswers).toHaveLength(3);
      
      // Each wrong answer should be a valid vocabulary definition
      wrongAnswers.forEach(wrongAnswer => {
        expect(allDefinitions).toContain(wrongAnswer);
      });
    });
  });

  describe('Randomization', () => {
    test('should generate different option orders for same word', async () => {
      const results = [];
      
      // Generate 5 questions for the same word
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.rpc('generatequizquestion', {
          word_id: testWordId
        });
        results.push(JSON.stringify(data.options));
      }

      // Should have at least some variation in option order
      const uniqueResults = [...new Set(results)];
      expect(uniqueResults.length).toBeGreaterThan(1);
    });

    test('should generate different wrong answers for same word', async () => {
      const wrongAnswerSets = [];
      
      // Generate 10 questions to test randomization
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.rpc('generatequizquestion', {
          word_id: testWordId
        });
        
        const wrongAnswers = data.options
          .filter(option => option !== data.correctAnswer)
          .sort(); // Sort for comparison
        
        wrongAnswerSets.push(JSON.stringify(wrongAnswers));
      }

      // Should have some variation in wrong answers
      const uniqueWrongAnswerSets = [...new Set(wrongAnswerSets)];
      expect(uniqueWrongAnswerSets.length).toBeGreaterThan(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid word ID gracefully', async () => {
      const { data, error } = await supabase.rpc('generatequizquestion', {
        word_id: 999999
      });

      // Should either return null/empty or have an error
      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toBeNull();
      }
    });

    test('should handle null word ID', async () => {
      const { data, error } = await supabase.rpc('generatequizquestion', {
        word_id: null
      });

      // Should handle null gracefully
      expect(error || data === null).toBeTruthy();
    });
  });

  describe('Performance', () => {
    test('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });
});