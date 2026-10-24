import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { DayClose } from '../entities/day-close.entity';
import { CashLedgerService } from './cash-ledger.service';
import { CreateExpenseInput } from '@pharmacy/shared';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(DayClose)
    private readonly dayCloseRepo: Repository<DayClose>,
    private readonly cashLedgerService: CashLedgerService,
    private readonly dataSource: DataSource,
  ) {}

  async listCategories(storeId = 1) {
    return this.categoryRepo.find({
      where: { storeId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async listExpenses(
    filter: { startDate?: string; endDate?: string; categoryId?: string },
    storeId = 1,
  ) {
    const qb = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'cat')
      .leftJoinAndSelect('expense.paymentMethod', 'pm')
      .leftJoinAndSelect('expense.bankAccount', 'bank')
      .where('expense.storeId = :storeId', { storeId });

    if (filter.startDate && filter.endDate) {
      qb.andWhere('expense.expenseDate BETWEEN :start AND :end', {
        start: filter.startDate,
        end: filter.endDate,
      });
    } else if (filter.startDate) {
      qb.andWhere('expense.expenseDate >= :start', { start: filter.startDate });
    } else if (filter.endDate) {
      qb.andWhere('expense.expenseDate <= :end', { end: filter.endDate });
    }

    if (filter.categoryId) {
      qb.andWhere('expense.categoryId = :catId', { catId: filter.categoryId });
    }

    const expenses = await qb
      .orderBy('expense.expenseDate', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC')
      .getMany();

    const sumResult = await qb
      .select('SUM(expense.amountLkr)', 'totalExpenses')
      .getRawOne();

    return {
      expenses: expenses.map((e) => ({
        ...e,
        amountLkr: Number(e.amountLkr),
      })),
      totalExpensesLkr: Number(
        parseFloat(sumResult?.totalExpenses || '0').toFixed(2),
      ),
    };
  }

  async recordExpense(input: CreateExpenseInput, userId: string, storeId = 1) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Day Locking Check: reject modifications to locked dates
      const dayClose = await manager.findOne(DayClose, {
        where: { closingDate: input.expenseDate as unknown as Date, storeId },
      });

      if (dayClose && dayClose.isLocked) {
        throw new BadRequestException(
          `Date ${input.expenseDate} is locked by Day-Close register`,
        );
      }

      // 2. Validate category
      const category = await manager.findOne(ExpenseCategory, {
        where: { id: input.categoryId, storeId },
      });
      if (!category) {
        throw new NotFoundException(`Expense category ${input.categoryId} not found`);
      }

      // 3. Validate payment method
      const pm = await manager.findOne(PaymentMethod, {
        where: { id: input.paymentMethodId },
      });
      if (!pm) {
        throw new NotFoundException(`Payment method ${input.paymentMethodId} not found`);
      }

      // 4. Save Expense
      const expense = manager.create(Expense, {
        storeId,
        expenseDate: input.expenseDate,
        categoryId: category.id,
        amountLkr: Number(input.amountLkr),
        paymentMethodId: pm.id,
        bankAccountId: input.bankAccountId || undefined,
        description: input.description,
        receiptImageUrl: input.receiptImageUrl || undefined,
        createdByUserId: userId,
      });
      const savedExpense = await manager.save(expense);

      // 5. Post to Cash Ledger atomically
      await this.cashLedgerService.recordEntry(
        {
          storeId,
          entryDate: new Date(input.expenseDate),
          direction: 'OUT',
          amountLkr: Number(input.amountLkr),
          paymentMethodId: pm.id,
          bankAccountId: input.bankAccountId || undefined,
          sourceType: 'EXPENSE',
          sourceId: savedExpense.id,
          description: `Expense: ${category.name} - ${input.description}`,
          userId,
        },
        manager,
      );

      return {
        ...savedExpense,
        amountLkr: Number(savedExpense.amountLkr),
      };
    });
  }
}
