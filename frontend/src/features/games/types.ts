export interface GameScore {
  id: string;
  userId: string;
  gameName: string;
  score: number;
  duration: number;
  createdAt: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  playerName: string;
  score: number;
  createdAt: string;
}

export interface Leaderboard {
  gameName: string;
  entries: LeaderboardEntry[];
  totalPlayers: number;
}

export interface UserGameHistory {
  scores: GameScore[];
  bestScore: number;
  totalGames: number;
  averageScore: number;
  rank: number | null;
}

export interface SubmitScoreRequest {
  gameName: string;
  score: number;
  duration: number;
}

export interface SubmitScoreResponse extends GameScore {
  rank: number | null;
}

export const GAME_NAMES = {
  CHERRY_BELLY_TAP: 'cherry-belly-tap',
} as const;
