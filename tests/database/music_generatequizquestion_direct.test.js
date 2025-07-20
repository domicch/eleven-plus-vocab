const { createClient } = require('@supabase/supabase-js');

// Setup
let supabase;
let testUser;
let availableQuestionIds = [];

beforeAll(async () => {
  console.log('Setting up database tests...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
  
  // Sign in test user
  console.log('Attempting to sign in test user: test@example.com');
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
  
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  
  if (signInError) {
    console.error('Failed to sign in test user:', signInError.message);
    throw signInError;
  }
  
  testUser = authData.user;
  console.log('Test user signed in successfully');
  
  // Get available question IDs for testing
  const { data: questions } = await supabase
    .from('music_questions')
    .select('id');
    
  availableQuestionIds = questions?.map(q => q.id) || [];
  console.log('Available question IDs for testing:', availableQuestionIds);
  
  if (availableQuestionIds.length === 0) {
    throw new Error('No music questions found in database. Please import test data first.');
  }
});

afterAll(async () => {
  if (supabase && testUser) {
    console.log('Test user signed out');
    await supabase.auth.signOut();
  }
});

describe('music_generatequizquestion_direct Database Function', () => {
  
  describe('Function Existence and Basic Structure', () => {
    test('should exist and be callable', async () => {
      const testQuestionId = availableQuestionIds[0];
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
    
    test('should return correct structure for valid question ID', async () => {
      const testQuestionId = availableQuestionIds[0];
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      expect(error).toBeNull();
      expect(data).toHaveProperty('question_id');
      expect(data).toHaveProperty('question_text');
      expect(data).toHaveProperty('options');
      expect(data).toHaveProperty('correct_index');
      expect(data).toHaveProperty('question_type');
      expect(data.question_type).toBe('music_facts');
      expect(typeof data.question_id).toBe('number');
      expect(typeof data.question_text).toBe('string');
      expect(Array.isArray(data.options)).toBe(true);
      expect(typeof data.correct_index).toBe('number');
    });
    
    test('should return null for non-existent question ID', async () => {
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: 999999
      });
      
      expect(error).toBeNull();
      expect(data).toBeNull();
    });
  });
  
  describe('Question Content Validation', () => {
    test('should return matching question ID', async () => {
      const testQuestionId = availableQuestionIds[0];
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      expect(error).toBeNull();
      expect(data.question_id).toBe(testQuestionId);
    });
    
    test('should return non-empty question text', async () => {
      const testQuestionId = availableQuestionIds[0];
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      expect(error).toBeNull();
      expect(data.question_text).toBeTruthy();
      expect(data.question_text.length).toBeGreaterThan(0);
    });
    
    test('should return appropriate number of options', async () => {
      const testQuestionId = availableQuestionIds[0];
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      expect(error).toBeNull();
      expect(data.options.length).toBeGreaterThanOrEqual(2); // At least 2 options for a meaningful question
      
      // All options should be non-empty strings
      data.options.forEach(option => {
        expect(typeof option).toBe('string');
        expect(option.length).toBeGreaterThan(0);
      });
    });
    
    test('should have valid correct index', async () => {
      const testQuestionId = availableQuestionIds[0];
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      expect(error).toBeNull();
      expect(data.correct_index).toBeGreaterThanOrEqual(0);
      expect(data.correct_index).toBeLessThan(data.options.length);
      
      // The option at correct_index should exist and be non-empty
      expect(data.options[data.correct_index]).toBeTruthy();
    });
  });
  
  describe('Answer Shuffling', () => {
    test('should randomize option order', async () => {
      const testQuestionId = availableQuestionIds[0];
      const results = [];
      
      // Generate the same question multiple times
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.rpc('music_generatequizquestion_direct', {
          target_question_id: testQuestionId
        });
        results.push(data.options);
      }
      
      // Check that not all results are identical (options are shuffled)
      const firstResult = JSON.stringify(results[0]);
      const allSame = results.every(result => JSON.stringify(result) === firstResult);
      
      expect(allSame).toBe(false);
    });
    
    test('should maintain consistent correct answer across shuffles', async () => {
      const testQuestionId = availableQuestionIds[0];
      
      // Get the correct answer by checking what's marked as correct in the database
      const { data: correctAnswerData } = await supabase
        .from('music_answers')
        .select('answer')
        .eq('question_id', testQuestionId)
        .eq('is_correct', true)
        .single();
      
      const expectedCorrectAnswer = correctAnswerData.answer;
      
      // Generate question multiple times and verify correct answer consistency
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.rpc('music_generatequizquestion_direct', {
          target_question_id: testQuestionId
        });
        
        expect(data.options[data.correct_index]).toBe(expectedCorrectAnswer);
      }
    });
  });
  
  describe('Multiple Question Support', () => {
    test('should work with all available question IDs', async () => {
      for (const questionId of availableQuestionIds.slice(0, 3)) { // Test first 3 to avoid long test times
        const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
          target_question_id: questionId
        });
        
        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.question_id).toBe(questionId);
        expect(data.question_type).toBe('music_facts');
        expect(data.options).toBeDefined();
        expect(data.correct_index).toBeGreaterThanOrEqual(0);
        expect(data.correct_index).toBeLessThan(data.options.length);
      }
    });
  });
  
  describe('Input Validation', () => {
    test('should handle null question ID gracefully', async () => {
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: null
      });
      
      expect(error).toBeNull();
      expect(data).toBeNull();
    });
    
    test('should handle negative question ID gracefully', async () => {
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: -1
      });
      
      expect(error).toBeNull();
      expect(data).toBeNull();
    });
  });
  
  describe('Data Integrity', () => {
    test('should always include the correct answer exactly once', async () => {
      const testQuestionId = availableQuestionIds[0];
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      expect(error).toBeNull();
      const correctAnswer = data.options[data.correct_index];
      
      // Count occurrences of correct answer
      const occurrences = data.options.filter(option => option === correctAnswer).length;
      expect(occurrences).toBe(1);
    });
    
    test('should not include duplicate options', async () => {
      const testQuestionId = availableQuestionIds[0];
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      expect(error).toBeNull();
      const uniqueOptions = new Set(data.options);
      expect(uniqueOptions.size).toBe(data.options.length);
    });
    
    test('should have exactly one correct answer per question in database', async () => {
      for (const questionId of availableQuestionIds.slice(0, 3)) {
        const { data: correctAnswers } = await supabase
          .from('music_answers')
          .select('*')
          .eq('question_id', questionId)
          .eq('is_correct', true);
        
        expect(correctAnswers).toHaveLength(1);
      }
    });
  });
  
  describe('Performance', () => {
    test('should complete within reasonable time', async () => {
      const testQuestionId = availableQuestionIds[0];
      const startTime = Date.now();
      
      const { data, error } = await supabase.rpc('music_generatequizquestion_direct', {
        target_question_id: testQuestionId
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});