import { Module } from '@nestjs/common';
import { UsersController } from './presentation/controllers/users.controller';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { CreateUserHandler } from './application/commands/handlers/create-user.handler';
import { GetUserByIdHandler } from './application/queries/handlers/get-user-by-id.handler';

@Module({
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    CreateUserHandler,
    GetUserByIdHandler,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}

