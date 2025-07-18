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
    test('should exist and be callable', async () => {
      const { data, error } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
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

      expect(data).toHaveProperty('word');
      expect(data).toHaveProperty('correctAnswer');
      expect(data).toHaveProperty('options');
      expect(data).toHaveProperty('correctIndex');
    });

    test('should return correct word and answer', async () => {
      const { data } = await supabase.rpc('music_generatequizquestion', {
        word_id: testWordId
      });

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