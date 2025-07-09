-- Create the daily_streaks table
CREATE TABLE daily_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Add Row Level Security (RLS)
ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own daily streaks" ON daily_streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily streaks" ON daily_streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily streaks" ON daily_streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- Create an index for better performance
CREATE INDEX idx_daily_streaks_user_date ON daily_streaks(user_id, date DESC);