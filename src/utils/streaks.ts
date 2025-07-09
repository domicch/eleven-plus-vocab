import { supabase } from '@/lib/supabase';

export interface DailyStreak {
  id: string;
  user_id: string;
  date: string;
  completed: boolean;
  created_at: string;
}

/**
 * Gets today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Checks if the user has completed today's quiz (80% or higher)
 */
export async function checkTodayCompletion(userId: string): Promise<boolean> {
  if (!supabase) return false;

  const today = getTodayDate();
  
  try {
    const { data, error } = await supabase
      .from('daily_streaks')
      .select('completed')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking today completion:', error);
      return false;
    }

    return data?.completed || false;
  } catch (error) {
    console.error('Error checking today completion:', error);
    return false;
  }
}

/**
 * Marks today as completed (when user passes quiz with 80%+)
 */
export async function markTodayCompleted(userId: string): Promise<void> {
  if (!supabase) return;

  const today = getTodayDate();
  
  try {
    const { error } = await supabase
      .from('daily_streaks')
      .upsert({
        user_id: userId,
        date: today,
        completed: true
      }, {
        onConflict: 'user_id,date'
      });

    if (error) {
      console.error('Error marking today completed:', error);
    }
  } catch (error) {
    console.error('Error marking today completed:', error);
  }
}

/**
 * Calculates the current streak for a user
 */
export async function calculateStreak(userId: string): Promise<number> {
  if (!supabase) return 0;

  try {
    const { data, error } = await supabase
      .from('daily_streaks')
      .select('date, completed')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    let streak = 0;
    const today = getTodayDate();
    const currentDate = new Date(today);

    // Check each day backwards from today
    for (let i = 0; i < data.length; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = data.find(d => d.date === dateStr);

      if (dayData && dayData.completed) {
        streak++;
      } else {
        // If this is today and no data exists, don't break the streak yet
        if (dateStr === today) {
          // Continue to yesterday
        } else {
          // Streak is broken
          break;
        }
      }

      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}

/**
 * Gets the user's streak data for display
 */
export async function getStreakData(userId: string) {
  if (!supabase) return { currentStreak: 0, todayCompleted: false };

  try {
    const [currentStreak, todayCompleted] = await Promise.all([
      calculateStreak(userId),
      checkTodayCompletion(userId)
    ]);

    return {
      currentStreak,
      todayCompleted
    };
  } catch (error) {
    console.error('Error getting streak data:', error);
    return { currentStreak: 0, todayCompleted: false };
  }
}