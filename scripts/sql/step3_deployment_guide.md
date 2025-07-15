# Step 3 Deployment Guide

Deploy the quiz table and generatequiz function to complete Step 3.

## Deployment Order

### 1. Create Quiz Table
```sql
-- Copy and run in Supabase SQL Editor
-- File: scripts/sql/create_quiz_table.sql
```

### 2. Create generatequiz Function  
```sql
-- Copy and run in Supabase SQL Editor
-- File: scripts/sql/create_generateQuiz_function.sql
```

## Verification Steps

### Test Quiz Table
```sql
-- Check table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quiz' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test RLS policies (should only see own quizzes)
SELECT * FROM quiz LIMIT 1;
```

### Test generatequiz Function
```sql
-- Check function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'generatequiz' AND routine_schema = 'public';

-- Test function with your user ID (replace with actual UUID)
SELECT generatequiz('your-user-id-here'::UUID, 3);
```

### Quick Integration Test
```sql
-- Generate a test quiz and verify it's stored
WITH test_quiz AS (
  SELECT generatequiz(auth.uid(), 5) as result
)
SELECT 
  result,
  (SELECT COUNT(*) FROM quiz WHERE user_id = auth.uid()) as quiz_count
FROM test_quiz;
```

## Expected Results

After successful deployment:

✅ **Quiz table created** with proper schema and RLS policies  
✅ **generatequiz function created** and callable by authenticated users  
✅ **Function generates complete quizzes** with unique questions  
✅ **Integration working** - function uses generatequizquestion internally  
✅ **Security in place** - users can only access their own quizzes  

## Run Tests

After deployment, verify everything works:

```bash
# Test the quiz functionality
npm run test:quiz

# Test all database functions
npm run test:db
```

All tests should pass if deployment was successful!

## Troubleshooting

**"relation 'quiz' does not exist"**
- Run `create_quiz_table.sql` first

**"function generatequiz does not exist"**  
- Run `create_generateQuiz_function.sql`
- Check function name is lowercase

**"insufficient vocabulary data"**
- Ensure vocabulary table has enough words (need at least as many as question_count)

**RLS permission errors**
- Ensure you're authenticated when testing
- Check user ID matches auth.uid()

**Function returns error**
- Check vocabulary table is populated
- Verify generatequizquestion function exists and works
- Check parameters are valid (user_id UUID, question_count > 0)