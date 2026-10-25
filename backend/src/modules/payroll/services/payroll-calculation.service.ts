import { Injectable } from '@nestjs/common';
import { AdvanceSettlementResult, STATUTORY_RATES } from '@pharmacy/shared';
import { SalaryAdvance } from '../entities/salary-advance.entity';

export interface ComputePayrollLineInput {
  baseSalaryLkr: number;
  bonusAllowanceLkr?: number;
  overtimeLkr?: number;
  otherDeductionsLkr?: number;
  activeAdvances: SalaryAdvance[];
}

export interface ComputedPayrollLine {
  baseSalaryLkr: number;
  bonusAllowanceLkr: number;
  overtimeLkr: number;
  grossEarningsLkr: number;
  statutoryDeductionsLkr: number;
  advanceDeductedLkr: number;
  otherDeductionsLkr: number;
  netPayableLkr: number;
  advanceCarriedForwardLkr: number;
  settledAdvances: Array<{
    advanceId: string;
    deductedFromThis: number;
    remainingAfter: number;
  }>;
}

@Injectable()
export class PayrollCalculationService {
  /**
   * Computes statutory deductions (EPF Employee 8%) based on base salary.
   */
  computeStatutoryDeduction(baseSalary: number): number {
    return Number(
      (
        Math.max(0, Number(baseSalary)) * STATUTORY_RATES.EPF_EMPLOYEE_PERCENT
      ).toFixed(2),
    );
  }

  /**
   * FIFO Advance Recovery with Strict Negative Pay Invariant (Net Pay >= 0.00).
   * Available capacity = grossEarnings - statutoryDeductions - otherDeductions.
   */
  computeAdvanceRecovery(
    availableCapacity: number,
    activeAdvances: SalaryAdvance[],
  ): AdvanceSettlementResult {
    let remainingCapacity = Math.max(0, Number(availableCapacity.toFixed(2)));
    let totalDeducted = 0;
    let remainingCarryForward = 0;
    const settledAdvances: AdvanceSettlementResult['settledAdvances'] = [];

    // Sort FIFO by advanceDate ASC, then createdAt ASC
    const sorted = [...activeAdvances].sort((a, b) => {
      const dateA = new Date(a.advanceDate).getTime();
      const dateB = new Date(b.advanceDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      return createdA - createdB;
    });

    for (const advance of sorted) {
      const currentRemaining = Number(
        Number(advance.remainingBalanceLkr).toFixed(2),
      );

      if (remainingCapacity <= 0) {
        remainingCarryForward = Number(
          (remainingCarryForward + currentRemaining).toFixed(2),
        );
        settledAdvances.push({
          advanceId: advance.id,
          deductedFromThis: 0,
          remainingAfter: currentRemaining,
        });
        continue;
      }

      const deduction = Number(
        Math.min(remainingCapacity, currentRemaining).toFixed(2),
      );
      const remainder = Number((currentRemaining - deduction).toFixed(2));

      totalDeducted = Number((totalDeducted + deduction).toFixed(2));
      remainingCapacity = Number((remainingCapacity - deduction).toFixed(2));
      remainingCarryForward = Number(
        (remainingCarryForward + remainder).toFixed(2),
      );

      settledAdvances.push({
        advanceId: advance.id,
        deductedFromThis: deduction,
        remainingAfter: remainder,
      });
    }

    return {
      totalDeducted: Number(totalDeducted.toFixed(2)),
      remainingCarryForward: Number(remainingCarryForward.toFixed(2)),
      settledAdvances,
    };
  }

  /**
   * Comprehensive line calculation for an employee.
   * Guarantees netPayableLkr >= 0.00.
   */
  calculatePayrollLine(input: ComputePayrollLineInput): ComputedPayrollLine {
    const baseSalary = Number(
      Math.max(0, Number(input.baseSalaryLkr || 0)).toFixed(2),
    );
    const bonus = Number(
      Math.max(0, Number(input.bonusAllowanceLkr || 0)).toFixed(2),
    );
    const overtime = Number(
      Math.max(0, Number(input.overtimeLkr || 0)).toFixed(2),
    );
    const otherDeductions = Number(
      Math.max(0, Number(input.otherDeductionsLkr || 0)).toFixed(2),
    );

    const grossEarnings = Number((baseSalary + bonus + overtime).toFixed(2));
    const statutoryDeductions = this.computeStatutoryDeduction(baseSalary);

    // Maximum capacity for advance deductions so net pay cannot drop below 0
    const availableForAdvance = Math.max(
      0,
      Number((grossEarnings - statutoryDeductions - otherDeductions).toFixed(2)),
    );

    const advanceResult = this.computeAdvanceRecovery(
      availableForAdvance,
      input.activeAdvances,
    );

    const advanceDeducted = advanceResult.totalDeducted;
    const netPayable = Math.max(
      0,
      Number(
        (
          grossEarnings -
          statutoryDeductions -
          otherDeductions -
          advanceDeducted
        ).toFixed(2),
      ),
    );

    return {
      baseSalaryLkr: baseSalary,
      bonusAllowanceLkr: bonus,
      overtimeLkr: overtime,
      grossEarningsLkr: grossEarnings,
      statutoryDeductionsLkr: statutoryDeductions,
      advanceDeductedLkr: advanceDeducted,
      otherDeductionsLkr: otherDeductions,
      netPayableLkr: netPayable,
      advanceCarriedForwardLkr: advanceResult.remainingCarryForward,
      settledAdvances: advanceResult.settledAdvances,
    };
  }
}
