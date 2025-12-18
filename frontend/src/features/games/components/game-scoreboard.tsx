'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { gamesApi } from '../api/games.api';
import { Leaderboard, GAME_NAMES, UserGameHistory } from '../types';
import { useAuth } from '@/shared/hooks/use-auth';
import { Trophy, Medal, Crown, RefreshCw, User, Target, TrendingUp } from 'lucide-react';

interface GameScoreboardProps {
  gameName?: string;
  refreshTrigger?: number;
}

export function GameScoreboard({
  gameName = GAME_NAMES.CHERRY_BELLY_TAP,
  refreshTrigger = 0,
}: GameScoreboardProps) {
  const { isAuthenticated } = useAuth();
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [userHistory, setUserHistory] = useState<UserGameHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'my-stats'>('leaderboard');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leaderboardData, historyData] = await Promise.all([
        gamesApi.getLeaderboard(gameName, 10).catch(() => null),
        isAuthenticated
          ? gamesApi.getUserHistory(gameName).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (leaderboardData) setLeaderboard(leaderboardData);
      if (historyData) setUserHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch scoreboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [gameName, isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <Card className="mx-auto max-w-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Scoreboard
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchData}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Tab Buttons */}
        <div className="mb-4 flex gap-2">
          <Button
            variant={activeTab === 'leaderboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('leaderboard')}
            className={activeTab === 'leaderboard' ? 'bg-pink-500 hover:bg-pink-600' : ''}
          >
            <Trophy className="mr-1 h-4 w-4" />
            Top Players
          </Button>
          {isAuthenticated && (
            <Button
              variant={activeTab === 'my-stats' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('my-stats')}
              className={activeTab === 'my-stats' ? 'bg-pink-500 hover:bg-pink-600' : ''}
            >
              <User className="mr-1 h-4 w-4" />
              My Stats
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
          </div>
        ) : activeTab === 'leaderboard' ? (
          <div className="space-y-2">
            {leaderboard && leaderboard.entries.length > 0 ? (
              <>
                {leaderboard.entries.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between rounded-lg border p-3 ${getRankBgColor(entry.rank)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{entry.playerName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-pink-600">{entry.score}</span>
                      <span className="text-sm text-gray-500">taps</span>
                    </div>
                  </div>
                ))}
                <p className="pt-2 text-center text-sm text-muted-foreground">
                  {leaderboard.totalPlayers} player{leaderboard.totalPlayers !== 1 ? 's' : ''} total
                </p>
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mb-4 text-5xl">🏆</div>
                <p className="text-muted-foreground">No scores yet!</p>
                <p className="text-sm text-muted-foreground">Be the first to play!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {userHistory ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-pink-100 to-pink-50 p-4 text-center">
                    <Target className="mx-auto mb-1 h-5 w-5 text-pink-500" />
                    <p className="text-2xl font-bold text-pink-600">{userHistory.bestScore}</p>
                    <p className="text-xs text-muted-foreground">Best Score</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 p-4 text-center">
                    <Trophy className="mx-auto mb-1 h-5 w-5 text-purple-500" />
                    <p className="text-2xl font-bold text-purple-600">
                      {userHistory.rank ? `#${userHistory.rank}` : '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 p-4 text-center">
                    <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                    <p className="text-2xl font-bold text-blue-600">{userHistory.averageScore}</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-green-100 to-green-50 p-4 text-center">
                    <RefreshCw className="mx-auto mb-1 h-5 w-5 text-green-500" />
                    <p className="text-2xl font-bold text-green-600">{userHistory.totalGames}</p>
                    <p className="text-xs text-muted-foreground">Games Played</p>
                  </div>
                </div>

                {/* Recent Games */}
                {userHistory.scores.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium text-muted-foreground">Recent Games</h4>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {userHistory.scores.slice(0, 5).map((score) => (
                        <div
                          key={score.id}
                          className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {new Date(score.createdAt).toLocaleDateString()}
                          </span>
                          <span className="font-medium text-pink-600">{score.score} taps</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mb-4 text-5xl">🎮</div>
                <p className="text-muted-foreground">No games played yet!</p>
                <p className="text-sm text-muted-foreground">Start playing to see your stats!</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
