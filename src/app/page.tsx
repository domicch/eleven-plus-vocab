'use client';

import { useState, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { loadVocabulary, getRandomGreetingImage } from '@/utils/vocabulary';
import RevisionMode from '@/components/RevisionMode';
import QuizMode from '@/components/QuizMode';
import Auth from '@/components/Auth';
import ScoreHistory from '@/components/ScoreHistory';
import StreakCounter from '@/components/StreakCounter';
import CategorySelection from '@/components/CategorySelection';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import Image from 'next/image';

type Mode = 'category' | 'menu' | 'revision' | 'quiz';
type Category = '11plus' | 'music';

export default function Home() {
  const [mode, setMode] = useState<Mode>('category');
  const [category, setCategory] = useState<Category | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [greetingImage, setGreetingImage] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadWords = async () => {
      try {
        // Load vocabulary based on selected category
        if (category) {
          const words = await loadVocabulary(category);
          setVocabulary(words);
        }
        
        // Load random greeting image
        const randomGreeting = await getRandomGreetingImage();
        setGreetingImage(randomGreeting);
      } catch (error) {
        console.error('Failed to load vocabulary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWords();
  }, [category]);

  // Get current user
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleCategorySelect = (selectedCategory: Category) => {
    setCategory(selectedCategory);
    setMode('menu');
  };

  const handleBackToCategories = () => {
    setCategory(null);
    setMode('category');
  };

  if (loading && category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case 'category':
        return <CategorySelection onCategorySelect={handleCategorySelect} greetingImage={greetingImage} />;
      case 'revision':
        return <RevisionMode vocabulary={vocabulary} category={category || '11plus'} />;
      case 'quiz':
        return <QuizMode vocabulary={vocabulary} category={category || '11plus'} />;
      default:
        return (
          <div className="max-w-4xl mx-auto p-6 text-center">
            {/* Title and Category Info */}
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-gray-800 mb-4">
                Wocab
              </h1>
              <div className="flex items-center justify-center gap-4">
                <div className={`px-4 py-2 rounded-full text-white font-semibold ${
                  category === '11plus' ? 'bg-purple-600' : 'bg-blue-600'
                }`}>
                  {category === '11plus' ? '11+ Exam' : 'Music Theory'}
                </div>
                <button
                  onClick={handleBackToCategories}
                  className="px-4 py-2 rounded-full border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
                >
                  Switch Category
                </button>
              </div>
            </div>

            {/* Streak Counter */}
            {user && (
              <div className="mb-8 flex justify-center">
                <StreakCounter user={user} category={category || '11plus'} />
              </div>
            )}
            
            {/* Greeting Section with Dog Avatar */}
            {greetingImage && (
              <div className="mb-8 flex justify-center items-center gap-6">
                {/* Dog Image - No circular cropping */}
                <div className="flex-shrink-0">
                  <Image
                    src={greetingImage}
                    alt="Shiba Inu mascot"
                    width={128}
                    height={128}
                    className="object-contain"
                  />
                </div>
                
                {/* Speech Bubble - To the right of dog */}
                <div className="relative bg-white rounded-2xl shadow-lg p-4 max-w-xs">
                  <p className="text-lg font-semibold text-gray-800">
                    Wo Wo! Welcome to Wocab! I&apos;m Dale. Let&apos;s learn some words together!
                  </p>
                  {/* Speech bubble tail pointing left to dog */}
                  <div className="absolute left-[-8px] top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white"></div>
                </div>
              </div>
            )}
            
            <div className="mb-8">
              <p className="text-xl text-gray-600 mb-2">
                Master {vocabulary.length} essential words for {category === '11plus' ? 'your 11+ exam' : 'music theory'}
              </p>
              <p className="text-lg text-gray-500">
                Choose a learning mode to get started
              </p>
            </div>

            {/* Authentication Section */}
            <div className="mb-8">
              <Auth />
            </div>

            {/* Score History Section (only for logged in users) */}
            {user && (
              <div className="mb-8">
                <ScoreHistory user={user} category={category || '11plus'} />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {/* Revision Mode Card */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-blue-600 mb-4">Revision Mode</h2>
                <p className="text-gray-600 mb-6">
                  Study vocabulary with flashcards. See each word with its definition and image.
                </p>
                <button
                  onClick={() => setMode('revision')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                >
                  Start Revision
                </button>
              </div>

              {/* Quiz Mode Card */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">🧠</div>
                <h2 className="text-2xl font-bold text-purple-600 mb-4">Quiz Mode</h2>
                <p className="text-gray-600 mb-6">
                  Test your knowledge with multiple choice questions. Track your progress and improve your score.
                </p>
                <button
                  onClick={() => setMode('quiz')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                >
                  Start Quiz
                </button>
              </div>
            </div>

          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header with Navigation */}
      {mode !== 'menu' && mode !== 'category' && (
        <header className="sticky top-0 z-50 bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setMode('menu')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="mr-2">←</span>
              Back to Menu
            </button>
            <h1 className="text-xl font-semibold text-gray-800">
              Wocab - {mode === 'revision' ? 'Revision Mode' : 'Quiz Mode'}
            </h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="py-8">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-600">
          <p>Wocab Learning Platform | Helping students master essential words</p>
        </div>
      </footer>
    </div>
  );
}
