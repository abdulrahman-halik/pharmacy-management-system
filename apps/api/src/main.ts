import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port);
  logger.log(`Pharmacy Management API running on: http://localhost:${port}`);
  logger.log(`Health liveness endpoint: http://localhost:${port}/health/liveness`);
  logger.log(`Health readiness endpoint: http://localhost:${port}/health/readiness`);
}

bootstrap();
