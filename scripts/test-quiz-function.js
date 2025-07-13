// Quick manual test script for generatequizquestion function
// Run this after deploying the function to Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testGenerateQuizQuestion() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('🧪 Testing generatequizquestion function...\n');

  try {
    // Test 1: Get a sample word ID
    console.log('1️⃣ Getting sample vocabulary...');
    const { data: vocab, error: vocabError } = await supabase
      .from('vocabulary')
      .select('id, word, definition')
      .limit(5);

    if (vocabError) {
      console.error('❌ Error fetching vocabulary:', vocabError);
      return;
    }

    if (!vocab || vocab.length === 0) {
      console.error('❌ No vocabulary found. Make sure vocabulary table is populated.');
      return;
    }

    console.log(`✅ Found ${vocab.length} vocabulary words`);
    console.log(`📝 Sample words: ${vocab.map(v => v.word).join(', ')}\n`);

    // Test 2: Generate quiz question
    const testWordId = vocab[0].id;
    const testWord = vocab[0];

    console.log(`2️⃣ Generating quiz for word: "${testWord.word}"`);
    console.log(`   Definition: "${testWord.definition}"\n`);

    const { data: quizData, error: quizError } = await supabase.rpc('generatequizquestion', {
      word_id: testWordId
    });

    if (quizError) {
      console.error('❌ Error calling generatequizquestion:', quizError);
      return;
    }

    if (!quizData) {
      console.error('❌ Function returned null/undefined');
      return;
    }

    if (quizData.error) {
      console.error('❌ Function returned error:', quizData.error);
      return;
    }

    console.log('✅ Quiz question generated successfully!');
    console.log('📋 Quiz data:');
    console.log(`   Word: "${quizData.word}"`);
    console.log(`   Correct Answer: "${quizData.correctAnswer}"`);
    console.log(`   Correct Index: ${quizData.correctIndex}`);
    console.log('   Options:');
    quizData.options.forEach((option, index) => {
      const isCorrect = index === quizData.correctIndex;
      console.log(`     ${index}: ${option} ${isCorrect ? '✅' : ''}`);
    });

    // Test 3: Validate results
    console.log('\n3️⃣ Validating results...');
    
    const validations = [
      { test: 'Word matches', pass: quizData.word === testWord.word },
      { test: 'Correct answer matches', pass: quizData.correctAnswer === testWord.definition },
      { test: 'Has 4 options', pass: quizData.options.length === 4 },
      { test: 'Correct answer in options', pass: quizData.options.includes(quizData.correctAnswer) },
      { test: 'Correct index points to right answer', pass: quizData.options[quizData.correctIndex] === quizData.correctAnswer },
      { test: 'All options unique', pass: new Set(quizData.options).size === 4 }
    ];

    validations.forEach(({ test, pass }) => {
      console.log(`   ${pass ? '✅' : '❌'} ${test}`);
    });

    const allPassed = validations.every(v => v.pass);
    console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall: ${allPassed ? 'All validations passed!' : 'Some validations failed'}`);

    // Test 4: Test randomization
    console.log('\n4️⃣ Testing randomization (generating 3 more questions)...');
    
    for (let i = 1; i <= 3; i++) {
      const { data: randomQuiz } = await supabase.rpc('generatequizquestion', {
        word_id: testWordId
      });
      
      if (randomQuiz && !randomQuiz.error) {
        console.log(`   Quiz ${i}: [${randomQuiz.options.map((_, idx) => idx === randomQuiz.correctIndex ? '✅' : '⭕').join('')}]`);
      }
    }

    // Test 5: Error handling
    console.log('\n5️⃣ Testing error handling...');
    
    const { data: invalidResult } = await supabase.rpc('generatequizquestion', {
      word_id: 999999
    });
    
    console.log(`   Invalid ID test: ${invalidResult === null ? '✅ Returned null' : '❌ Did not return null'}`);

    console.log('\n🏁 Testing complete!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testGenerateQuizQuestion();