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