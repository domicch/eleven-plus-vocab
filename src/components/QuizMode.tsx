'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, QuizQuestion } from '@/lib/supabase';
import { checkImageExists, getRandomDaleImage, speakWord } from '@/utils/vocabulary';
import { markTodayCompleted, checkTodayCompletion } from '@/utils/streaks';
import type { User } from '@supabase/supabase-js';
import Image from 'next/image';

interface QuizSession {
  id: string;
  user_id: string;
  status: 'active' | 'completed' | 'abandoned';
  total_questions: number;
  questions: QuizQuestion[];
  created_at: string;
  completed_at: string | null;
  score: number | null;
  current_question_index?: number;
  current_score?: number;
  answers_submitted?: Array<{
    question_index: number;
    selected_answer_index: number;
    is_correct: boolean;
    submitted_at: string;
  }>;
}

interface QuizModeProps {
  vocabulary: unknown[]; // Keep for compatibility but won't be used
}

export default function QuizMode({ vocabulary }: QuizModeProps) {
  // Suppress unused parameter warning - keeping for compatibility
  void vocabulary;
  
  // Quiz session state
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingActiveQuizzes, setPendingActiveQuizzes] = useState<QuizSession[]>([]);
  const [hasImage, setHasImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showDaleReaction, setShowDaleReaction] = useState(false);
  const [daleReactionImage, setDaleReactionImage] = useState<string>('');
  const [daleReactionMessage, setDaleReactionMessage] = useState<string>('');
  
  // User and streak state
  const [user, setUser] = useState<User | null>(null);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [earnedStar, setEarnedStar] = useState(false);
  
  // Ref to prevent duplicate requests
  const loadingRef = useRef(false);

  // Sound effect functions
  const playCorrectSound = () => {
    try {
      const audio = new Audio(`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/sound/correct.mp3`);
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Could not play correct sound:', error);
      });
    } catch (error) {
      console.warn('Error creating audio element:', error);
    }
  };

  const playWrongSound = () => {
    try {
      const audio = new Audio(`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/sound/wrong.mp3`);
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Could not play wrong sound:', error);
      });
    } catch (error) {
      console.warn('Error creating audio element:', error);
    }
  };

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

  // Check today's completion status
  useEffect(() => {
    if (user) {
      checkTodayCompletion(user.id).then(setTodayCompleted);
    }
  }, [user]);

  // Load or create quiz when user is available
  useEffect(() => {
    if (user && !quizSession && !loadingRef.current) {
      loadOrCreateQuiz();
    }
  }, [user, quizSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for image when question changes
  useEffect(() => {
    if (quizSession && quizSession.questions.length > 0 && currentQuestionIndex < quizSession.questions.length) {
      const currentQuestion = quizSession.questions[currentQuestionIndex];
      setImageLoading(true);
      setHasImage(false);
      
      checkImageExists(currentQuestion.word).then((exists) => {
        setHasImage(exists);
        setImageLoading(false);
      });
    }
  }, [quizSession, currentQuestionIndex]);

  const loadOrCreateQuiz = async () => {
    if (!supabase || !user || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // First, check if user has an active quiz
      const { data: activeQuizzes, error: activeQuizError } = await supabase
        .from('quiz')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (activeQuizError) {
        throw new Error(`Error loading active quiz: ${activeQuizError.message}`);
      }

      if (activeQuizzes && activeQuizzes.length > 0) {
        // Show resume prompt to user
        setPendingActiveQuizzes(activeQuizzes);
        setShowResumePrompt(true);
        return; // Exit early, user will decide via prompt
      }

      // No active quizzes, create new one
      await createNewQuiz();
    } catch (err) {
      console.error('Quiz loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const createNewQuiz = async () => {
    if (!supabase) throw new Error('Supabase client not available');
    if (!user) throw new Error('User not authenticated');
    
    const { data: newQuizResult, error: createError } = await supabase.rpc('generatequiz', {
      user_id: user.id,
      question_count: 10
    });

    if (createError) {
      throw new Error(`Error creating quiz: ${createError.message}`);
    }

    if (newQuizResult.error) {
      throw new Error(`Quiz generation failed: ${newQuizResult.error}`);
    }

    // Load the newly created quiz
    const { data: newQuiz, error: loadError } = await supabase
      .from('quiz')
      .select('*')
      .eq('id', newQuizResult.quiz_id)
      .single();

    if (loadError) {
      throw new Error(`Error loading new quiz: ${loadError.message}`);
    }

    setQuizSession(newQuiz);
  };

  const handleResumeQuiz = async () => {
    if (!supabase || pendingActiveQuizzes.length === 0) return;

    try {
      setLoading(true);
      
      // Resume the first quiz and abandon the rest
      const quizToResume = pendingActiveQuizzes[0];
      const quizzesToAbandon = pendingActiveQuizzes.slice(1);

      if (quizzesToAbandon.length > 0) {
        const abandonIds = quizzesToAbandon.map(quiz => quiz.id);
        await supabase
          .from('quiz')
          .delete()
          .in('id', abandonIds);
      }
      setQuizSession(quizToResume);
      
      // Reset UI state for resume (get current progress from server)
      setCurrentQuestionIndex(quizToResume.current_question_index || 0);
      setScore(quizToResume.current_score || 0);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuizComplete(false);
      
    } catch (err) {
      console.error('Error resuming quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to resume quiz');
    } finally {
      setShowResumePrompt(false);
      setPendingActiveQuizzes([]);
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleStartNewQuiz = async () => {
    if (!supabase || pendingActiveQuizzes.length === 0) return;

    try {
      setLoading(true);
      
      // Delete all active quizzes
      const quizIds = pendingActiveQuizzes.map(quiz => quiz.id);
      await supabase
        .from('quiz')
        .delete()
        .in('id', quizIds);

      // Create new quiz
      await createNewQuiz();
      
    } catch (err) {
      console.error('Error starting new quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to start new quiz');
    } finally {
      setShowResumePrompt(false);
      setPendingActiveQuizzes([]);
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const showDaleReactionFunc = async (isCorrect: boolean) => {
    const mood: 'happy' | 'unhappy' = isCorrect ? 'happy' : 'unhappy';
    const message = isCorrect ? 'Congratulations!' : 'Oh no!';
    
    try {
      const reactionImage = await getRandomDaleImage(mood);
      setDaleReactionImage(reactionImage);
      setDaleReactionMessage(message);
      setShowDaleReaction(true);
      
      setTimeout(() => {
        setShowDaleReaction(false);
      }, 2000);
    } catch (error) {
      console.error('Error loading Dale reaction image:', error);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null || !quizSession || !supabase) return;
    
    setShowResult(true);
    
    try {
      // Submit answer to secure server-side function
      const { data: result, error } = await supabase.rpc('submitquizanswer', {
        quiz_id: quizSession.id,
        question_index: currentQuestionIndex,
        selected_answer_index: selectedAnswer
      });

      if (error) {
        console.error('Error submitting answer:', error);
        setError('Failed to submit answer. Please try again.');
        setShowResult(false);
        return;
      }

      if (result.error) {
        console.error('Server error:', result.error);
        setError(result.error);
        setShowResult(false);
        return;
      }

      // Update UI based on server response
      const isCorrect = result.is_correct;
      setScore(result.new_score);

      if (isCorrect) {
        playCorrectSound();
      } else {
        playWrongSound();
      }

      await showDaleReactionFunc(isCorrect);

      // If quiz is completed, handle completion after Dale's reaction
      if (result.quiz_completed) {
        // Wait for Dale's reaction to finish (2 seconds) before showing completion
        setTimeout(() => {
          setQuizComplete(true);
        }, 2000);
        
        // Check if user earned a star (can do this immediately)
        const percentage = (result.final_score / result.total_questions) * 100;
        if (percentage >= 50 && !todayCompleted) {
          markTodayCompleted(user!.id).then(() => {
            setTodayCompleted(true);
            setEarnedStar(true);
          });
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer. Please try again.');
      setShowResult(false);
    }
  };

  const nextQuestion = () => {
    if (!quizSession) return;

    // Server-side function handles progression, so we just update UI
    setCurrentQuestionIndex(currentQuestionIndex + 1);
    setSelectedAnswer(null);
    setShowResult(false);
  };


  const restartQuiz = async () => {
    // Delete current quiz if it exists
    if (quizSession && supabase) {
      await supabase
        .from('quiz')
        .delete()
        .eq('id', quizSession.id);
    }
    
    setQuizSession(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizComplete(false);
    setEarnedStar(false);
    setError(null);
    loadingRef.current = false;
    
    // This will trigger useEffect to create a new quiz
    if (user) {
      loadOrCreateQuiz();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-4">Quiz Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={restartQuiz}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sign In Required</h2>
          <p className="text-gray-600">Please sign in to take quizzes and track your progress.</p>
        </div>
      </div>
    );
  }

  // Resume quiz prompt
  if (showResumePrompt) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Resume Quiz?</h2>
          <div className="text-4xl mb-4">🤔</div>
          <p className="text-lg text-gray-700 mb-2">
            You have {pendingActiveQuizzes.length} unfinished quiz{pendingActiveQuizzes.length > 1 ? 'es' : ''}.
          </p>
          <p className="text-gray-600 mb-8">
            Would you like to resume your quiz or start a new one?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleResumeQuiz}
              disabled={loading}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? 'Loading...' : 'Resume Quiz'}
            </button>
            <button
              onClick={handleStartNewQuiz}
              disabled={loading}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {loading ? 'Loading...' : 'Start New Quiz'}
            </button>
          </div>
          {pendingActiveQuizzes.length > 1 && (
            <p className="text-sm text-gray-500 mt-4">
              Note: If you resume, the other quizzes will be deleted.
            </p>
          )}
        </div>
      </div>
    );
  }

  // No quiz session
  if (!quizSession) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <p className="text-gray-600">Loading quiz session...</p>
        </div>
      </div>
    );
  }

  // Quiz completion state
  if (quizComplete) {
    const finalScore = score;
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-4xl font-bold text-green-600 mb-4">Quiz Complete!</h2>
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-2xl text-gray-700 mb-6">
            Your Score: <span className="font-bold text-blue-600">{finalScore}/{quizSession.questions.length}</span>
          </p>
          <p className="text-lg text-gray-600 mb-4">
            {finalScore >= quizSession.questions.length * 0.8 
              ? "Excellent work! You have a great understanding of these words!"
              : finalScore >= quizSession.questions.length * 0.5
              ? "Good job! Keep practicing to improve your vocabulary."
              : "Keep studying! Practice makes perfect."}
          </p>
          <div className="mb-8">
            <p className="text-sm text-green-600 mb-2">
              ✓ Your score has been saved to your profile!
            </p>
            {earnedStar && (
              <p className="text-lg text-yellow-600 font-semibold">
                ⭐ You earned your daily star! Keep up the streak!
              </p>
            )}
            {!earnedStar && finalScore >= quizSession.questions.length * 0.5 && todayCompleted && (
              <p className="text-sm text-blue-600">
                ⭐ You already earned your daily star today!
              </p>
            )}
            {!earnedStar && finalScore < quizSession.questions.length * 0.5 && (
              <p className="text-sm text-orange-600">
                📚 Score 50% or higher to earn your daily star!
              </p>
            )}
          </div>
          <button
            onClick={restartQuiz}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Take Quiz Again
          </button>
        </div>
      </div>
    );
  }

  // Active quiz state
  const currentQuestion = quizSession.questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-purple-600 mb-2">Quiz Mode</h2>
        <p className="text-gray-600">
          Question {currentQuestionIndex + 1} of {quizSession.questions.length} | Score: {score}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Question */}
        <div className="text-center mb-8">
          <h3 className="text-xl text-gray-600 mb-4">What does this word mean?</h3>
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 break-words text-center flex-1 min-w-0">
              {currentQuestion.word}
            </h1>
            <button
              onClick={() => speakWord(currentQuestion.word)}
              className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-colors shadow-md"
              title="Pronounce word"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
          </div>

          {/* Image Display */}
          {imageLoading && (
            <div className="mb-6">
              <div className="w-full max-w-64 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-gray-500">Checking for image...</div>
              </div>
            </div>
          )}
          
          {!imageLoading && hasImage && (
            <div className="mb-6">
              <div className="relative w-full max-w-64 h-48 mx-auto rounded-lg overflow-hidden shadow-md">
                <Image
                  src={`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/images/words/${currentQuestion.word.toLowerCase()}.jpg`}
                  alt={currentQuestion.word}
                  fill
                  className="object-cover"
                  onError={() => {
                    setHasImage(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Answer Options */}
        <div className="space-y-4 mb-8">
          {currentQuestion.options.map((option, index) => {
            let buttonClass = "w-full p-4 text-left rounded-lg border-2 transition-colors ";
            
            if (showResult) {
              if (index === currentQuestion.correct_index) {
                buttonClass += "border-green-500 bg-green-100 text-green-800";
              } else if (index === selectedAnswer) {
                buttonClass += "border-red-500 bg-red-100 text-red-800";
              } else {
                buttonClass += "border-gray-300 bg-gray-50 text-gray-600";
              }
            } else if (selectedAnswer === index) {
              buttonClass += "border-blue-500 bg-blue-100 text-blue-800";
            } else {
              buttonClass += "border-gray-300 hover:border-blue-300 hover:bg-blue-50 text-gray-800";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={buttonClass}
                disabled={showResult}
              >
                <span className="font-semibold mr-3">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          {!showResult ? (
            <button
              onClick={submitAnswer}
              disabled={selectedAnswer === null}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                selectedAnswer === null
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            !quizComplete && (
              <button
                onClick={nextQuestion}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Next Question
              </button>
            )
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 bg-gray-200 rounded-full h-2">
        <div
          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / quizSession.questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Dale Reaction Overlay */}
      {showDaleReaction && daleReactionImage && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-full">
            {/* Dale Image */}
            <div className="w-48 h-48 sm:w-64 sm:h-64 flex-shrink-0">
              <Image
                src={daleReactionImage}
                alt="Dale reaction"
                width={256}
                height={256}
                className="object-contain w-full h-full"
              />
            </div>
            
            {/* Speech Bubble */}
            <div className="relative bg-white border-2 border-gray-300 rounded-2xl shadow-lg p-4 sm:p-6 max-w-xs w-full">
              <p className="text-lg sm:text-xl font-bold text-gray-800 text-center">
                {daleReactionMessage}
              </p>
              {/* Speech bubble tail - hidden on mobile, shown on desktop */}
              <div className="hidden sm:block absolute left-[-8px] top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}