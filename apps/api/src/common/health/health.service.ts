import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import http from 'http';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient?: Redis;

  constructor(private readonly dataSource: DataSource) {}

  private getRedisClient(): Redis {
    if (!this.redisClient) {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || 'pharmacy_redis_secret_2026',
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
      });
    }
    return this.redisClient;
  }

  async checkLiveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness() {
    const services: Record<string, 'UP' | 'DOWN'> = {
      mysql: 'DOWN',
      redis: 'DOWN',
      minio: 'DOWN',
    };

    // 1. Check MySQL
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        services.mysql = 'UP';
      } else {
        this.logger.warn('MySQL DataSource is not initialized');
      }
    } catch (err: any) {
      this.logger.error(`MySQL health check failed: ${err.message}`);
    }

    // 2. Check Redis
    try {
      const redis = this.getRedisClient();
      if (redis.status !== 'ready') {
        await redis.connect();
      }
      const pingResult = await redis.ping();
      if (pingResult === 'PONG') {
        services.redis = 'UP';
      }
    } catch (err: any) {
      this.logger.error(`Redis health check failed: ${err.message}`);
    }

    // 3. Check MinIO
    try {
      const minioHost = process.env.MINIO_HOST || 'localhost';
      const minioPort = parseInt(process.env.MINIO_PORT || '9000', 10);
      const isUp = await new Promise<boolean>((resolve) => {
        const req = http.request(
          {
            hostname: minioHost,
            port: minioPort,
            path: '/minio/health/live',
            method: 'GET',
            timeout: 3000,
          },
          (res) => {
            resolve(res.statusCode === 200);
          },
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });
      if (isUp) {
        services.minio = 'UP';
      }
    } catch (err: any) {
      this.logger.error(`MinIO health check failed: ${err.message}`);
    }

    const allReady = Object.values(services).every((s) => s === 'UP');

    return {
      status: allReady ? 'READY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
