import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { CashLedgerService } from '../services/cash-ledger.service';
import { BankAccountService } from '../services/bank-account.service';
import { ExpenseService } from '../services/expense.service';
import { ProfitLossService } from '../services/profit-loss.service';
import { DayCloseService } from '../services/day-close.service';
import {
  CreateBankAccountSchema,
  BankTransferSchema,
  CreateExpenseSchema,
  DayCloseCommitSchema,
  DayCloseReopenSchema,
  CashbookQuerySchema,
  ProfitLossQuerySchema,
} from '@pharmacy/shared';

@Controller('finance')
export class FinanceController {
  constructor(
    private readonly cashLedgerService: CashLedgerService,
    private readonly bankAccountService: BankAccountService,
    private readonly expenseService: ExpenseService,
    private readonly profitLossService: ProfitLossService,
    private readonly dayCloseService: DayCloseService,
  ) {}

  // 1. Cashbook
  @Get('cashbook')
  async getCashbook(@Query() query: Record<string, unknown>) {
    const parsed = CashbookQuerySchema.parse(query);
    return this.cashLedgerService.getCashbook(parsed);
  }

  @Get('cashbook/cash-in-drawer')
  async getLiveCashInDrawer(@Query('asOfDate') asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    const amountLkr = await this.cashLedgerService.getLiveCashInDrawer(1, date);
    return { cashInDrawerLkr: amountLkr };
  }

  @Post('cashbook/backfill')
  async backfillPastTransactions() {
    return this.cashLedgerService.backfillFromPastTransactions(1);
  }

  // 2. Profit & Loss
  @Get('profit-loss')
  async getProfitLoss(@Query() query: Record<string, unknown>) {
    const parsed = ProfitLossQuerySchema.parse(query);
    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    return this.profitLossService.computeProfitAndLoss(startDate, endDate, 1);
  }

  // 3. Bank Accounts
  @Get('banks')
  async getBanks() {
    return this.bankAccountService.getAll(1);
  }

  @Post('banks')
  async createBank(
    @Body() body: unknown,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    const parsed = CreateBankAccountSchema.parse(body);
    const userId = userIdHeader || 'user-admin';
    return this.bankAccountService.create(parsed, userId, 1);
  }

  @Post('banks/transfer')
  async recordBankTransfer(
    @Body() body: unknown,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    const parsed = BankTransferSchema.parse(body);
    const userId = userIdHeader || 'user-admin';
    return this.bankAccountService.recordTransfer(parsed, userId, 1);
  }

  // 4. Expenses
  @Get('expenses')
  async listExpenses(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.expenseService.listExpenses(
      { startDate, endDate, categoryId },
      1,
    );
  }

  @Get('expenses/categories')
  async listExpenseCategories() {
    return this.expenseService.listCategories(1);
  }

  @Post('expenses')
  async recordExpense(
    @Body() body: unknown,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    const parsed = CreateExpenseSchema.parse(body);
    const userId = userIdHeader || 'user-admin';
    return this.expenseService.recordExpense(parsed, userId, 1);
  }

  // 5. Day-Close Operations
  @Get('day-close/preview')
  async getDayClosePreview(@Query('date') dateQuery?: string) {
    const targetDate = dateQuery || new Date().toISOString().split('T')[0];
    return this.dayCloseService.getPreview(targetDate, 1);
  }

  @Post('day-close/commit')
  async commitDayClose(
    @Body() body: unknown,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    const parsed = DayCloseCommitSchema.parse(body);
    const userId = userIdHeader || 'user-cashier';
    return this.dayCloseService.commit(parsed, userId, 1);
  }

  @Post('day-close/reopen')
  async reopenDayClose(
    @Body() body: unknown,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    const parsed = DayCloseReopenSchema.parse(body);
    const userId = userIdHeader || 'user-manager';
    return this.dayCloseService.reopen(parsed, userId, 1);
  }
}
