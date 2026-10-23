import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('liveness')
  async getLiveness() {
    return this.healthService.checkLiveness();
  }

  @Get('readiness')
  async getReadiness(@Res() res: Response) {
    const result = await this.healthService.checkReadiness();
    const statusCode = result.status === 'READY' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json(result);
  }
}
