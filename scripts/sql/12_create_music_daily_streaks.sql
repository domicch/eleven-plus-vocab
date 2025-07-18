-- Step 12: Create the music_daily_streaks table
-- This tracks daily completion streaks for music theory vocabulary

-- Create the music_daily_streaks table
CREATE TABLE music_daily_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Add Row Level Security (RLS)
ALTER TABLE music_daily_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own music daily streaks" ON music_daily_streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own music daily streaks" ON music_daily_streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own music daily streaks" ON music_daily_streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- Create an index for better performance
CREATE INDEX idx_music_daily_streaks_user_date ON music_daily_streaks(user_id, date DESC);