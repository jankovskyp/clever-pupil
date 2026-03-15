import { EnglishMode, EnglishProblem, VocabularyWord } from '../types/english';

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const generateEnglishProblem = (
  words: VocabularyWord[], 
  modes: EnglishMode[]
): EnglishProblem | null => {
  if (words.length < 1) return null;

  const mode = modes[getRandomInt(0, modes.length - 1)];
  const correctWord = words[getRandomInt(0, words.length - 1)];
  const id = Math.random().toString(36).substring(2, 9);

  // Pool of basic words for generic fallback
  const basicPool = ['cat', 'dog', 'apple', 'sun', 'red', 'blue', 'one', 'car', 'tree', 'book'];

  const getOptions = () => {
    // In simplified mode, distractors are just a flat list of strings (similar English words)
    const candidates = correctWord.distractors || [];

    // Fallback: Add other words from the main vocabulary
    const otherWords = words
      .filter(w => w.id !== correctWord.id)
      .map(w => w.en);
    
    // Final mixing and slicing
    let finalPool = [...new Set([...candidates, ...otherWords, ...basicPool])];
    
    // Filter out the correct answer from the distractors pool
    finalPool = finalPool.filter(w => w.toLowerCase() !== correctWord.en.toLowerCase());
    
    return shuffleArray([correctWord.en, ...shuffleArray(finalPool).slice(0, 3)]);
  };

  switch (mode) {
    case 'listen':
      return {
        id,
        type: mode,
        questionText: '?',
        correctAnswer: correctWord.en,
        options: getOptions(),
        audioUrl: correctWord.audio_url
      };
    case 'spelling':
      return {
        id,
        type: mode,
        questionText: '?',
        correctAnswer: correctWord.en.toLowerCase(),
        audioUrl: correctWord.audio_url
      };
  }
};

export const playAudio = (url: string) => {
  if (!url) return;
  const audio = new Audio(url);
  audio.play().catch(e => console.error('Failed to play audio:', e));
};
