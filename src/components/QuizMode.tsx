'use client';

import { useState, useEffect } from 'react';
import { VocabularyWord, QuizQuestion } from '@/types/vocabulary';
import { generateQuizQuestion, shuffleArray, checkImageExists } from '@/utils/vocabulary';
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

  useEffect(() => {
    if (vocabulary.length > 0) {
      generateQuiz();
    }
  }, [vocabulary]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setShowResult(true);
    
    if (selectedAnswer === questions[currentQuestionIndex].correctIndex) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex + 1 >= questions.length) {
      setQuizComplete(true);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
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
          <p className="text-lg text-gray-600 mb-8">
            {score >= questions.length * 0.8 
              ? "Excellent work! You have a great understanding of these words!"
              : score >= questions.length * 0.6
              ? "Good job! Keep practicing to improve your vocabulary."
              : "Keep studying! Practice makes perfect."}
          </p>
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
    </div>
  );
}