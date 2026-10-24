import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Sale } from '../../pos/entities/sale.entity';
import { SaleItemAllocation } from '../../pos/entities/sale-item-allocation.entity';
import { Expense } from '../entities/expense.entity';
import { CashLedgerEntry } from '../entities/cash-ledger-entry.entity';
import { ProfitAndLossSummaryDto } from '@pharmacy/shared';

@Injectable()
export class ProfitLossService {
  constructor(private readonly dataSource: DataSource) {}

  async computeProfitAndLoss(
    startDate: Date,
    endDate: Date,
    storeId = 1,
  ): Promise<ProfitAndLossSummaryDto> {
    const manager = this.dataSource.manager;

    // 1. Sales & Revenue
    const salesResult = await manager
      .createQueryBuilder(Sale, 'sale')
      .select('SUM(sale.subtotalLkr)', 'grossSales')
      .addSelect('SUM(sale.discountLkr)', 'discounts')
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('sale.status = :status', { status: 'COMPLETED' })
      .getRawOne();

    const grossSalesLkr = Number(
      parseFloat(salesResult?.grossSales || '0').toFixed(2),
    );
    const discountsLkr = Number(
      parseFloat(salesResult?.discounts || '0').toFixed(2),
    );
    const netRevenueLkr = Number((grossSalesLkr - discountsLkr).toFixed(2));

    // 2. Exact COGS from Batch Allocations
    const cogsResult = await manager
      .createQueryBuilder(SaleItemAllocation, 'alloc')
      .innerJoin('alloc.saleItem', 'item')
      .innerJoin('item.sale', 'sale')
      .select(
        'SUM(alloc.allocatedBaseUnits * alloc.unitCostAtSale)',
        'totalCogs',
      )
      .where('sale.storeId = :storeId', { storeId })
      .andWhere('sale.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('sale.status = :status', { status: 'COMPLETED' })
      .getRawOne();

    const cogsLkr = Number(parseFloat(cogsResult?.totalCogs || '0').toFixed(2));
    const grossProfitLkr = Number((netRevenueLkr - cogsLkr).toFixed(2));
    const grossMarginPercentage =
      netRevenueLkr > 0
        ? Number(((grossProfitLkr / netRevenueLkr) * 100).toFixed(2))
        : 0;

    // 3. Operating Expenses
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const expResult = await manager
      .createQueryBuilder(Expense, 'exp')
      .select('SUM(exp.amountLkr)', 'totalExpenses')
      .where('exp.storeId = :storeId', { storeId })
      .andWhere('exp.expenseDate BETWEEN :start AND :end', {
        start: startStr,
        end: endStr,
      })
      .getRawOne();

    const operatingExpensesLkr = Number(
      parseFloat(expResult?.totalExpenses || '0').toFixed(2),
    );

    // 4. Payroll Costs (Disbursed Salaries)
    const payrollResult = await manager
      .createQueryBuilder(CashLedgerEntry, 'cle')
      .select('SUM(cle.amountLkr)', 'totalPayroll')
      .where('cle.storeId = :storeId', { storeId })
      .andWhere('cle.sourceType = :sourceType', { sourceType: 'SALARY' })
      .andWhere('cle.direction = :direction', { direction: 'OUT' })
      .andWhere('cle.entryDate BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawOne();

    const payrollCostsLkr = Number(
      parseFloat(payrollResult?.totalPayroll || '0').toFixed(2),
    );

    // 5. Net Profit (Gross Profit - Operating Expenses - Payroll Costs)
    const netProfitLkr = Number(
      (grossProfitLkr - operatingExpensesLkr - payrollCostsLkr).toFixed(2),
    );

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      grossSalesLkr,
      discountsLkr,
      returnsLkr: 0,
      netRevenueLkr,
      cogsLkr,
      grossProfitLkr,
      grossMarginPercentage,
      operatingExpensesLkr,
      payrollCostsLkr,
      otherIncomeLkr: 0,
      netProfitLkr,
    };
  }
}
