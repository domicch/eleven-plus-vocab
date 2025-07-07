'use client';

import { useState, useEffect } from 'react';
import { VocabularyWord, QuizQuestion } from '@/types/vocabulary';
import { generateQuizQuestion, shuffleArray, checkImageExists, getRandomDaleImage } from '@/utils/vocabulary';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import Image from 'next/image';

interface QuizModeProps {
  vocabulary: VocabularyWord[];
}

export default function QuizMode({ vocabulary }: QuizModeProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showDaleReaction, setShowDaleReaction] = useState(false);
  const [daleReactionImage, setDaleReactionImage] = useState<string>('');
  const [daleReactionMessage, setDaleReactionMessage] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (vocabulary.length > 0) {
      generateQuiz();
    }
  }, [vocabulary]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Check for image when question changes
  useEffect(() => {
    if (questions.length > 0 && questions[currentQuestionIndex]) {
      const currentQuestion = questions[currentQuestionIndex];
      setImageLoading(true);
      setHasImage(false);
      
      checkImageExists(currentQuestion.word).then((exists) => {
        setHasImage(exists);
        setImageLoading(false);
      });
    }
  }, [questions, currentQuestionIndex]);

  const generateQuiz = () => {
    const shuffledVocab = shuffleArray(vocabulary).slice(0, 20); // 20 questions
    const newQuestions = shuffledVocab.map(word => 
      generateQuizQuestion(word, vocabulary)
    );
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizComplete(false);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const showDaleReactionFunc = async (isCorrect: boolean) => {
    const mood: 'happy' | 'unhappy' = isCorrect ? 'happy' : 'unhappy';
    const message = isCorrect ? 'Congratulations!' : 'Oh no!';
    
    try {
      const reactionImage = await getRandomDaleImage(mood);
      setDaleReactionImage(reactionImage);
      setDaleReactionMessage(message);
      setShowDaleReaction(true);
      
      // Hide Dale after 2 seconds
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
    if (selectedAnswer === null) return;
    
    setShowResult(true);
    
    const isCorrect = selectedAnswer === questions[currentQuestionIndex].correctIndex;
    if (isCorrect) {
      setScore(score + 1);
    }
    
    // Show Dale's reaction
    await showDaleReactionFunc(isCorrect);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex + 1 >= questions.length) {
      setQuizComplete(true);
      // Save the quiz score for logged-in users
      saveQuizScore(score, questions.length);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const saveQuizScore = async (finalScore: number, totalQuestions: number) => {
    if (!supabase || !user) return;

    try {
      const { error } = await supabase
        .from('quiz_scores')
        .insert({
          user_id: user.id,
          score: finalScore,
          total_questions: totalQuestions,
        });

      if (error) {
        console.error('Error saving quiz score:', error);
      } else {
        console.log('Quiz score saved successfully!');
      }
    } catch (error) {
      console.error('Error saving quiz score:', error);
    }
  };

  const restartQuiz = () => {
    generateQuiz();
  };

  if (questions.length === 0) {
    return <div className="text-center text-gray-500">Loading quiz...</div>;
  }

  if (quizComplete) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-4xl font-bold text-green-600 mb-4">Quiz Complete!</h2>
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-2xl text-gray-700 mb-6">
            Your Score: <span className="font-bold text-blue-600">{score}/{questions.length}</span>
          </p>
          <p className="text-lg text-gray-600 mb-4">
            {score >= questions.length * 0.8 
              ? "Excellent work! You have a great understanding of these words!"
              : score >= questions.length * 0.6
              ? "Good job! Keep practicing to improve your vocabulary."
              : "Keep studying! Practice makes perfect."}
          </p>
          {user && (
            <p className="text-sm text-green-600 mb-8">
              ✓ Your score has been saved to your profile!
            </p>
          )}
          {!user && (
            <p className="text-sm text-gray-500 mb-8">
              💡 Sign in to save your scores and track your progress!
            </p>
          )}
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

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-purple-600 mb-2">Quiz Mode</h2>
        <p className="text-gray-600">
          Question {currentQuestionIndex + 1} of {questions.length} | Score: {score}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Question */}
        <div className="text-center mb-8">
          <h3 className="text-xl text-gray-600 mb-4">What does this word mean?</h3>
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            {currentQuestion.word}
          </h1>

          {/* Image Display */}
          {imageLoading && (
            <div className="mb-6">
              <div className="w-64 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-gray-500">Checking for image...</div>
              </div>
            </div>
          )}
          
          {!imageLoading && hasImage && (
            <div className="mb-6">
              <div className="relative w-64 h-48 mx-auto rounded-lg overflow-hidden shadow-md">
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
              if (index === currentQuestion.correctIndex) {
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
            <button
              onClick={nextQuestion}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              {currentQuestionIndex + 1 >= questions.length ? 'Finish Quiz' : 'Next Question'}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 bg-gray-200 rounded-full h-2">
        <div
          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Dale Reaction Overlay */}
      {showDaleReaction && daleReactionImage && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-6">
            {/* Dale Image */}
            <div className="w-64 h-64">
              <Image
                src={daleReactionImage}
                alt="Dale reaction"
                width={256}
                height={256}
                className="object-contain w-full h-full"
              />
            </div>
            
            {/* Speech Bubble - To the right of Dale */}
            <div className="relative bg-white border-2 border-gray-300 rounded-2xl shadow-lg p-6 max-w-xs">
              <p className="text-xl font-bold text-gray-800 text-center">
                {daleReactionMessage}
              </p>
              {/* Speech bubble tail pointing left to Dale */}
              <div className="absolute left-[-8px] top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}