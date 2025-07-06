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
        
        // Don't check image existence here - do it lazily when needed
        vocabulary.push({
          word,
          definition,
          hasImage: false // Will be checked lazily
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

export async function checkImageExists(word: string): Promise<boolean> {
  try {
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    const response = await fetch(`${basePath}/images/words/${word.toLowerCase()}.jpg`, { method: 'HEAD' });
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

export async function getAvailableGreetingImages(): Promise<string[]> {
  try {
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    const response = await fetch(`${basePath}/greeting-images.json`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch greeting images list');
    }
    
    const imageFilenames: string[] = await response.json();
    
    // Convert filenames to full paths
    return imageFilenames.map(filename => `${basePath}/images/avatar/greeting/${filename}`);
  } catch (error) {
    console.error('Error loading greeting images list:', error);
    // Return empty array as fallback
    return [];
  }
}

export async function getRandomGreetingImage(): Promise<string> {
  const availableImages = await getAvailableGreetingImages();
  
  if (availableImages.length === 0) {
    // Fallback to a default image path
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    return `${basePath}/images/avatar/greeting/greeting-1.jpg`;
  }
  
  const randomIndex = Math.floor(Math.random() * availableImages.length);
  return availableImages[randomIndex];
}

export function speakWord(word: string): void {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Speech synthesis not supported in this browser');
  }
}

export async function getAvailableDaleImages(mood: 'happy' | 'unhappy'): Promise<string[]> {
  try {
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    const response = await fetch(`${basePath}/${mood}-images.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${mood} images list`);
    }
    
    const imageFilenames: string[] = await response.json();
    
    // Convert filenames to full paths
    return imageFilenames.map(filename => `${basePath}/images/avatar/${mood}/${filename}`);
  } catch (error) {
    console.error(`Error loading ${mood} images list:`, error);
    // Return empty array as fallback
    return [];
  }
}

export async function getRandomDaleImage(mood: 'happy' | 'unhappy'): Promise<string> {
  const availableImages = await getAvailableDaleImages(mood);
  
  if (availableImages.length === 0) {
    // Fallback to a default image path
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    return `${basePath}/images/avatar/${mood}/${mood}-1.png`;
  }
  
  const randomIndex = Math.floor(Math.random() * availableImages.length);
  return availableImages[randomIndex];
}