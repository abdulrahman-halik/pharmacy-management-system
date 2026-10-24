import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { getEnv } from '../../config/env';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const env = getEnv();
        return new Redis({
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD,
          db: env.REDIS_DB,
          maxRetriesPerRequest: 2,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
