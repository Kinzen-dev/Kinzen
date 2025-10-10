import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { GetUserByIdQuery } from '../get-user-by-id.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../../domain/entities/user.entity';

@Injectable()
export class GetUserByIdHandler {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<UserEntity> {
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${query.userId} not found`);
    }
    return user;
  }
}
