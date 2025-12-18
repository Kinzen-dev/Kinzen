import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { GamesService } from '../../application/services/games.service';
import { CreateGameScoreDto } from '../dto/create-game-score.dto';

interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('scores')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a game score' })
  async submitScore(@CurrentUser() user: AuthUser, @Body() dto: CreateGameScoreDto) {
    const score = await this.gamesService.createScore(user.id, dto);
    const rank = await this.gamesService.getUserRank(user.id, dto.gameName);
    return { ...score, rank };
  }

  @Get('leaderboard/:gameName')
  @Public()
  @ApiOperation({ summary: 'Get game leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLeaderboard(@Param('gameName') gameName: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.gamesService.getLeaderboard(gameName, parsedLimit);
  }

  @Get('history/:gameName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user game history' })
  async getUserHistory(@CurrentUser() user: AuthUser, @Param('gameName') gameName: string) {
    const history = await this.gamesService.getUserHistory(user.id, gameName);
    const rank = await this.gamesService.getUserRank(user.id, gameName);
    return { ...history, rank };
  }

  @Get('rank/:gameName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user rank for a game' })
  async getUserRank(@CurrentUser() user: AuthUser, @Param('gameName') gameName: string) {
    const rank = await this.gamesService.getUserRank(user.id, gameName);
    return { rank };
  }
}
