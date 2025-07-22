'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getImagePath } from '@/utils/vocabulary';
import Image from 'next/image';
import type { QuizReviewData, NewQuizQuestion, QuizReviewAnswer } from '@/types/vocabulary';

interface QuizReviewProps {
  quizId: string;
  category: '11plus' | 'music';
}

export default function QuizReview({ quizId, category }: QuizReviewProps) {
  const [reviewData, setReviewData] = useState<QuizReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);

  useEffect(() => {
    const loadQuizReview = async () => {
      if (!supabase) return;

      setLoading(true);
      setError(null);
      
      try {
        const functionName = category === '11plus' ? 'get_quiz_review' : 'music_get_quiz_review';
        const { data, error } = await supabase.rpc(functionName, {
          target_quiz_id: quizId
        });

        if (error) {
          console.error('Error loading quiz review:', error);
          setError('Failed to load quiz review. Please try again.');
        } else if (data) {
          setReviewData(data);
        } else {
          setError('Quiz review not found or not accessible.');
        }
      } catch (error) {
        console.error('Error loading quiz review:', error);
        setError('Failed to load quiz review. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadQuizReview();
  }, [quizId, category]);

  // Load image path when current question changes
  useEffect(() => {
    const loadImagePath = async () => {
      if (!reviewData || !reviewData.questions[currentQuestionIndex]) return;
      
      const currentQuestion = reviewData.questions[currentQuestionIndex];
      
      // Try to find any ID field that could be used for image loading
      // This handles all possible formats: legacy, new, and music questions
      let wordId: string | null = null;
      const question = currentQuestion as unknown as Record<string, unknown>;
      
      // Check all possible ID fields
      if (question.id != null) {
        wordId = question.id.toString();
      } else if (question.word_id != null) {
        wordId = question.word_id.toString();
      } else if (question.question_id != null) {
        wordId = question.question_id.toString();
      }
      
      if (wordId) {
        const imagePath = await getImagePath(wordId, category);
        setCurrentImagePath(imagePath);
      } else {
        setCurrentImagePath(null);
      }
    };

    loadImagePath();
  }, [currentQuestionIndex, reviewData, category]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const getModeIcon = (mode: 'normal' | 'ultimate') => {
    return mode === 'ultimate' ? '🔥' : '🧠';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz review...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !reviewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quiz Review Not Available</h2>
          <p className="text-gray-600">{error || 'Quiz review not found.'}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = reviewData.questions[currentQuestionIndex];
  const currentAnswer = reviewData.answers_submitted[currentQuestionIndex];

  const renderQuestion = (question: NewQuizQuestion, answer: QuizReviewAnswer) => {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Question Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Question {currentQuestionIndex + 1} of {reviewData.questions.length}
              </span>
              {question.question_type && (
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                  {question.question_type === 'word_to_definition' ? 'Word → Definition' :
                   question.question_type === 'image_to_word' ? 'Image → Word' :
                   question.question_type === 'music_facts' ? 'Music Facts' : 'Question'}
                </span>
              )}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              answer.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {answer.is_correct ? '✅ Correct' : '❌ Incorrect'}
            </div>
          </div>

          {/* Question Content */}
          <div className="mb-4">
            {'question_text' in question ? (
              // Music facts question
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {question.question_text}
                </h3>
              </div>
            ) : (
              // Vocabulary question (word_to_definition or image_to_word)
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  {question.question_type === 'image_to_word' ? 'What word does this image represent?' : 'What does this word mean?'}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  {question.word}
                </h3>
                {currentImagePath && (
                  <div className="mb-4 flex justify-center">
                    <Image 
                      src={currentImagePath}
                      alt={question.word}
                      width={300}
                      height={200}
                      className="max-w-xs max-h-48 object-contain border rounded-lg"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 mb-3">Answer Choices:</h4>
          {question.options.map((option, optionIndex) => {
            const isUserChoice = optionIndex === answer.selected_index;
            const isCorrectAnswer = optionIndex === question.correct_index;
            
            let optionClass = 'p-3 rounded-lg border-2 ';
            if (isCorrectAnswer) {
              optionClass += 'border-green-500 bg-green-50 ';
            } else if (isUserChoice && !isCorrectAnswer) {
              optionClass += 'border-red-500 bg-red-50 ';
            } else {
              optionClass += 'border-gray-200 bg-gray-50 ';
            }

            return (
              <div key={optionIndex} className={optionClass}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">{option}</span>
                  <div className="flex items-center gap-2">
                    {isUserChoice && (
                      <span className={`text-sm px-2 py-1 rounded ${
                        isCorrectAnswer ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                      }`}>
                        Your Answer
                      </span>
                    )}
                    {isCorrectAnswer && (
                      <span className="text-sm bg-green-200 text-green-800 px-2 py-1 rounded">
                        Correct Answer
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          
          <span className="text-sm text-gray-600">
            {currentQuestionIndex + 1} / {reviewData.questions.length}
          </span>
          
          <button
            onClick={() => setCurrentQuestionIndex(Math.min(reviewData.questions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === reviewData.questions.length - 1}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Quiz Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div></div>
          
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {getScoreIcon(reviewData.score, reviewData.total_questions)}
            </span>
            <span className={`text-2xl font-bold ${getScoreColor(reviewData.score, reviewData.total_questions)}`}>
              {reviewData.score}/{reviewData.total_questions}
            </span>
            <span className="text-lg text-gray-500">
              ({Math.round((reviewData.score / reviewData.total_questions) * 100)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            {getModeIcon(reviewData.mode)} {reviewData.mode === 'ultimate' ? 'Ultimate' : 'Normal'} Quiz
          </span>
          <span>•</span>
          <span>Completed {formatDate(reviewData.completed_at)}</span>
          <span>•</span>
          <span>{category === '11plus' ? '11+ Exam' : 'Music Theory'}</span>
        </div>
      </div>

      {/* Question Review */}
      {renderQuestion(currentQuestion, currentAnswer)}

      {/* Question Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Question Overview</h3>
        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-2">
          {reviewData.questions.map((_, index) => {
            const answer = reviewData.answers_submitted[index];
            const isCurrentQuestion = index === currentQuestionIndex;
            
            return (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                  isCurrentQuestion
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : answer.is_correct
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span>Correct ({reviewData.answers_submitted.filter(a => a.is_correct).length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            <span>Incorrect ({reviewData.answers_submitted.filter(a => !a.is_correct).length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Current Question</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}