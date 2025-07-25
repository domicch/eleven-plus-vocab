export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  hasImage: boolean;
}

export interface QuizQuestion {
  id: string;
  word: string;
  correctAnswer: string;
  options: string[];
  correctIndex: number;
}

// New interfaces for the updated quiz system
export interface MusicFactsQuestion {
  question_id: number;
  question_text: string;
  options: string[];
  correct_index: number;
  question_type: 'music_facts';
}

export interface VocabularyQuestion {
  word_id: number;
  word: string;
  correct_answer: string;
  options: string[];
  correct_index: number;
  question_type: 'word_to_definition' | 'image_to_word';
}

// Union type for all new question types
export type NewQuizQuestion = VocabularyQuestion | MusicFactsQuestion;

// Quiz Review interfaces
export interface QuizReviewAnswer {
  selected_index: number;
  is_correct: boolean;
}

export interface QuizReviewData {
  quiz_id: string;
  user_id: string;
  status: 'completed';
  questions: NewQuizQuestion[];
  answers_submitted: QuizReviewAnswer[];
  score: number;
  total_questions: number;
  completed_at: string;
  mode: 'normal' | 'ultimate';
  created_at: string;
}