'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStreakData } from '@/utils/streaks';
import type { User } from '@supabase/supabase-js';

interface StreakCounterProps {
  user: User | null;
}

export default function StreakCounter({ user }: StreakCounterProps) {
  const [streakData, setStreakData] = useState({ currentStreak: 0, todayCompleted: false });
  const [loading, setLoading] = useState(true);

  const loadStreakData = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getStreakData(user.id);
      setStreakData(data);
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStreakData();
    } else {
      setLoading(false);
    }
  }, [user, loadStreakData]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm">Loading streak...</span>
      </div>
    );
  }

  const getStreakDisplay = () => {
    if (streakData.currentStreak === 0) {
      return {
        icon: '🔥',
        text: 'Start your streak!',
        color: 'text-gray-600'
      };
    }

    return {
      icon: '🔥',
      text: `${streakData.currentStreak} day${streakData.currentStreak !== 1 ? 's' : ''}`,
      color: streakData.currentStreak >= 7 ? 'text-orange-600' : 
             streakData.currentStreak >= 3 ? 'text-yellow-600' : 'text-blue-600'
    };
  };

  const display = getStreakDisplay();

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm">
      <span className="text-xl">{display.icon}</span>
      <div className="flex flex-col">
        <span className={`font-semibold ${display.color}`}>
          {display.text}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Today:</span>
          <span className="text-sm">
            {streakData.todayCompleted ? '⭐' : '⚪'}
          </span>
        </div>
      </div>
    </div>
  );
}