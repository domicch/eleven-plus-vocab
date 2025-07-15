# Database Function Tests

This directory contains Jest tests for Supabase database functions.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   Make sure you have `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Test user credentials (optional - will create if not exists)
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=testpassword123
   ```

3. **Database setup:**
   - Create vocabulary table using `scripts/sql/create_vocabulary_table.sql`
   - Import vocabulary data using `scripts/sql/vocabulary_data_inserts.sql`
   - Implement the database functions being tested

## Running Tests

```bash
# Run all tests
npm test

# Run only database tests
npm run test:db

# Run specific test suites
npm run test:quiz-question  # generatequizquestion function tests
npm run test:quiz          # generatequiz function and quiz table tests

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx jest tests/database/generateQuizQuestion.test.js
npx jest tests/database/generateQuiz.test.js
```

## Test Structure

### `generateQuizQuestion.test.js`
Tests for the `generatequizquestion(word_id)` database function:

- **Function Existence**: Verifies function exists and is callable
- **Structure Validation**: Checks return format (word, correctAnswer, options, correctIndex)
- **Options Array**: Validates 4 unique, non-empty options including correct answer
- **Correct Answer**: Ensures correct word/definition mapping and index
- **Wrong Answers**: Verifies 3 wrong answers come from vocabulary table
- **Randomization**: Tests option shuffling and wrong answer variation
- **Error Handling**: Tests invalid inputs (null, non-existent IDs)
- **Performance**: Ensures reasonable response times

### `generateQuiz.test.js`  
Tests for the `generatequiz(user_id, question_count)` database function and `quiz` table:

- **Table Structure**: Validates quiz table schema and RLS policies
- **Function Existence**: Verifies generatequiz function exists and is callable
- **Quiz Generation**: Tests creating complete quiz sessions with multiple questions
- **Question Structure**: Validates each question has correct format from generatequizquestion
- **Uniqueness**: Ensures no duplicate words in same quiz
- **Error Handling**: Tests invalid inputs (null, invalid counts, wrong user IDs)
- **Integration**: Verifies generatequiz uses generatequizquestion internally
- **Performance**: Ensures quiz generation completes within reasonable time

## Test-Driven Development Flow

1. **Write tests first** (already done for `generateQuizQuestion`)
2. **Run tests** (should fail initially):
   ```bash
   npm run test:db
   ```
3. **Implement the database function** in Supabase
4. **Run tests again** to verify implementation
5. **Refactor** function if needed based on test results

## Expected Test Results (Before Implementation)

All tests should **FAIL** initially because the `generateQuizQuestion` function doesn't exist yet. After implementing the function in Supabase, all tests should **PASS**.

## Notes

- Tests require a populated vocabulary table
- Tests authenticate with a test user (respects RLS policies)
- Test user is created automatically if it doesn't exist
- Each test is independent and doesn't modify database state
- Tests include performance checks (< 2 seconds per function call)
- Test user is signed out after all tests complete