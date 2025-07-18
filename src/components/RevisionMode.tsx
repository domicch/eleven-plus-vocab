'use client';

import { useState, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { checkImageExists, speakWord } from '@/utils/vocabulary';
import Image from 'next/image';

interface RevisionModeProps {
  vocabulary: VocabularyWord[];
  category: '11plus' | 'music';
}

export default function RevisionMode({ vocabulary, category }: RevisionModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [letterIndex, setLetterIndex] = useState<{ [letter: string]: number }>({});

  const currentWord = vocabulary[currentIndex];

  // Create alphabetical index when vocabulary changes
  useEffect(() => {
    if (vocabulary.length > 0) {
      const index: { [letter: string]: number } = {};
      vocabulary.forEach((word, idx) => {
        const firstLetter = word.word.charAt(0).toUpperCase();
        if (!index[firstLetter]) {
          index[firstLetter] = idx;
        }
      });
      setLetterIndex(index);
    }
  }, [vocabulary]);

  // Function to jump to first word starting with specific letter
  const jumpToLetter = (letter: string) => {
    const targetIndex = letterIndex[letter];
    if (targetIndex !== undefined) {
      setCurrentIndex(targetIndex);
      setShowDefinition(false);
    }
  };

  // Check for image when word changes
  useEffect(() => {
    if (currentWord) {
      setImageLoading(true);
      setHasImage(false);
      
      checkImageExists(currentWord.word, category).then((exists) => {
        setHasImage(exists);
        setImageLoading(false);
      });
    }
  }, [currentWord]);

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % vocabulary.length);
    setShowDefinition(false);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + vocabulary.length) % vocabulary.length);
    setShowDefinition(false);
  };

  const toggleDefinition = () => {
    setShowDefinition(!showDefinition);
  };

  if (!currentWord) {
    return <div className="text-center text-gray-500">No vocabulary loaded</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-blue-600 mb-2">Revision Mode</h2>
        <p className="text-gray-600">
          Card {currentIndex + 1} of {vocabulary.length}
        </p>
      </div>

      {/* A-Z Index */}
      <div className="mb-6 bg-white rounded-xl shadow-md p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3 text-center">Quick Jump to Letter</h3>
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {Array.from({ length: 26 }, (_, i) => {
            const letter = String.fromCharCode(65 + i); // A-Z
            const hasWords = letterIndex[letter] !== undefined;
            const isCurrentLetter = currentWord && currentWord.word.charAt(0).toUpperCase() === letter;
            
            return (
              <button
                key={letter}
                onClick={() => jumpToLetter(letter)}
                disabled={!hasWords}
                className={`
                  w-8 h-8 rounded-lg font-semibold text-sm transition-all
                  ${isCurrentLetter 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : hasWords 
                      ? 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-600' 
                      : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  }
                `}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 min-h-[500px] flex flex-col justify-center items-center">
        {/* Word Display */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 break-words text-center flex-1 min-w-0">
              {currentWord.word}
            </h1>
            <button
              onClick={() => speakWord(currentWord.word)}
              className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-colors shadow-md"
              title="Pronounce word"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Image Display */}
        {imageLoading && (
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-80 h-60 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-gray-500">Checking for image...</div>
            </div>
          </div>
        )}
        
        {!imageLoading && hasImage && (
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-80 rounded-lg overflow-hidden shadow-md">
              <Image
                src={`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/images/words/${category}/${currentWord.word.toLowerCase()}.jpg`}
                alt={currentWord.word}
                width={320}
                height={240}
                className="w-full h-auto object-cover"
                onError={() => {
                  // Handle image load error
                  console.log(`Image not found for: ${currentWord.word}`);
                  setHasImage(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Definition Display */}
        {showDefinition && (
          <div className="bg-blue-50 rounded-lg p-6 max-w-2xl">
            <p className="text-lg text-gray-700 leading-relaxed">
              {currentWord.definition}
            </p>
          </div>
        )}

        {/* Show Definition Button */}
        {!showDefinition && (
          <button
            onClick={toggleDefinition}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Show Definition
          </button>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
        <button
          onClick={prevCard}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold transition-colors w-full sm:w-auto"
        >
          ← Previous
        </button>

        <button
          onClick={toggleDefinition}
          className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold transition-colors w-full sm:w-auto order-last sm:order-none"
        >
          <span className="sm:hidden">{showDefinition ? 'Hide' : 'Show'}</span>
          <span className="hidden sm:inline">{showDefinition ? 'Hide Definition' : 'Show Definition'}</span>
        </button>

        <button
          onClick={nextCard}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold transition-colors w-full sm:w-auto"
        >
          Next →
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / vocabulary.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}