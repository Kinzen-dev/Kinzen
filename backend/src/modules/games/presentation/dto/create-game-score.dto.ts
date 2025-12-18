import { IsInt, IsNotEmpty, IsString, Min, Max } from 'class-validator';

export class CreateGameScoreDto {
  @IsString()
  @IsNotEmpty()
  gameName: string;

  @IsInt()
  @Min(0)
  score: number;

  @IsInt()
  @Min(1)
  @Max(300) // Max 5 minutes
  duration: number;
}
