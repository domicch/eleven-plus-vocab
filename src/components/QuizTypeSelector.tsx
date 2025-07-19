'use client';

import { useState } from 'react';

export interface QuizTypeSettings {
  includeWordToDefinition: boolean;
  includeImageToWord: boolean;
}

interface QuizTypeSelectorProps {
  category: '11plus' | 'music';
  onSettingsChange: (settings: QuizTypeSettings) => void;
  initialSettings?: QuizTypeSettings;
  hasImagesAvailable: boolean;
  imageCount?: number;
}

export default function QuizTypeSelector({ 
  category, 
  onSettingsChange, 
  initialSettings = { includeWordToDefinition: true, includeImageToWord: false },
  hasImagesAvailable,
  imageCount = 0
}: QuizTypeSelectorProps) {
  const [settings, setSettings] = useState<QuizTypeSettings>(initialSettings);

  const handleSettingChange = (setting: keyof QuizTypeSettings, value: boolean) => {
    const newSettings = { ...settings, [setting]: value };
    
    // Ensure at least one question type is always selected
    if (!newSettings.includeWordToDefinition && !newSettings.includeImageToWord) {
      // If user tries to disable the last remaining type, keep it enabled
      return;
    }
    
    setSettings(newSettings);
    // Don't call onSettingsChange here - only call it when user explicitly starts quiz
  };

  // Only show for music category since 11plus doesn't have image-to-word questions yet
  if (category !== 'music') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Quiz Type Settings</h3>
      <p className="text-gray-600 mb-4">Choose which types of questions to include in your quiz:</p>
      
      <div className="space-y-4">
        {/* Word to Definition Questions */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.includeWordToDefinition}
                onChange={(e) => handleSettingChange('includeWordToDefinition', e.target.checked)}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <div className="ml-3">
                <div className="font-semibold text-gray-800">Word to Definition</div>
                <div className="text-sm text-gray-600">
                  See a musical term and choose its correct definition
                </div>
              </div>
            </label>
          </div>
          <div className="text-2xl ml-4">📝</div>
        </div>

        {/* Image to Word Questions */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <label className={`flex items-center ${hasImagesAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <input
                type="checkbox"
                checked={settings.includeImageToWord && hasImagesAvailable}
                onChange={(e) => handleSettingChange('includeImageToWord', e.target.checked)}
                disabled={!hasImagesAvailable}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
              />
              <div className="ml-3">
                <div className="font-semibold text-gray-800">Image to Word</div>
                <div className="text-sm text-gray-600">
                  {hasImagesAvailable 
                    ? `See musical notation and choose the correct term (${imageCount} images available)`
                    : "See musical notation and choose the correct term (no images available)"
                  }
                </div>
              </div>
            </label>
          </div>
          <div className="text-2xl ml-4">🎼</div>
        </div>
      </div>

      {/* Information about mixed quizzes */}
      {settings.includeWordToDefinition && settings.includeImageToWord && hasImagesAvailable && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Mixed Quiz:</strong> Your quiz will include both question types for a varied learning experience!
          </div>
        </div>
      )}

      {/* Warning when no images available */}
      {!hasImagesAvailable && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> Image-to-word questions are not available because no musical notation images were found.
          </div>
        </div>
      )}

      {/* Info about minimum selection */}
      <div className="mt-4 text-xs text-gray-500">
        At least one question type must be selected.
      </div>

      {/* Start Quiz Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => onSettingsChange(settings)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}