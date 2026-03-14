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
  if (words.length < 4) return null; // We need at least 4 words for options

  const mode = modes[getRandomInt(0, modes.length - 1)];
  const correctWord = words[getRandomInt(0, words.length - 1)];
  
  // Get 3 random wrong words
  const wrongWords = shuffleArray(words.filter(w => w.id !== correctWord.id)).slice(0, 3);
  const optionsList = shuffleArray([correctWord, ...wrongWords]);

  const id = Math.random().toString(36).substring(2, 9);

  switch (mode) {
    case 'en-cz':
      return {
        id,
        type: mode,
        questionText: correctWord.en,
        correctAnswer: correctWord.cz,
        options: optionsList.map(w => w.cz),
        audioText: correctWord.en // Optional: play when showing
      };
    case 'cz-en':
      return {
        id,
        type: mode,
        questionText: correctWord.cz,
        correctAnswer: correctWord.en,
        options: optionsList.map(w => w.en),
      };
    case 'listen':
      return {
        id,
        type: mode,
        questionText: 'Poslouchej...',
        correctAnswer: correctWord.en,
        options: optionsList.map(w => w.en),
        audioText: correctWord.en
      };
    case 'spelling':
      return {
        id,
        type: mode,
        questionText: 'Napiš, co slyšíš',
        correctAnswer: correctWord.en.toLowerCase(), // Normalize for checking
        audioText: correctWord.en
      };
  }
};

export const playAudio = (text: string) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // or en-GB
    utterance.rate = 0.8; // Slightly slower for kids
    window.speechSynthesis.speak(utterance);
  }
};
