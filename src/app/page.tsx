'use client';

import { useState, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { loadVocabulary } from '@/utils/vocabulary';
import RevisionMode from '@/components/RevisionMode';
import QuizMode from '@/components/QuizMode';

type Mode = 'menu' | 'revision' | 'quiz';

export default function Home() {
  const [mode, setMode] = useState<Mode>('menu');
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWords = async () => {
      try {
        const words = await loadVocabulary();
        setVocabulary(words);
      } catch (error) {
        console.error('Failed to load vocabulary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWords();
  }, []);

  if (loading) {
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
      case 'revision':
        return <RevisionMode vocabulary={vocabulary} />;
      case 'quiz':
        return <QuizMode vocabulary={vocabulary} />;
      default:
        return (
          <div className="max-w-4xl mx-auto p-6 text-center">
            <div className="mb-12">
              <h1 className="text-6xl font-bold text-gray-800 mb-4">
                11+ Vocabulary
              </h1>
              <p className="text-xl text-gray-600 mb-2">
                Master {vocabulary.length} essential words for your 11+ exam
              </p>
              <p className="text-lg text-gray-500">
                Choose a learning mode to get started
              </p>
            </div>

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

            {/* Statistics */}
            <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Vocabulary Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{vocabulary.length}</div>
                  <div className="text-sm text-gray-600">Total Words</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {vocabulary.filter(w => w.hasImage).length}
                  </div>
                  <div className="text-sm text-gray-600">With Images</div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((vocabulary.filter(w => w.hasImage).length / vocabulary.length) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Image Coverage</div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header with Navigation */}
      {mode !== 'menu' && (
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setMode('menu')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="mr-2">←</span>
              Back to Menu
            </button>
            <h1 className="text-xl font-semibold text-gray-800">
              11+ Vocabulary - {mode === 'revision' ? 'Revision Mode' : 'Quiz Mode'}
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
          <p>11+ Vocabulary Learning Platform | Helping students master essential words</p>
        </div>
      </footer>
    </div>
  );
}
