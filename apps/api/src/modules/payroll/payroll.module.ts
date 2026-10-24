import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryAdvance } from './entities/salary-advance.entity';
import { EmployeePayroll } from './entities/employee-payroll.entity';
import { PayrollDeductionItem } from './entities/payroll-deduction-item.entity';
import { User } from '../users/entities/user.entity';
import { PaymentMethod } from '../finance/entities/payment-method.entity';
import { FinanceModule } from '../finance/finance.module';

import { PayrollCalculationService } from './services/payroll-calculation.service';
import { SalaryAdvanceService } from './services/salary-advance.service';
import { PayrollService } from './services/payroll.service';
import { PayslipPdfService } from './services/payslip-pdf.service';
import { PayrollController } from './controllers/payroll.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalaryAdvance,
      EmployeePayroll,
      PayrollDeductionItem,
      User,
      PaymentMethod,
    ]),
    FinanceModule,
  ],
  controllers: [PayrollController],
  providers: [
    PayrollCalculationService,
    SalaryAdvanceService,
    PayrollService,
    PayslipPdfService,
  ],
  exports: [
    PayrollCalculationService,
    SalaryAdvanceService,
    PayrollService,
    PayslipPdfService,
  ],
})
export class PayrollModule {}
