import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashLedgerEntry } from './entities/cash-ledger-entry.entity';
import { BankAccount } from './entities/bank-account.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { Expense } from './entities/expense.entity';
import { DayClose } from './entities/day-close.entity';
import { Sale } from '../pos/entities/sale.entity';
import { SupplierPayment } from '../procurement/entities/supplier-payment.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

import { CashLedgerService } from './services/cash-ledger.service';
import { BankAccountService } from './services/bank-account.service';
import { ExpenseService } from './services/expense.service';
import { ProfitLossService } from './services/profit-loss.service';
import { DayCloseService } from './services/day-close.service';
import { DayLockGuard } from './guards/day-lock.guard';
import { FinanceController } from './controllers/finance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashLedgerEntry,
      BankAccount,
      PaymentMethod,
      ExpenseCategory,
      Expense,
      DayClose,
      Sale,
      SupplierPayment,
      AuditLog,
    ]),
  ],
  controllers: [FinanceController],
  providers: [
    CashLedgerService,
    BankAccountService,
    ExpenseService,
    ProfitLossService,
    DayCloseService,
    DayLockGuard,
  ],
  exports: [
    CashLedgerService,
    BankAccountService,
    ExpenseService,
    ProfitLossService,
    DayCloseService,
    DayLockGuard,
  ],
})
export class FinanceModule {}
