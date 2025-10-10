import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'default-secret-change-this',
  expiresIn: process.env.JWT_EXPIRATION || '1h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-this',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));

