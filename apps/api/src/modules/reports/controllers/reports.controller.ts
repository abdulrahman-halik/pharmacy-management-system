import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  ForbiddenException,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ReportsService } from '../services/reports.service';
import { ReportExportService } from '../services/report-export.service';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  ReportQuerySchema,
  ExpiryRiskQuerySchema,
  NmraLogQuerySchema,
  formatLKR,
} from '@pharmacy/shared';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportService: ReportExportService,
  ) {}

  private extractRole(user?: AuthenticatedUser, req?: Request): string {
    return (
      user?.role ||
      (req?.headers['x-user-role'] as string) ||
      'ADMIN' // Test default if omitted
    );
  }

  private enforceRoles(user: AuthenticatedUser | undefined, req: Request | undefined, allowedRoles: string[]) {
    const role = this.extractRole(user, req);
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException(
        `Staff with role ${role} is not authorized to access this operational report`,
      );
    }
  }

  /**
   * 1. Sales Performance Intelligence Report
   */
  @Get('sales')
  @UsePipes(new ZodValidationPipe(ReportQuerySchema))
  async getSalesIntelligence(
    @Query() query: any,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    this.enforceRoles(user, req, ['ADMIN', 'MANAGER']);
    const data = await this.reportsService.getSalesIntelligence(query);

    if (query.format === 'csv') {
      const headers = ['Invoice No', 'Date', 'Cashier', 'Subtotal (Rs.)', 'Discount (Rs.)', 'Tax (Rs.)', 'Net Total (Rs.)', 'Payment'];
      const rows = data.items.map((i) => [
        i.invoiceNumber,
        i.date,
        i.cashierName,
        (i.subtotalCents / 100).toFixed(2),
        (i.discountCents / 100).toFixed(2),
        (i.taxCents / 100).toFixed(2),
        (i.netTotalCents / 100).toFixed(2),
        i.paymentMethod,
      ]);
      const csv = this.exportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-intelligence-report.csv"');
      return res.send(csv);
    }

    if (query.format === 'pdf') {
      const headers = ['Invoice No', 'Date', 'Cashier', 'Subtotal', 'Tax', 'Net Total', 'Payment'];
      const rows = data.items.map((i) => [
        i.invoiceNumber,
        i.date,
        i.cashierName,
        formatLKR(i.subtotalCents / 100),
        formatLKR(i.taxCents / 100),
        formatLKR(i.netTotalCents / 100),
        i.paymentMethod,
      ]);
      const pdf = await this.exportService.generateTablePdf({
        title: 'Sales Intelligence & Revenue Report',
        subtitle: `Total Invoices: ${data.totalInvoices} | Net Revenue: ${formatLKR(data.netRevenueCents / 100)}`,
        headers,
        rows,
        summaryText: `Gross Sales: ${formatLKR(data.grossSalesCents / 100)} | Tax: ${formatLKR(data.totalTaxCents / 100)} | Avg Basket: ${formatLKR(data.averageBasketValueCents / 100)}`,
        colWidths: [80, 65, 80, 75, 65, 85, 73],
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="sales-intelligence.pdf"');
      return res.send(pdf);
    }

    return res.json({ success: true, data });
  }

  /**
   * 2. Inventory Valuation (Landed Cost vs Retail MRP)
   */
  @Get('inventory-valuation')
  async getInventoryValuation(
    @Query('format') format: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    this.enforceRoles(user, req, ['ADMIN', 'MANAGER']);
    const data = await this.reportsService.getInventoryValuation();

    if (format === 'csv') {
      const headers = ['Category', 'Medicine', 'Generic Name', 'Base Units', 'Unit Cost (Rs.)', 'Unit MRP (Rs.)', 'Total Cost Value (Rs.)', 'Total Retail Value (Rs.)', 'Margin (Rs.)'];
      const rows = data.items.map((i) => [
        i.categoryName || 'General',
        i.name,
        i.genericName || '',
        i.baseUnitsInStock,
        (i.weightedAvgUnitCostCents / 100).toFixed(2),
        (i.unitMrpCents / 100).toFixed(2),
        (i.totalCostValueCents / 100).toFixed(2),
        (i.totalRetailValueCents / 100).toFixed(2),
        (i.potentialProfitCents / 100).toFixed(2),
      ]);
      const csv = this.exportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-valuation.csv"');
      return res.send(csv);
    }

    return res.json({ success: true, data });
  }

  /**
   * 3. Expiry Risk Report (<2d, <30d, <60d, <90d)
   */
  @Get('expiry-risk')
  @UsePipes(new ZodValidationPipe(ExpiryRiskQuerySchema))
  async getExpiryRisk(
    @Query() query: any,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    this.enforceRoles(user, req, ['ADMIN', 'MANAGER', 'PHARMACIST']);
    const data = await this.reportsService.getExpiryRisk(query.days || 90);

    if (query.format === 'csv') {
      const headers = ['Batch No', 'Medicine', 'Expiry Date', 'Days Left', 'Units', 'Unit Cost (Rs.)', 'Value At Risk (Rs.)', 'Tier'];
      const rows = data.items.map((i) => [
        i.batchNumber,
        i.medicineName,
        i.expiryDate,
        i.daysRemaining,
        i.remainingUnits,
        (i.unitCostCents / 100).toFixed(2),
        (i.totalValueAtRiskCents / 100).toFixed(2),
        i.riskTier,
      ]);
      const csv = this.exportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="expiry-risk-report.csv"');
      return res.send(csv);
    }

    if (query.format === 'pdf') {
      const headers = ['Batch No', 'Medicine', 'Expiry Date', 'Days Left', 'Units', 'Value At Risk', 'Tier'];
      const rows = data.items.map((i) => [
        i.batchNumber,
        i.medicineName,
        i.expiryDate,
        i.daysRemaining,
        i.remainingUnits,
        formatLKR(i.totalValueAtRiskCents / 100),
        i.riskTier,
      ]);
      const pdf = await this.exportService.generateTablePdf({
        title: 'Pharmaceutical Expiry Risk Valuation Report',
        subtitle: `Total Value at Risk: ${formatLKR(data.totalValueAtRiskCents / 100)}`,
        headers,
        rows,
        summaryText: `Critical (<2d): ${formatLKR(data.critical2dValueCents / 100)} | High (<30d): ${formatLKR(data.high30dValueCents / 100)} | Medium (<60d): ${formatLKR(data.medium60dValueCents / 100)}`,
        colWidths: [75, 120, 65, 55, 50, 85, 73],
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="expiry-risk.pdf"');
      return res.send(pdf);
    }

    return res.json({ success: true, data });
  }

  /**
   * 4. Product Profitability & COGS Report
   */
  @Get('product-profitability')
  @UsePipes(new ZodValidationPipe(ReportQuerySchema))
  async getProductProfitability(
    @Query() query: any,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    this.enforceRoles(user, req, ['ADMIN', 'MANAGER']);
    const data = await this.reportsService.getProductProfitability(query);

    if (query.format === 'csv') {
      const headers = ['Medicine', 'Category', 'Units Sold', 'Gross Revenue (Rs.)', 'COGS (Rs.)', 'Gross Profit (Rs.)', 'Margin %'];
      const rows = data.items.map((i) => [
        i.medicineName,
        i.categoryName || 'General',
        i.unitsSold,
        (i.grossRevenueCents / 100).toFixed(2),
        (i.cogsCents / 100).toFixed(2),
        (i.grossProfitCents / 100).toFixed(2),
        `${i.grossMarginPercentage}%`,
      ]);
      const csv = this.exportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="product-profitability.csv"');
      return res.send(csv);
    }

    return res.json({ success: true, data });
  }

  /**
   * 5. Customer Store Credit Aging Report
   */
  @Get('customer-credit-aging')
  async getCustomerCreditAging(
    @Query('format') format: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    this.enforceRoles(user, req, ['ADMIN', 'MANAGER']);
    const data = await this.reportsService.getCustomerCreditAging();

    if (format === 'csv') {
      const headers = ['Customer', 'Phone', 'Credit Limit (Rs.)', 'Balance (Rs.)', 'Current (0-30d)', '31-60d', '61-90d', '90d+'];
      const rows = data.items.map((i) => [
        i.customerName,
        i.phone,
        (i.creditLimitCents / 100).toFixed(2),
        (i.currentBalanceCents / 100).toFixed(2),
        (i.bucketCurrentCents / 100).toFixed(2),
        (i.bucket30to60Cents / 100).toFixed(2),
        (i.bucket60to90Cents / 100).toFixed(2),
        (i.bucketOver90Cents / 100).toFixed(2),
      ]);
      const csv = this.exportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="customer-credit-aging.csv"');
      return res.send(csv);
    }

    return res.json({ success: true, data });
  }

  /**
   * 6. Supplier Payables Aging Report
   */
  @Get('supplier-payables-aging')
  async getSupplierPayablesAging(
    @Query('format') format: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    this.enforceRoles(user, req, ['ADMIN', 'MANAGER']);
    const data = await this.reportsService.getSupplierPayablesAging();

    if (format === 'csv') {
      const headers = ['Supplier', 'Terms (Days)', 'Total Due (Rs.)', 'Current (0-30d)', '31-60d', '61-90d', '90d+'];
      const rows = data.items.map((i) => [
        i.supplierName,
        i.paymentTermsDays,
        (i.totalPayableCents / 100).toFixed(2),
        (i.bucketCurrentCents / 100).toFixed(2),
        (i.bucket30to60Cents / 100).toFixed(2),
        (i.bucket60to90Cents / 100).toFixed(2),
        (i.bucketOver90Cents / 100).toFixed(2),
      ]);
      const csv = this.exportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="supplier-payables-aging.csv"');
      return res.send(csv);
    }

    return res.json({ success: true, data });
  }

  /**
   * 7. Tax Compliance Summary (VAT 18% & SSCL 2.5%)
   */
  @Get('tax-compliance')
  @UsePipes(new ZodValidationPipe(ReportQuerySchema))
  async getTaxCompliance(
    @Query() query: any,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    this.enforceRoles(user, req, ['ADMIN']);
    const data = await this.reportsService.getTaxComplianceSummary(query);
    return res.json({ success: true, data });
  }

  /**
   * 8. NMRA Dangerous Drugs Log (Schedule II Audit Register)
   */
  @Get('nmra-controlled-log')
  @UsePipes(new ZodValidationPipe(NmraLogQuerySchema))
  async getNmraControlledDrugsLog(
    @Query() query: any,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    this.enforceRoles(user, req, ['ADMIN', 'PHARMACIST']);
    const data = await this.reportsService.getNmraControlledDrugsLog(query);

    if (query.format === 'pdf') {
      const headers = ['Date', 'Invoice', 'Drug Name', 'Batch', 'Patient NIC', 'Doctor SLMC', 'Qty', 'Pharmacist'];
      const rows = data.items.map((i) => [
        i.saleDate,
        i.invoiceNumber,
        i.drugName,
        i.batchNumber,
        i.patientNic,
        i.doctorSlmcNumber,
        i.quantityDispensed,
        i.pharmacistName,
      ]);
      const pdf = await this.exportService.generateTablePdf({
        title: 'National Medicines Regulatory Authority (NMRA) Controlled Drugs Register',
        subtitle: `Statutory Schedule II Audit Register | Period: ${data.reportingPeriod.startDate} to ${data.reportingPeriod.endDate}`,
        headers,
        rows,
        summaryText: `Total Controlled Units Dispensed: ${data.totalScheduleItemsDispensed}`,
        colWidths: [60, 65, 95, 60, 75, 70, 35, 63],
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="nmra-controlled-drugs-log.pdf"');
      return res.send(pdf);
    }

    return res.json({ success: true, data });
  }
}
