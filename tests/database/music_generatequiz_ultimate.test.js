// Tests for music_generatequiz_ultimate database function
const { createClient } = require('@supabase/supabase-js');

describe('music_generatequiz_ultimate Database Function', () => {
  let supabase;
  let testUser;
  let totalMusicVocabularyCount;
  let totalMusicQuestionsCount;
  let allMusicVocabularyIds;

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

    // Get all music vocabulary IDs and count
    const { data: musicVocabData, error: vocabError } = await supabase
      .from('music_vocabulary')
      .select('id')
      .order('id');

    if (vocabError || !musicVocabData) {
      throw new Error('No music vocabulary data found. Make sure music_vocabulary table is populated.');
    }
    
    allMusicVocabularyIds = musicVocabData.map(v => v.id);
    totalMusicVocabularyCount = allMusicVocabularyIds.length;
    console.log(`Total music vocabulary count: ${totalMusicVocabularyCount}`);

    // Get music questions count (may be 0)
    const { count: musicQuestionsCount, error: questionsError } = await supabase
      .from('music_questions')
      .select('*', { count: 'exact', head: true });

    totalMusicQuestionsCount = questionsError ? 0 : (musicQuestionsCount || 0);
    console.log(`Total music questions count: ${totalMusicQuestionsCount}`);
    
    if (totalMusicVocabularyCount < 10) {
      throw new Error('Need at least 10 music vocabulary words for ultimate quiz testing.');
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

  describe('music_generatequiz_ultimate Function', () => {
    beforeEach(async () => {
      // Clean up any existing quizzes for test user before each test
      await supabase
        .from('music_quiz')
        .delete()
        .eq('user_id', testUser.id);
    });

    test('should exist and be callable with only 2 parameters', async () => {
      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: allMusicVocabularyIds.slice(0, 5)
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should return quiz ID when successful', async () => {
      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: allMusicVocabularyIds.slice(0, 10)
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('quiz_id');
      expect(typeof data.quiz_id).toBe('string');

      // Verify quiz was created in database
      const { data: quizData, error: quizError } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizError).toBeNull();
      expect(quizData).toBeDefined();
      expect(quizData.user_id).toBe(testUser.id);

      // Clean up
      await supabase
        .from('music_quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should set mode to "ultimate"', async () => {
      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: allMusicVocabularyIds.slice(0, 5)
      });

      expect(error).toBeNull();

      // Check the generated quiz has ultimate mode
      const { data: quizData, error: quizError } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizError).toBeNull();
      expect(quizData.mode).toBe('ultimate');

      // Clean up
      await supabase
        .from('music_quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should generate questions using ALL available data', async () => {
      const imageWordIds = allMusicVocabularyIds.slice(0, 10);

      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: imageWordIds
      });

      expect(error).toBeNull();

      // Check the generated quiz contains all available data
      const { data: quizData, error: quizError } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      expect(quizError).toBeNull();
      
      const expectedTotalQuestions = totalMusicVocabularyCount + totalMusicQuestionsCount;
      expect(quizData.total_questions).toBe(expectedTotalQuestions);
      expect(Array.isArray(quizData.questions)).toBe(true);
      expect(quizData.questions).toHaveLength(expectedTotalQuestions);

      // Clean up
      await supabase
        .from('music_quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should generate image_to_word questions for words with images, word_to_definition for others', async () => {
      const imageWordIds = allMusicVocabularyIds.slice(0, 5); // First 5 words have images
      const nonImageWordIds = allMusicVocabularyIds.slice(5); // Rest don't have images

      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: imageWordIds
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Separate vocabulary questions from music fact questions
      const vocabularyQuestions = quizData.questions.filter(q => 
        q.question_type === 'word_to_definition' || q.question_type === 'image_to_word'
      );
      const musicFactQuestions = quizData.questions.filter(q => q.question_type === 'music_fact');

      expect(vocabularyQuestions.length).toBe(totalMusicVocabularyCount);
      expect(musicFactQuestions.length).toBe(totalMusicQuestionsCount);

      // Check image-to-word questions
      const imageToWordQuestions = vocabularyQuestions.filter(q => q.question_type === 'image_to_word');
      const wordToDefQuestions = vocabularyQuestions.filter(q => q.question_type === 'word_to_definition');

      expect(imageToWordQuestions.length).toBe(imageWordIds.length);
      expect(wordToDefQuestions.length).toBe(nonImageWordIds.length);

      // Verify image-to-word questions use the correct word IDs
      const imageQuestionWordIds = imageToWordQuestions.map(q => q.word_id).sort();
      expect(imageQuestionWordIds).toEqual(imageWordIds.sort());

      // Verify word-to-definition questions use the correct word IDs
      const wordDefQuestionWordIds = wordToDefQuestions.map(q => q.word_id).sort();
      expect(wordDefQuestionWordIds).toEqual(nonImageWordIds.sort());

      // Clean up
      await supabase
        .from('music_quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should always include ALL music_questions as music_fact questions', async () => {
      const imageWordIds = allMusicVocabularyIds.slice(0, 3);

      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: imageWordIds
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Count question types
      const questionTypes = quizData.questions.map(q => q.question_type);
      const musicFactCount = questionTypes.filter(type => type === 'music_fact').length;

      // Should have exactly as many music_fact questions as there are music_questions in the database
      expect(musicFactCount).toBe(totalMusicQuestionsCount);

      // If there are music facts, verify they have the correct structure
      if (totalMusicQuestionsCount > 0) {
        const musicFactQuestions = quizData.questions.filter(q => q.question_type === 'music_fact');
        
        musicFactQuestions.forEach(question => {
          expect(question).toHaveProperty('music_question_id');
          expect(typeof question.music_question_id).toBe('number');
          expect(question.word_id).toBeNull(); // Music facts don't have word_id
        });

        // Verify no duplicate music_question_ids
        const musicQuestionIds = musicFactQuestions.map(q => q.music_question_id);
        const uniqueMusicQuestionIds = [...new Set(musicQuestionIds)];
        expect(uniqueMusicQuestionIds.length).toBe(musicQuestionIds.length);
      }

      // Clean up
      await supabase
        .from('music_quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should work when no image_available_word_ids are provided (all word_to_definition)', async () => {
      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: null
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // All vocabulary questions should be word_to_definition
      const vocabularyQuestions = quizData.questions.filter(q => 
        q.question_type === 'word_to_definition' || q.question_type === 'image_to_word'
      );

      const imageToWordQuestions = vocabularyQuestions.filter(q => q.question_type === 'image_to_word');
      const wordToDefQuestions = vocabularyQuestions.filter(q => q.question_type === 'word_to_definition');

      expect(imageToWordQuestions.length).toBe(0);
      expect(wordToDefQuestions.length).toBe(totalMusicVocabularyCount);

      // Clean up
      await supabase
        .from('music_quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should work when all vocabulary words have images', async () => {
      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: allMusicVocabularyIds
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // All vocabulary questions should be image_to_word
      const vocabularyQuestions = quizData.questions.filter(q => 
        q.question_type === 'word_to_definition' || q.question_type === 'image_to_word'
      );

      const imageToWordQuestions = vocabularyQuestions.filter(q => q.question_type === 'image_to_word');
      const wordToDefQuestions = vocabularyQuestions.filter(q => q.question_type === 'word_to_definition');

      expect(imageToWordQuestions.length).toBe(totalMusicVocabularyCount);
      expect(wordToDefQuestions.length).toBe(0);

      // Clean up
      await supabase
        .from('music_quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should use all available music vocabulary words exactly once', async () => {
      const imageWordIds = allMusicVocabularyIds.slice(0, Math.floor(allMusicVocabularyIds.length / 2));

      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: imageWordIds
      });

      expect(error).toBeNull();

      const { data: quizData } = await supabase
        .from('music_quiz')
        .select('*')
        .eq('id', data.quiz_id)
        .single();

      // Extract word IDs from vocabulary questions
      const vocabularyQuestions = quizData.questions.filter(q => 
        q.question_type === 'word_to_definition' || q.question_type === 'image_to_word'
      );
      const quizWordIds = vocabularyQuestions.map(q => q.word_id).sort();

      // Should use all vocabulary word IDs exactly once
      expect(quizWordIds).toEqual(allMusicVocabularyIds.sort());

      // Verify no duplicates
      const uniqueWordIds = [...new Set(quizWordIds)];
      expect(uniqueWordIds.length).toBe(quizWordIds.length);

      // Clean up
      await supabase
        .from('music_quiz')
        .delete()
        .eq('id', data.quiz_id);
    });

    test('should prevent duplicate active ultimate quizzes', async () => {
      // Create first ultimate quiz
      const { data: firstQuiz, error: firstError } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: allMusicVocabularyIds.slice(0, 5)
      });

      expect(firstError).toBeNull();
      expect(firstQuiz).toHaveProperty('quiz_id');

      // Try to create second ultimate quiz - should fail
      const { data: secondQuiz, error: secondError } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: allMusicVocabularyIds.slice(0, 5)
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
        .from('music_quiz')
        .delete()
        .eq('id', firstQuiz.quiz_id);
    });
  });

  describe('Performance', () => {
    test('should complete within 5 seconds maximum', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase.rpc('music_generatequiz_ultimate', {
        user_id: testUser.id,
        image_available_word_ids: allMusicVocabularyIds.slice(0, 10)
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Ultimate quiz must complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      const totalQuestions = totalMusicVocabularyCount + totalMusicQuestionsCount;
      console.log(`Music ultimate quiz generation took ${duration}ms for ${totalQuestions} questions`);

      // Clean up
      if (data && data.quiz_id) {
        await supabase
          .from('music_quiz')
          .delete()
          .eq('id', data.quiz_id);
      }
    });
  });
});