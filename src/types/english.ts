export type EnglishMode = 'en-cz' | 'cz-en' | 'listen' | 'spelling';

export interface VocabularyWord {
  id: string;
  en: string;
  cz: string;
  created_at: string;
}

export interface EnglishProblem {
  id: string;
  type: EnglishMode;
  questionText: string;
  correctAnswer: string;
  options?: string[]; // Used for all modes except spelling
  audioText?: string; // The text to be spoken via Web Speech API
}

export type EnglishGameState = 'HOME' | 'SETUP' | 'PLAYING' | 'RESULTS' | 'LEADERBOARD';

export interface EnglishStats {
  correct: number;
  total: number;
  errors: number;
  percentage: number;
}

export interface EnglishLeaderboardEntry {
  id: string;
  name: string;
  score: number;
  errors: number;
  total: number;
  accuracy: number;
  mode: EnglishMode | 'mixed';
  date: string;
}
