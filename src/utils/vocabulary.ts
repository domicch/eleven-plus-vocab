import { VocabularyWord, QuizQuestion } from '@/types/vocabulary';

export async function loadVocabulary(): Promise<VocabularyWord[]> {
  try {
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    const response = await fetch(`${basePath}/vocabulary.csv`);
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    
    const vocabulary: VocabularyWord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCSVLine(line);
      
      if (values.length >= 2) {
        const word = values[0].trim();
        const definition = values[1].trim();
        
        // Check if image exists
        const hasImage = await checkImageExists(word);
        
        vocabulary.push({
          word,
          definition,
          hasImage
        });
      }
    }
    
    return vocabulary;
  } catch (error) {
    console.error('Error loading vocabulary:', error);
    return [];
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

async function checkImageExists(word: string): Promise<boolean> {
  try {
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    const response = await fetch(`${basePath}/images/${word.toLowerCase()}.jpg`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export function generateQuizQuestion(
  targetWord: VocabularyWord,
  allWords: VocabularyWord[]
): QuizQuestion {
  // Get 3 random wrong answers
  const wrongAnswers = allWords
    .filter(w => w.word !== targetWord.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.definition);
  
  // Combine correct and wrong answers
  const allOptions = [targetWord.definition, ...wrongAnswers];
  
  // Shuffle options
  const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
  
  // Find correct answer index
  const correctIndex = shuffledOptions.indexOf(targetWord.definition);
  
  return {
    word: targetWord.word,
    correctAnswer: targetWord.definition,
    options: shuffledOptions,
    correctIndex
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}