export interface VocabularyWord {
  word: string;
  definition: string;
  hasImage: boolean;
}

export interface QuizQuestion {
  word: string;
  correctAnswer: string;
  options: string[];
  correctIndex: number;
}