import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  SalaryAdvance,
  AdvanceStatus,
} from '../entities/salary-advance.entity';
import { User } from '../../users/entities/user.entity';
import { CashLedgerService } from '../../finance/services/cash-ledger.service';
import { PaymentMethod } from '../../finance/entities/payment-method.entity';
import {
  CreateSalaryAdvanceInput,
  SalaryAdvanceQueryInput,
  DEFAULT_ADVANCE_CAP_RATIO,
} from '@pharmacy/shared';

@Injectable()
export class SalaryAdvanceService {
  private readonly logger = new Logger(SalaryAdvanceService.name);

  constructor(
    @InjectRepository(SalaryAdvance)
    private readonly advanceRepo: Repository<SalaryAdvance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    private readonly cashLedgerService: CashLedgerService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Issues a salary advance to an employee.
   * Enforces the 50% base salary cap (unless explicitly overridden by Admin/Manager).
   * Automatically writes a CASH_OUT entry to the cash ledger (double-entry).
   */
  async createAdvance(
    input: CreateSalaryAdvanceInput,
    approverUserId: string,
    storeId = 1,
  ): Promise<SalaryAdvance> {
    const user = await this.userRepo.findOne({
      where: { id: input.userId },
    });
    if (!user) {
      throw new NotFoundException(`Employee user #${input.userId} not found`);
    }

    if (!user.isActive) {
      throw new BadRequestException('Cannot issue advance to an inactive employee');
    }

    const baseSalary = Number(user.monthlySalary || 0);
    const maxAllowedWithoutOverride = Number(
      (baseSalary * DEFAULT_ADVANCE_CAP_RATIO).toFixed(2),
    );

    if (
      baseSalary > 0 &&
      input.amountLkr > maxAllowedWithoutOverride &&
      !input.overrideCap
    ) {
      throw new BadRequestException(
        `Advance of Rs. ${input.amountLkr.toFixed(2)} exceeds 50% salary cap of Rs. ${maxAllowedWithoutOverride.toFixed(2)}. Requires admin authorization override.`,
      );
    }

    // Verify payment method exists and is active
    const paymentMethod = await this.paymentMethodRepo.findOne({
      where: { id: input.paymentMethodId },
    });
    if (!paymentMethod || !paymentMethod.isActive) {
      throw new BadRequestException('Selected payment method is invalid or inactive');
    }

    return this.dataSource.transaction(async (manager) => {
      const advanceRepo = manager.getRepository(SalaryAdvance);

      const advance = advanceRepo.create({
        storeId,
        userId: user.id,
        advanceDate: new Date().toISOString().split('T')[0],
        amountLkr: Number(input.amountLkr),
        recoveredAmountLkr: 0.0,
        remainingBalanceLkr: Number(input.amountLkr),
        reason: input.reason.trim(),
        paymentMethodId: input.paymentMethodId,
        status: 'OUTSTANDING' as AdvanceStatus,
        approvedByUserId: approverUserId,
      });

      const savedAdvance = await advanceRepo.save(advance);

      // Instant double-entry cashbook posting: CASH_OUT (Source: ADVANCE)
      await this.cashLedgerService.recordEntry(
        {
          storeId,
          entryDate: new Date(),
          direction: 'OUT',
          amountLkr: Number(savedAdvance.amountLkr),
          paymentMethodId: savedAdvance.paymentMethodId,
          sourceType: 'ADVANCE',
          sourceId: savedAdvance.id,
          description: `Salary advance to ${user.fullName}: ${savedAdvance.reason}`,
          userId: approverUserId,
        },
        manager,
      );

      this.logger.log(
        `Advance #${savedAdvance.id} of Rs. ${savedAdvance.amountLkr} disbursed to ${user.fullName}`,
      );

      return savedAdvance;
    });
  }

  /**
   * Query advances with filters.
   */
  async getAdvances(query: SalaryAdvanceQueryInput, storeId = 1) {
    const qb = this.advanceRepo
      .createQueryBuilder('advance')
      .leftJoinAndSelect('advance.user', 'user')
      .leftJoinAndSelect('advance.paymentMethod', 'pm')
      .leftJoinAndSelect('advance.approvedByUser', 'approver')
      .where('advance.storeId = :storeId', { storeId });

    if (query.userId) {
      qb.andWhere('advance.userId = :userId', { userId: query.userId });
    }

    if (query.status) {
      qb.andWhere('advance.status = :status', { status: query.status });
    }

    if (query.monthYear) {
      qb.andWhere('advance.advanceDate LIKE :monthYear', {
        monthYear: `${query.monthYear}%`,
      });
    }

    qb.orderBy('advance.advanceDate', 'DESC').addOrderBy(
      'advance.createdAt',
      'DESC',
    );
    qb.skip(query.offset || 0).take(query.limit || 50);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Retrieves active outstanding / partially recovered advances for a specific user.
   */
  async getActiveAdvancesForUser(
    userId: string,
    storeId = 1,
  ): Promise<SalaryAdvance[]> {
    return this.advanceRepo.find({
      where: {
        userId,
        storeId,
        status: In(['OUTSTANDING', 'PARTIALLY_RECOVERED']),
      },
      order: {
        advanceDate: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Retrieve total outstanding advances for all users or a specific user.
   */
  async getTotalActiveAdvanceLkr(userId: string, storeId = 1): Promise<number> {
    const result = await this.advanceRepo
      .createQueryBuilder('advance')
      .select('SUM(advance.remainingBalanceLkr)', 'total')
      .where('advance.userId = :userId', { userId })
      .andWhere('advance.storeId = :storeId', { storeId })
      .andWhere('advance.status IN (:...statuses)', {
        statuses: ['OUTSTANDING', 'PARTIALLY_RECOVERED'],
      })
      .getRawOne();

    return Number(parseFloat(result?.total || '0').toFixed(2));
  }
}
