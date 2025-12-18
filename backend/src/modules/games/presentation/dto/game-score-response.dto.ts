export class GameScoreResponseDto {
  id: string;
  userId: string;
  gameName: string;
  score: number;
  duration: number;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export class LeaderboardEntryDto {
  rank: number;
  userId: string;
  playerName: string;
  score: number;
  createdAt: Date;
}

export class LeaderboardResponseDto {
  gameName: string;
  entries: LeaderboardEntryDto[];
  totalPlayers: number;
}

export class UserGameHistoryDto {
  scores: GameScoreResponseDto[];
  bestScore: number;
  totalGames: number;
  averageScore: number;
}
