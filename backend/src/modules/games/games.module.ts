import { Module } from '@nestjs/common';
import { GamesController } from './presentation/controllers/games.controller';
import { GamesService } from './application/services/games.service';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
