import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  CreateGameScoreDto,
  GameScoreResponseDto,
  LeaderboardResponseDto,
  UserGameHistoryDto,
} from '../../presentation/dto';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async createScore(userId: string, dto: CreateGameScoreDto): Promise<GameScoreResponseDto> {
    const score = await this.prisma.gameScore.create({
      data: {
        userId,
        gameName: dto.gameName,
        score: dto.score,
        duration: dto.duration,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return score;
  }

  async getLeaderboard(gameName: string, limit: number = 10): Promise<LeaderboardResponseDto> {
    // Get top scores with distinct users (only their best score)
    const scores = await this.prisma.gameScore.findMany({
      where: { gameName },
      orderBy: { score: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get unique users with their best score
    const userBestScores = new Map<
      string,
      {
        score: number;
        createdAt: Date;
        user: { id: string; firstName: string | null; lastName: string | null; email: string };
      }
    >();

    for (const score of scores) {
      if (
        !userBestScores.has(score.userId) ||
        score.score > userBestScores.get(score.userId)!.score
      ) {
        userBestScores.set(score.userId, {
          score: score.score,
          createdAt: score.createdAt,
          user: score.user,
        });
      }
    }

    // Sort by score and take top N
    const sortedEntries = Array.from(userBestScores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit);

    const entries = sortedEntries.map(([userId, data], index) => ({
      rank: index + 1,
      userId,
      playerName: this.getPlayerName(data.user),
      score: data.score,
      createdAt: data.createdAt,
    }));

    // Count total unique players
    const totalPlayers = await this.prisma.gameScore.groupBy({
      by: ['userId'],
      where: { gameName },
    });

    return {
      gameName,
      entries,
      totalPlayers: totalPlayers.length,
    };
  }

  async getUserHistory(userId: string, gameName: string): Promise<UserGameHistoryDto> {
    const scores = await this.prisma.gameScore.findMany({
      where: {
        userId,
        gameName,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Last 50 games
    });

    const totalGames = scores.length;
    const bestScore = scores.length > 0 ? Math.max(...scores.map((s) => s.score)) : 0;
    const averageScore =
      totalGames > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / totalGames) : 0;

    return {
      scores,
      bestScore,
      totalGames,
      averageScore,
    };
  }

  async getUserRank(userId: string, gameName: string): Promise<number | null> {
    // Get user's best score
    const userBest = await this.prisma.gameScore.findFirst({
      where: { userId, gameName },
      orderBy: { score: 'desc' },
    });

    if (!userBest) return null;

    // Count players with higher best score
    const allScores = await this.prisma.gameScore.findMany({
      where: { gameName },
      orderBy: { score: 'desc' },
    });

    const userBestScores = new Map<string, number>();
    for (const score of allScores) {
      if (!userBestScores.has(score.userId) || score.score > userBestScores.get(score.userId)!) {
        userBestScores.set(score.userId, score.score);
      }
    }

    const sortedScores = Array.from(userBestScores.entries()).sort((a, b) => b[1] - a[1]);

    const rank = sortedScores.findIndex(([id]) => id === userId) + 1;
    return rank || null;
  }

  private getPlayerName(user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  }): string {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    // Use email prefix as fallback
    return user.email.split('@')[0];
  }
}
