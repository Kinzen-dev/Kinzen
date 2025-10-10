import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Serve Swagger UI static assets from node_modules
  // Use require.resolve to find the actual swagger-ui-dist location
  const swaggerUiPath = require('swagger-ui-dist').getAbsoluteFSPath();
  app.useStaticAssets(swaggerUiPath, {
    prefix: '/docs/',
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Kinzen API')
    .setDescription(
      'Kinzen Backend API - Personal website featuring portfolio, cars, stocks, football, and more',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger at root level (NOT under API prefix)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Global prefix for API routes
  const apiPrefix = configService.get('app.apiPrefix');
  app.setGlobalPrefix(apiPrefix);

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow loading Swagger UI assets
    }),
  );
  app.use(compression());

  // CORS
  const corsOrigins = configService.get('cors.origins');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Start server
  const port = configService.get('app.port');
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
  logger.log(`🔧 Environment: ${configService.get('app.nodeEnv')}`);
}

bootstrap();
