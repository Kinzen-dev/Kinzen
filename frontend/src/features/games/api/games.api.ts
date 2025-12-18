import { apiClient } from '@/shared/lib/api-client';
import { Leaderboard, UserGameHistory, SubmitScoreRequest, SubmitScoreResponse } from '../types';

export const gamesApi = {
  submitScore: async (data: SubmitScoreRequest): Promise<SubmitScoreResponse> => {
    const response = await apiClient.post<SubmitScoreResponse>('/games/scores', data);
    return response.data;
  },

  getLeaderboard: async (gameName: string, limit: number = 10): Promise<Leaderboard> => {
    const response = await apiClient.get<Leaderboard>(
      `/games/leaderboard/${gameName}?limit=${limit}`
    );
    return response.data;
  },

  getUserHistory: async (gameName: string): Promise<UserGameHistory> => {
    const response = await apiClient.get<UserGameHistory>(`/games/history/${gameName}`);
    return response.data;
  },

  getUserRank: async (gameName: string): Promise<{ rank: number | null }> => {
    const response = await apiClient.get<{ rank: number | null }>(`/games/rank/${gameName}`);
    return response.data;
  },
};
