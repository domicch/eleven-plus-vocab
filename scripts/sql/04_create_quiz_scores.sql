CREATE TABLE quiz_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE quiz_scores ENABLE ROW LEVEL SECURITY;

  -- Policy: Users can only see their own scores
  CREATE POLICY "Users can view their own quiz scores" ON quiz_scores
    FOR SELECT USING (auth.uid() = user_id);

  -- Policy: Users can insert their own scores
  CREATE POLICY "Users can insert their own quiz scores" ON quiz_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);