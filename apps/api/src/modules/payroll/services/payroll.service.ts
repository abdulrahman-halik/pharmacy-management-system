import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EmployeePayroll } from '../entities/employee-payroll.entity';
import { PayrollDeductionItem } from '../entities/payroll-deduction-item.entity';
import {
  SalaryAdvance,
  AdvanceStatus,
} from '../entities/salary-advance.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentMethod } from '../../finance/entities/payment-method.entity';
import { CashLedgerService } from '../../finance/services/cash-ledger.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { SalaryAdvanceService } from './salary-advance.service';
import {
  DisbursePayrollInput,
  UpdateStaffCompensationInput,
  StaffCompensationDto,
  PayrollMonthSummaryDto,
  PayrollStatus,
} from '@pharmacy/shared';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @InjectRepository(EmployeePayroll)
    private readonly payrollRepo: Repository<EmployeePayroll>,
    @InjectRepository(PayrollDeductionItem)
    private readonly deductionRepo: Repository<PayrollDeductionItem>,
    @InjectRepository(SalaryAdvance)
    private readonly advanceRepo: Repository<SalaryAdvance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    private readonly calculationService: PayrollCalculationService,
    private readonly advanceService: SalaryAdvanceService,
    private readonly cashLedgerService: CashLedgerService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generates or recalculates monthly payroll for active employees.
   * Safe and idempotent: Already DISBURSED records are never overwritten.
   */
  async generateMonthlyPayroll(
    monthYear: string,
    specificUserIds?: string[],
    storeId = 1,
  ): Promise<EmployeePayroll[]> {
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      throw new BadRequestException('monthYear must be in YYYY-MM format');
    }

    const userQuery = this.userRepo
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true });

    if (specificUserIds && specificUserIds.length > 0) {
      userQuery.andWhere('user.id IN (:...userIds)', {
        userIds: specificUserIds,
      });
    }

    const activeUsers = await userQuery.getMany();

    const existingPayrolls = await this.payrollRepo.find({
      where: {
        monthYear,
        storeId,
      },
      relations: ['deductionItems'],
    });

    const existingMap = new Map(existingPayrolls.map((p) => [p.userId, p]));
    const results: EmployeePayroll[] = [];

    await this.dataSource.transaction(async (manager) => {
      const pRepo = manager.getRepository(EmployeePayroll);
      const dRepo = manager.getRepository(PayrollDeductionItem);

      for (const user of activeUsers) {
        const existing = existingMap.get(user.id);

        // If already DISBURSED or APPROVED, leave untouched to preserve financial immutability
        if (
          existing &&
          (existing.status === ('DISBURSED' as PayrollStatus) ||
            existing.status === ('APPROVED' as PayrollStatus))
        ) {
          results.push(existing);
          continue;
        }

        const baseSalary = Number(user.monthlySalary || 0);

        // Fetch active advances FIFO for this user
        const activeAdvances =
          await this.advanceService.getActiveAdvancesForUser(user.id, storeId);

        const calculated = this.calculationService.calculatePayrollLine({
          baseSalaryLkr: baseSalary,
          bonusAllowanceLkr: existing ? Number(existing.bonusAllowanceLkr) : 0,
          overtimeLkr: existing ? Number(existing.overtimeLkr) : 0,
          otherDeductionsLkr: existing
            ? Number(existing.otherDeductionsLkr)
            : 0,
          activeAdvances,
        });

        let targetPayroll = existing;
        if (!targetPayroll) {
          targetPayroll = pRepo.create({
            storeId,
            userId: user.id,
            monthYear,
            status: 'DRAFT' as PayrollStatus,
            deductionItems: [],
          });
        } else {
          // Clear previous draft deduction items before reapplying
          await dRepo.delete({ payrollId: targetPayroll.id });
          targetPayroll.deductionItems = [];
        }

        targetPayroll.baseSalaryLkr = calculated.baseSalaryLkr;
        targetPayroll.bonusAllowanceLkr = calculated.bonusAllowanceLkr;
        targetPayroll.overtimeLkr = calculated.overtimeLkr;
        targetPayroll.grossEarningsLkr = calculated.grossEarningsLkr;
        targetPayroll.statutoryDeductionsLkr = calculated.statutoryDeductionsLkr;
        targetPayroll.advanceDeductedLkr = calculated.advanceDeductedLkr;
        targetPayroll.otherDeductionsLkr = calculated.otherDeductionsLkr;
        targetPayroll.netPayableLkr = calculated.netPayableLkr;
        targetPayroll.advanceCarriedForwardLkr =
          calculated.advanceCarriedForwardLkr;
        targetPayroll.status = 'DRAFT' as PayrollStatus;

        const savedPayroll = await pRepo.save(targetPayroll);

        const deductionItemsToInsert: PayrollDeductionItem[] = [];

        // 1. Statutory EPF item
        if (calculated.statutoryDeductionsLkr > 0) {
          deductionItemsToInsert.push(
            dRepo.create({
              storeId,
              payrollId: savedPayroll.id,
              description: 'EPF Employee Contribution (8%)',
              amountLkr: calculated.statutoryDeductionsLkr,
            }),
          );
        }

        // 2. Advance recoveries
        for (const item of calculated.settledAdvances) {
          if (item.deductedFromThis > 0) {
            deductionItemsToInsert.push(
              dRepo.create({
                storeId,
                payrollId: savedPayroll.id,
                salaryAdvanceId: item.advanceId,
                description: `Salary Advance Recovery (#${item.advanceId.slice(0, 8)})`,
                amountLkr: item.deductedFromThis,
              }),
            );
          }
        }

        // 3. Other deductions
        if (calculated.otherDeductionsLkr > 0) {
          deductionItemsToInsert.push(
            dRepo.create({
              storeId,
              payrollId: savedPayroll.id,
              description: 'Other Pre-authorized Deductions',
              amountLkr: calculated.otherDeductionsLkr,
            }),
          );
        }

        if (deductionItemsToInsert.length > 0) {
          savedPayroll.deductionItems = await dRepo.save(
            deductionItemsToInsert,
          );
        } else {
          savedPayroll.deductionItems = [];
        }

        savedPayroll.user = user;
        results.push(savedPayroll);
      }
    });

    return results;
  }

  /**
   * Retrieves summary and list for a monthly payroll run.
   */
  async getMonthlyPayroll(
    monthYear: string,
    storeId = 1,
  ): Promise<PayrollMonthSummaryDto> {
    const payrolls = await this.payrollRepo.find({
      where: { monthYear, storeId },
      relations: ['user', 'deductionItems'],
      order: { createdAt: 'ASC' },
    });

    let totalBaseSalaryLkr = 0;
    let totalBonusLkr = 0;
    let totalOvertimeLkr = 0;
    let totalGrossEarningsLkr = 0;
    let totalStatutoryDeductionsLkr = 0;
    let totalAdvanceRecoveredLkr = 0;
    let totalOtherDeductionsLkr = 0;
    let totalNetPayableLkr = 0;
    let totalAdvanceCarriedForwardLkr = 0;

    const mappedPayrolls = payrolls.map((p) => {
      const base = Number(p.baseSalaryLkr || 0);
      const bonus = Number(p.bonusAllowanceLkr || 0);
      const ot = Number(p.overtimeLkr || 0);
      const gross = Number(p.grossEarningsLkr || 0);
      const stat = Number(p.statutoryDeductionsLkr || 0);
      const adv = Number(p.advanceDeductedLkr || 0);
      const other = Number(p.otherDeductionsLkr || 0);
      const net = Number(p.netPayableLkr || 0);
      const carried = Number(p.advanceCarriedForwardLkr || 0);

      totalBaseSalaryLkr += base;
      totalBonusLkr += bonus;
      totalOvertimeLkr += ot;
      totalGrossEarningsLkr += gross;
      totalStatutoryDeductionsLkr += stat;
      totalAdvanceRecoveredLkr += adv;
      totalOtherDeductionsLkr += other;
      totalNetPayableLkr += net;
      totalAdvanceCarriedForwardLkr += carried;

      return {
        id: p.id,
        storeId: p.storeId,
        userId: p.userId,
        userFullName: p.user?.fullName,
        userEmail: p.user?.email,
        userRole: p.user?.role,
        epfNumber: p.user?.epfNumber,
        bankName: p.user?.bankName,
        bankAccountNumber: p.user?.bankAccountNumber,
        monthYear: p.monthYear,
        baseSalaryLkr: base,
        bonusAllowanceLkr: bonus,
        overtimeLkr: ot,
        grossEarningsLkr: gross,
        statutoryDeductionsLkr: stat,
        advanceDeductedLkr: adv,
        otherDeductionsLkr: other,
        netPayableLkr: net,
        advanceCarriedForwardLkr: carried,
        status: p.status,
        disbursedAt: p.disbursedAt ? p.disbursedAt.toISOString() : null,
        disbursementMethod: p.disbursementMethod,
        deductionItems: (p.deductionItems || []).map((d) => ({
          id: d.id,
          payrollId: d.payrollId,
          salaryAdvanceId: d.salaryAdvanceId,
          description: d.description,
          amountLkr: Number(d.amountLkr),
          createdAt: d.createdAt ? d.createdAt.toISOString() : '',
        })),
        createdAt: p.createdAt ? p.createdAt.toISOString() : '',
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : '',
      };
    });

    return {
      monthYear,
      totalEmployees: mappedPayrolls.length,
      totalBaseSalaryLkr: Number(totalBaseSalaryLkr.toFixed(2)),
      totalBonusLkr: Number(totalBonusLkr.toFixed(2)),
      totalOvertimeLkr: Number(totalOvertimeLkr.toFixed(2)),
      totalGrossEarningsLkr: Number(totalGrossEarningsLkr.toFixed(2)),
      totalStatutoryDeductionsLkr: Number(
        totalStatutoryDeductionsLkr.toFixed(2),
      ),
      totalAdvanceRecoveredLkr: Number(totalAdvanceRecoveredLkr.toFixed(2)),
      totalOtherDeductionsLkr: Number(totalOtherDeductionsLkr.toFixed(2)),
      totalNetPayableLkr: Number(totalNetPayableLkr.toFixed(2)),
      totalAdvanceCarriedForwardLkr: Number(
        totalAdvanceCarriedForwardLkr.toFixed(2),
      ),
      payrolls: mappedPayrolls,
    };
  }

  /**
   * Finalizes and disburses an individual employee's monthly payslip.
   * Clears/updates linked advance balances and writes a SALARY CASH_OUT transaction.
   */
  async disbursePayroll(
    payrollId: string,
    input: DisbursePayrollInput,
    currentUserId: string,
    storeId = 1,
  ): Promise<EmployeePayroll> {
    const payroll = await this.payrollRepo.findOne({
      where: { id: payrollId, storeId },
      relations: ['user', 'deductionItems'],
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll record #${payrollId} not found`);
    }

    if (payroll.status === ('DISBURSED' as PayrollStatus)) {
      throw new BadRequestException(
        `Payroll #${payrollId} has already been disbursed on ${payroll.disbursedAt}`,
      );
    }

    // Determine payment method code
    const methodCode =
      input.disbursementMethod === 'BANK_TRANSFER' ? 'BANK' : 'CASH';
    const paymentMethod = await this.paymentMethodRepo.findOne({
      where: { code: methodCode },
    });

    if (!paymentMethod) {
      throw new BadRequestException(
        `Payment method for ${methodCode} not configured in system`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const pRepo = manager.getRepository(EmployeePayroll);
      const advRepo = manager.getRepository(SalaryAdvance);

      // 1. Recover and settle linked advances
      for (const item of payroll.deductionItems || []) {
        if (item.salaryAdvanceId && Number(item.amountLkr) > 0) {
          const advance = await advRepo.findOne({
            where: { id: item.salaryAdvanceId },
            lock: { mode: 'pessimistic_write' },
          });

          if (advance) {
            const currentRecovered = Number(advance.recoveredAmountLkr || 0);
            const newRecovered = Number(
              (currentRecovered + Number(item.amountLkr)).toFixed(2),
            );
            const totalAmount = Number(advance.amountLkr);
            const newRemaining = Math.max(
              0,
              Number((totalAmount - newRecovered).toFixed(2)),
            );

            advance.recoveredAmountLkr = newRecovered;
            advance.remainingBalanceLkr = newRemaining;
            advance.status =
              newRemaining <= 0.001
                ? ('CLEARED' as AdvanceStatus)
                : ('PARTIALLY_RECOVERED' as AdvanceStatus);

            await advRepo.save(advance);
          }
        }
      }

      // 2. Post SALARY Cashbook transaction if net pay > 0
      const netPay = Number(payroll.netPayableLkr || 0);
      if (netPay > 0) {
        await this.cashLedgerService.recordEntry(
          {
            storeId,
            entryDate: new Date(),
            direction: 'OUT',
            amountLkr: netPay,
            paymentMethodId: paymentMethod.id,
            bankAccountId: input.bankAccountId || undefined,
            sourceType: 'SALARY',
            sourceId: payroll.id,
            description: `Salary payout for ${payroll.user?.fullName || 'Staff'} (${payroll.monthYear})`,
            userId: currentUserId,
          },
          manager,
        );
      }

      // 3. Mark payroll record as DISBURSED
      payroll.status = 'DISBURSED' as PayrollStatus;
      payroll.disbursedAt = new Date();
      payroll.disbursementMethod = input.disbursementMethod;

      return pRepo.save(payroll);
    });
  }

  /**
   * Retrieves staff compensation directory for HR management.
   */
  async getStaffCompensationList(storeId = 1): Promise<StaffCompensationDto[]> {
    const users = await this.userRepo.find({
      order: { fullName: 'ASC' },
    });

    const results: StaffCompensationDto[] = [];
    for (const u of users) {
      const activeAdvance = await this.advanceService.getTotalActiveAdvanceLkr(
        u.id,
        storeId,
      );
      results.push({
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        monthlySalaryLkr: Number(u.monthlySalary || 0),
        epfNumber: u.epfNumber,
        bankName: u.bankName,
        bankAccountNumber: u.bankAccountNumber,
        bankBranch: u.bankBranch,
        isActive: u.isActive,
        activeAdvanceTotalLkr: activeAdvance,
      });
    }

    return results;
  }

  /**
   * Updates staff base salary and statutory banking details.
   */
  async updateStaffCompensation(
    userId: string,
    input: UpdateStaffCompensationInput,
  ): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    user.monthlySalary = Number(input.monthlySalary);
    if (input.epfNumber !== undefined) user.epfNumber = input.epfNumber;
    if (input.bankName !== undefined) user.bankName = input.bankName;
    if (input.bankAccountNumber !== undefined)
      user.bankAccountNumber = input.bankAccountNumber;
    if (input.bankBranch !== undefined) user.bankBranch = input.bankBranch;

    return this.userRepo.save(user);
  }

  /**
   * Fetches full payroll details for payslip generation.
   */
  async getPayrollById(
    payrollId: string,
    storeId = 1,
  ): Promise<EmployeePayroll> {
    const payroll = await this.payrollRepo.findOne({
      where: { id: payrollId, storeId },
      relations: ['user', 'deductionItems'],
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll record #${payrollId} not found`);
    }

    return payroll;
  }
}
