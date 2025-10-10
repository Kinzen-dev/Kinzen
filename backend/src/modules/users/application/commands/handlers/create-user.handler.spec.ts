import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateUserHandler } from './create-user.handler';
import { CreateUserCommand } from '../create-user.command';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../../domain/entities/user.entity';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let userRepository: any;

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    handler = module.get<CreateUserHandler>(CreateUserHandler);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should create a new user', async () => {
    const command = new CreateUserCommand(
      'test@example.com',
      'password123',
      'John',
      'Doe',
    );

    const expectedUser = new UserEntity(
      '1',
      'test@example.com',
      'hashedPassword',
      'John',
      'Doe',
      ['user'],
      true,
    );

    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(expectedUser);

    const result = await handler.execute(command);

    expect(result).toEqual(expectedUser);
    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(userRepository.create).toHaveBeenCalled();
  });

  it('should throw ConflictException if user already exists', async () => {
    const command = new CreateUserCommand(
      'test@example.com',
      'password123',
      'John',
      'Doe',
    );

    const existingUser = new UserEntity(
      '1',
      'test@example.com',
      'hashedPassword',
      'John',
      'Doe',
    );

    userRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});

