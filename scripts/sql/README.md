# Database Setup and Deployment Guide

This directory contains SQL scripts for setting up the vocabulary app database functions.

## Step-by-Step Deployment

### 1. Create Vocabulary Table
```sql
-- Run in Supabase SQL Editor
-- File: create_vocabulary_table.sql
```
This creates the `vocabulary` table with proper RLS policies.

### 2. Import Vocabulary Data
**Option A: Use Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → Table Editor
2. Select `vocabulary` table
3. Click "Insert" → "Import data from CSV"
4. Upload `public/vocabulary.csv`
5. Map columns: `word` → `word`, `definition` → `definition`

**Option B: Use SQL Inserts**
```sql
-- Run in Supabase SQL Editor
-- File: vocabulary_data_inserts.sql
```

### 3. Create generateQuizQuestion Function
```sql
-- Run in Supabase SQL Editor
-- File: create_generateQuizQuestion_function.sql
```

### 4. Test the Function
**Quick Test in SQL Editor:**
```sql
-- Test with valid word ID
SELECT generateQuizQuestion(1);

-- Test randomization
SELECT generateQuizQuestion(1);
SELECT generateQuizQuestion(1);

-- Test error handling
SELECT generateQuizQuestion(99999);
```

**Comprehensive Test Script:**
```bash
# Run from project root
node scripts/test-quiz-function.js
```

**Jest Test Suite:**
```bash
# Run automated tests
npm run test:db
```

## Function Specifications

### `generateQuizQuestion(word_id INTEGER)`

**Input:**
- `word_id`: Integer ID of vocabulary word

**Output:**
- JSONB object with:
  - `word`: string - The vocabulary word
  - `correctAnswer`: string - The correct definition
  - `options`: array[4] - Shuffled multiple choice options
  - `correctIndex`: number - Index (0-3) of correct answer in options array

**Error Handling:**
- Returns `NULL` for invalid word IDs
- Returns `JSONB` with error details for other failures

**Security:**
- Uses `SECURITY DEFINER` for consistent permissions
- Grants `EXECUTE` to `authenticated` users only
- Protected by RLS policies

## Verification Checklist

Before proceeding to Step 3, verify:

- [ ] Vocabulary table exists and is populated (497 words)
- [ ] `generateQuizQuestion` function exists
- [ ] Function returns proper JSONB structure
- [ ] Function handles invalid inputs gracefully
- [ ] Jest tests pass: `npm run test:db`
- [ ] Manual test passes: `node scripts/test-quiz-function.js`

## Troubleshooting

**"No vocabulary data found"**
- Make sure vocabulary table is created and populated
- Check RLS policies allow reading

**"Function does not exist"**
- Run `create_generateQuizQuestion_function.sql`
- Check function name spelling (case sensitive)

**"Insufficient vocabulary data"**
- Need at least 4 vocabulary words total
- Check vocabulary table has enough entries

**Permission errors**
- Verify user has `authenticated` role
- Check function grants and RLS policies