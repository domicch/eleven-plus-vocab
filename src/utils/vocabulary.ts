import { VocabularyWord, QuizQuestion } from '@/types/vocabulary';

export async function loadVocabulary(category: '11plus' | 'music' = '11plus'): Promise<VocabularyWord[]> {
  try {
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    const csvFile = category === '11plus' ? 'vocabulary.csv' : 'vocabulary-music.csv';
    const response = await fetch(`${basePath}/${csvFile}`);
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
    
    // Sort vocabulary alphabetically by word (case-insensitive)
    vocabulary.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));
    
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

// Cache for vocabulary image manifests
const vocabularyImageManifests: Record<string, Record<string, string>> = {};

export async function loadVocabularyImageManifest(category: '11plus' | 'music'): Promise<Record<string, string>> {
  if (vocabularyImageManifests[category]) {
    return vocabularyImageManifests[category];
  }

  try {
    const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
    const manifestFile = category === '11plus' ? '11plus-images.json' : 'music-images.json';
    const response = await fetch(`${basePath}/${manifestFile}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${category} images manifest`);
    }
    
    const manifest: Record<string, string> = await response.json();
    vocabularyImageManifests[category] = manifest;
    return manifest;
  } catch (error) {
    console.error(`Error loading ${category} vocabulary images manifest:`, error);
    vocabularyImageManifests[category] = {};
    return {};
  }
}

export async function checkImageExists(word: string, category: '11plus' | 'music' = '11plus'): Promise<boolean> {
  try {
    const manifest = await loadVocabularyImageManifest(category);
    return word.toLowerCase() in manifest;
  } catch {
    return false;
  }
}

export async function getImagePath(word: string, category: '11plus' | 'music' = '11plus'): Promise<string | null> {
  try {
    const manifest = await loadVocabularyImageManifest(category);
    const filename = manifest[word.toLowerCase()];
    
    if (filename) {
      const basePath = process.env.NODE_ENV === 'production' ? '/eleven-plus-vocab' : '';
      return `${basePath}/images/words/${category}/${filename}`;
    }
    
    return null;
  } catch {
    return null;
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
    
    const speakWithVoice = () => {
      const utterance = new SpeechSynthesisUtterance(word);
      
      // iOS-specific fixes for proper English pronunciation (mobile only)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 'ontouchstart' in window;
      
      if (isIOS) {
        // On iOS, use more specific language codes that work better
        utterance.lang = 'en-US';
        
        // Get all available voices
        const voices = window.speechSynthesis.getVoices();
        
        // Look for specific iOS English voices that work well
        const preferredVoices = [
          'Samantha', 'Alex', 'Victoria', 'Fred', 'Vicki', 'Daniel'
        ];
        
        let selectedVoice = null;
        
        // Try to find a preferred English voice by name
        for (const voiceName of preferredVoices) {
          selectedVoice = voices.find(voice => 
            voice.name.includes(voiceName) && voice.lang.startsWith('en')
          );
          if (selectedVoice) break;
        }
        
        // Fallback to any English voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.lang === 'en-US' || voice.lang === 'en-GB'
          ) || voices.find(voice => voice.lang.startsWith('en'));
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        // iOS-specific speech settings
        utterance.rate = 0.7; // Slower rate works better on iOS
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
      } else {
        // Non-iOS devices (including macOS)
        utterance.lang = 'en-US';
        
        const voices = window.speechSynthesis.getVoices();
        const isMac = /Mac|macOS/.test(navigator.userAgent);
        
        if (isMac) {
          // macOS-specific voice selection
          const preferredMacVoices = ['Alex', 'Samantha', 'Victoria', 'Fred'];
          let selectedVoice = null;
          
          // Try to find a preferred macOS voice
          for (const voiceName of preferredMacVoices) {
            selectedVoice = voices.find(voice => 
              voice.name === voiceName && voice.lang.startsWith('en')
            );
            if (selectedVoice) break;
          }
          
          // Fallback to any English voice
          if (!selectedVoice) {
            selectedVoice = voices.find(voice => 
              voice.lang === 'en-US'
            ) || voices.find(voice => 
              voice.lang.startsWith('en')
            );
          }
          
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        } else {
          // Other devices (Windows, Linux, etc.)
          const englishVoice = voices.find(voice => 
            voice.lang.startsWith('en') && voice.lang.includes('US')
          ) || voices.find(voice => 
            voice.lang.startsWith('en')
          );
          
          if (englishVoice) {
            utterance.voice = englishVoice;
          }
        }
        
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
      }
      
      // Add error handling
      utterance.onerror = (event) => {
        console.warn('Speech synthesis error:', event.error);
      };
      
      window.speechSynthesis.speak(utterance);
    };
    
    // iOS needs special handling for voice loading (mobile only)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 'ontouchstart' in window;
    
    if (isIOS) {
      // On iOS, always wait for voiceschanged event
      const handleVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        setTimeout(speakWithVoice, 50); // Small delay for iOS
      };
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        speakWithVoice();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        // Trigger voice loading on iOS
        window.speechSynthesis.getVoices();
      }
    } else {
      // Non-iOS handling
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        speakWithVoice();
      } else {
        const handleVoicesChanged = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          speakWithVoice();
        };
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          speakWithVoice();
        }, 100);
      }
    }
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