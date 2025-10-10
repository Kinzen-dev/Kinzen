import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  it('should create a user entity', () => {
    const user = new UserEntity(
      '1',
      'test@example.com',
      'password',
      'John',
      'Doe',
      ['user'],
      true,
    );

    expect(user.id).toBe('1');
    expect(user.email).toBe('test@example.com');
    expect(user.firstName).toBe('John');
    expect(user.lastName).toBe('Doe');
  });

  it('should return full name', () => {
    const user = new UserEntity(
      '1',
      'test@example.com',
      'password',
      'John',
      'Doe',
    );

    expect(user.fullName).toBe('John Doe');
  });

  it('should check if user has role', () => {
    const user = new UserEntity(
      '1',
      'test@example.com',
      'password',
      'John',
      'Doe',
      ['user', 'admin'],
    );

    expect(user.hasRole('admin')).toBe(true);
    expect(user.hasRole('moderator')).toBe(false);
  });

  it('should check if user is admin', () => {
    const adminUser = new UserEntity(
      '1',
      'admin@example.com',
      'password',
      'Admin',
      'User',
      ['user', 'admin'],
    );

    const regularUser = new UserEntity(
      '2',
      'user@example.com',
      'password',
      'Regular',
      'User',
      ['user'],
    );

    expect(adminUser.isAdmin()).toBe(true);
    expect(regularUser.isAdmin()).toBe(false);
  });
});

