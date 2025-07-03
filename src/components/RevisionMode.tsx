'use client';

import { useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import Image from 'next/image';

interface RevisionModeProps {
  vocabulary: VocabularyWord[];
}

export default function RevisionMode({ vocabulary }: RevisionModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);

  const currentWord = vocabulary[currentIndex];

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

      <div className="bg-white rounded-xl shadow-lg p-8 min-h-[500px] flex flex-col justify-center items-center">
        {/* Word Display */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            {currentWord.word}
          </h1>
        </div>

        {/* Image Display */}
        {currentWord.hasImage && (
          <div className="mb-8">
            <div className="relative w-80 h-60 rounded-lg overflow-hidden shadow-md">
              <Image
                src={`${process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : ''}/images/${currentWord.word.toLowerCase()}.jpg`}
                alt={currentWord.word}
                fill
                className="object-cover"
                onError={() => {
                  // Handle image load error
                  console.log(`Image not found for: ${currentWord.word}`);
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
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prevCard}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          ← Previous
        </button>

        <div className="flex space-x-4">
          <button
            onClick={toggleDefinition}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {showDefinition ? 'Hide Definition' : 'Show Definition'}
          </button>
        </div>

        <button
          onClick={nextCard}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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