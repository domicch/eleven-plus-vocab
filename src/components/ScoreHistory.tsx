'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface QuizScore {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  mode: 'normal' | 'ultimate';
}

interface ScoreHistoryProps {
  user: User | null;
  category: '11plus' | 'music';
}

export default function ScoreHistory({ user, category }: ScoreHistoryProps) {
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'all' | 'normal' | 'ultimate'>('all');

  const loadScoreHistory = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      const tableName = category === '11plus' ? 'quiz' : 'music_quiz';
      let query = supabase
        .from(tableName)
        .select('id, score, total_questions, completed_at, mode')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('score', 'is', null)
        .order('completed_at', { ascending: false });

      // Filter by mode if not showing all
      if (selectedMode !== 'all') {
        query = query.eq('mode', selectedMode);
      }

      const { data, error } = await query.limit(20); // Show more scores since we have filtering

      if (error) {
        console.error('Error loading score history:', error);
      } else {
        setScores(data || []);
      }
    } catch (error) {
      console.error('Error loading score history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, category, selectedMode]);

  useEffect(() => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    loadScoreHistory();
  }, [user, loadScoreHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return '🎉';
    if (percentage >= 60) return '👍';
    return '📚';
  };

  const getModeColor = (mode: 'normal' | 'ultimate') => {
    return mode === 'ultimate' ? 'text-red-600 bg-red-100' : 'text-purple-600 bg-purple-100';
  };

  const getModeIcon = (mode: 'normal' | 'ultimate') => {
    return mode === 'ultimate' ? '🔥' : '🧠';
  };

  if (!user) {
    return (
      <div className="text-center p-6 bg-gray-100 rounded-lg">
        <p className="text-gray-600">
          Sign in to view your quiz score history!
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading your scores...</span>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow-md">
        <div className="text-4xl mb-2">📊</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          No Quiz Scores Yet
        </h3>
        <p className="text-gray-600">
          Take your first quiz to start tracking your progress!
        </p>
      </div>
    );
  }

  // Filter scores for statistics
  const filteredScores = selectedMode === 'all' ? scores : scores.filter(s => s.mode === selectedMode);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          📊 Your Quiz History
        </h3>
        
        {/* Mode Filter Buttons */}
        <div className="flex gap-2">
          {(['all', 'normal', 'ultimate'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedMode === mode
                  ? mode === 'ultimate' 
                    ? 'bg-red-600 text-white'
                    : mode === 'normal'
                    ? 'bg-purple-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'ultimate' ? '🔥 Ultimate' : '🧠 Normal'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Summary Stats */}
      {filteredScores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{filteredScores.length}</div>
            <div className="text-sm text-gray-600">
              {selectedMode === 'all' ? 'Total Quizzes' : `${selectedMode === 'ultimate' ? 'Ultimate' : 'Normal'} Quizzes`}
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {Math.round((filteredScores.reduce((sum, score) => sum + (score.score / score.total_questions), 0) / filteredScores.length) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {Math.max(...filteredScores.map(s => Math.round((s.score / s.total_questions) * 100)))}%
            </div>
            <div className="text-sm text-gray-600">Best Score</div>
          </div>
        </div>
      )}

      {/* Score List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700">Recent Scores</h4>
        {filteredScores.length === 0 ? (
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-gray-600">
              No {selectedMode === 'all' ? '' : selectedMode} quiz scores yet.
              {selectedMode !== 'all' && ' Try a different filter or take some quizzes!'}
            </p>
          </div>
        ) : (
          filteredScores.map((scoreEntry) => (
            <div
              key={scoreEntry.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {getScoreIcon(scoreEntry.score, scoreEntry.total_questions)}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`font-semibold ${getScoreColor(scoreEntry.score, scoreEntry.total_questions)}`}>
                      {scoreEntry.score}/{scoreEntry.total_questions}
                      <span className="text-sm text-gray-500 ml-2">
                        ({Math.round((scoreEntry.score / scoreEntry.total_questions) * 100)}%)
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getModeColor(scoreEntry.mode)}`}>
                      {getModeIcon(scoreEntry.mode)} {scoreEntry.mode === 'ultimate' ? 'Ultimate' : 'Normal'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(scoreEntry.completed_at)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}