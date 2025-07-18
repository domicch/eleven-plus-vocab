'use client';

import { useState } from 'react';
import Image from 'next/image';

interface CategorySelectionProps {
  onCategorySelect: (category: '11plus' | 'music') => void;
  greetingImage: string;
}

export default function CategorySelection({ onCategorySelect, greetingImage }: CategorySelectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<'11plus' | 'music' | null>(null);

  const handleCategoryClick = (category: '11plus' | 'music') => {
    setSelectedCategory(category);
    // Add a small delay for visual feedback
    setTimeout(() => {
      onCategorySelect(category);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl w-full">
        <div className="text-center mb-8">
          {greetingImage && (
            <div className="mb-6">
              <Image
                src={greetingImage}
                alt="Dale greeting"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome to Vocabulary Learning
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose your learning category to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 11+ Category */}
          <div 
            onClick={() => handleCategoryClick('11plus')}
            className={`relative cursor-pointer rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
              selectedCategory === '11plus' 
                ? 'border-purple-600 bg-purple-50 scale-105' 
                : 'border-gray-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">11+ Exam</h2>
                <p className="text-gray-600 mb-4">
                  Prepare for your 11+ exam with essential vocabulary words
                </p>
                <div className="text-sm text-gray-500">
                  <p>• 426 carefully selected words</p>
                  <p>• Definitions and examples</p>
                  <p>• Interactive quiz mode</p>
                  <p>• Daily streak tracking</p>
                </div>
              </div>
              <div className="absolute top-4 right-4">
                <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Academic
                </div>
              </div>
            </div>
          </div>

          {/* Music Theory Category */}
          <div 
            onClick={() => handleCategoryClick('music')}
            className={`relative cursor-pointer rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
              selectedCategory === 'music' 
                ? 'border-blue-600 bg-blue-50 scale-105' 
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Music Theory</h2>
                <p className="text-gray-600 mb-4">
                  Master essential music theory vocabulary and concepts
                </p>
                <div className="text-sm text-gray-500">
                  <p>• 90+ music theory terms</p>
                  <p>• Tempo, dynamics, harmony</p>
                  <p>• Musical forms and structures</p>
                  <p>• Progress tracking</p>
                </div>
              </div>
              <div className="absolute top-4 right-4">
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Musical
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            You can switch between categories at any time from the main menu
          </p>
        </div>
      </div>
    </div>
  );
}