import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { DayCloseService } from '../services/day-close.service';

@Injectable()
export class DayLockGuard implements CanActivate {
  constructor(private readonly dayCloseService: DayCloseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body || {};
    const query = request.query || {};

    const targetDate =
      body.closingDate ||
      body.expenseDate ||
      body.saleDate ||
      query.date ||
      new Date().toISOString().split('T')[0];

    const isLocked = await this.dayCloseService.isDateLocked(targetDate);
    if (isLocked) {
      throw new BadRequestException(
        `Date ${targetDate} is locked by Day-Close register`,
      );
    }

    return true;
  }
}
