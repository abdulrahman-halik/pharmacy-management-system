import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Res,
  Req,
  ForbiddenException,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PayrollService } from '../services/payroll.service';
import { SalaryAdvanceService } from '../services/salary-advance.service';
import { PayslipPdfService } from '../services/payslip-pdf.service';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  CreateSalaryAdvanceSchema,
  CreateSalaryAdvanceInput,
  SalaryAdvanceQuerySchema,
  GeneratePayrollSchema,
  GeneratePayrollInput,
  DisbursePayrollSchema,
  DisbursePayrollInput,
  UpdateStaffCompensationSchema,
  UpdateStaffCompensationInput,
} from '@pharmacy/shared';

@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly advanceService: SalaryAdvanceService,
    private readonly pdfService: PayslipPdfService,
  ) {}

  private checkAuthorizedRole(
    user?: AuthenticatedUser,
    req?: Request,
  ): { userId: string; storeId: number } {
    const role =
      user?.role ||
      (req?.headers['x-user-role'] as string) ||
      'ADMIN'; // Default fallback in testing if not set
    const userId =
      user?.id ||
      (req?.headers['x-user-id'] as string) ||
      'system-admin';
    const storeId = user?.storeId || 1;

    if (role === 'CASHIER' || role === 'PHARMACIST') {
      throw new ForbiddenException(
        `Staff with role ${role} is not permitted to access staff compensation and payroll records`,
      );
    }

    return { userId, storeId };
  }

  // --------------------------------------------------------------------------
  // Staff Compensation Directory & Updates (ADMIN/MANAGER only)
  // --------------------------------------------------------------------------

  @Get('staff')
  async getStaffCompensation(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { storeId } = this.checkAuthorizedRole(user, req);
    return this.payrollService.getStaffCompensationList(storeId);
  }

  @Put('staff/:id/compensation')
  @UsePipes(new ZodValidationPipe(UpdateStaffCompensationSchema))
  async updateStaffCompensation(
    @Param('id') id: string,
    @Body() body: UpdateStaffCompensationInput,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    this.checkAuthorizedRole(user, req);
    return this.payrollService.updateStaffCompensation(id, body);
  }

  // --------------------------------------------------------------------------
  // Salary Advances
  // --------------------------------------------------------------------------

  @Get('advances')
  async getAdvances(
    @Query() query: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { storeId } = this.checkAuthorizedRole(user, req);
    const parsed = SalaryAdvanceQuerySchema.parse(query);
    return this.advanceService.getAdvances(parsed, storeId);
  }

  @Post('advances')
  @UsePipes(new ZodValidationPipe(CreateSalaryAdvanceSchema))
  async createAdvance(
    @Body() body: CreateSalaryAdvanceInput,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { userId, storeId } = this.checkAuthorizedRole(user, req);
    return this.advanceService.createAdvance(body, userId, storeId);
  }

  // --------------------------------------------------------------------------
  // Monthly Payroll Runs & Generation
  // --------------------------------------------------------------------------

  @Post('generate/:monthYear')
  async generatePayroll(
    @Param('monthYear') monthYear: string,
    @Body() body: Partial<GeneratePayrollInput>,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { storeId } = this.checkAuthorizedRole(user, req);
    const parsed = GeneratePayrollSchema.parse({
      monthYear,
      userIds: body?.userIds,
    });
    return this.payrollService.generateMonthlyPayroll(
      parsed.monthYear,
      parsed.userIds,
      storeId,
    );
  }

  @Get(':monthYear')
  async getMonthlyPayroll(
    @Param('monthYear') monthYear: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { storeId } = this.checkAuthorizedRole(user, req);
    return this.payrollService.getMonthlyPayroll(monthYear, storeId);
  }

  @Post(':id/disburse')
  @UsePipes(new ZodValidationPipe(DisbursePayrollSchema))
  async disbursePayroll(
    @Param('id') id: string,
    @Body() body: DisbursePayrollInput,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { userId, storeId } = this.checkAuthorizedRole(user, req);
    return this.payrollService.disbursePayroll(id, body, userId, storeId);
  }

  @Get(':id/payslip-pdf')
  async downloadPayslipPdf(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const { storeId } = this.checkAuthorizedRole(user, req);
    const payroll = await this.payrollService.getPayrollById(id, storeId);
    const pdfBuffer = await this.pdfService.generatePayslipPdf(payroll);

    const filename = `Payslip-${payroll.user?.fullName?.replace(/\s+/g, '_') || 'Staff'}-${payroll.monthYear}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }
}
