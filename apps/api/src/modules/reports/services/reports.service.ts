import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  SalesIntelligenceSummary,
  SalesIntelligenceItem,
  InventoryValuationSummary,
  InventoryValuationItem,
  ExpiryRiskSummary,
  ExpiryRiskItem,
  ProductProfitabilitySummary,
  ProductProfitabilityItem,
  CustomerCreditAgingSummary,
  CustomerCreditAgingItem,
  SupplierPayablesAgingSummary,
  SupplierPayablesAgingItem,
  TaxComplianceSummary,
  NmraControlledDrugsReport,
  NmraControlledDrugLogItem,
  ReportQueryFilter,
} from '@pharmacy/shared';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * 1. Sales Performance Intelligence
   */
  async getSalesIntelligence(query: ReportQueryFilter = {}): Promise<SalesIntelligenceSummary> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('s.id', 'id')
      .addSelect('s.invoice_number', 'invoiceNumber')
      .addSelect('s.cashier_user_id', 'cashierId')
      .addSelect('u.full_name', 'cashierName')
      .addSelect('s.created_at', 'createdAt')
      .addSelect('s.subtotal_lkr', 'subtotalLkr')
      .addSelect('s.discount_lkr', 'discountLkr')
      .addSelect('s.tax_vat_lkr', 'taxVatLkr')
      .addSelect('s.tax_sscl_lkr', 'taxSsclLkr')
      .addSelect('s.grand_total_lkr', 'grandTotalLkr')
      .addSelect('s.split_payments', 'splitPayments')
      .addSelect('COUNT(si.id)', 'itemsCount')
      .from('sales', 's')
      .leftJoin('users', 'u', 'u.id = s.cashier_user_id')
      .leftJoin('sale_items', 'si', 'si.sale_id = s.id')
      .where("s.status = 'COMPLETED'");

    if (query.startDate) {
      qb.andWhere('s.created_at >= :startDate', { startDate: `${query.startDate} 00:00:00` });
    }
    if (query.endDate) {
      qb.andWhere('s.created_at <= :endDate', { endDate: `${query.endDate} 23:59:59` });
    }
    if (query.cashierId) {
      qb.andWhere('s.cashier_user_id = :cashierId', { cashierId: query.cashierId });
    }

    qb.groupBy('s.id')
      .addGroupBy('s.invoice_number')
      .addGroupBy('s.cashier_user_id')
      .addGroupBy('u.full_name')
      .addGroupBy('s.created_at')
      .addGroupBy('s.subtotal_lkr')
      .addGroupBy('s.discount_lkr')
      .addGroupBy('s.tax_vat_lkr')
      .addGroupBy('s.tax_sscl_lkr')
      .addGroupBy('s.grand_total_lkr')
      .addGroupBy('s.split_payments')
      .orderBy('s.created_at', 'DESC');

    const rawRows = await qb.getRawMany();

    let grossSalesCents = 0;
    let totalDiscountCents = 0;
    let totalTaxCents = 0;
    let netRevenueCents = 0;
    const breakdownByPaymentMethod: Record<string, number> = {};

    const items: SalesIntelligenceItem[] = rawRows.map((row) => {
      const subtotalCents = Math.round(Number(row.subtotalLkr || 0) * 100);
      const discountCents = Math.round(Number(row.discountLkr || 0) * 100);
      const taxCents = Math.round((Number(row.taxVatLkr || 0) + Number(row.taxSsclLkr || 0)) * 100);
      const netTotalCents = Math.round(Number(row.grandTotalLkr || 0) * 100);

      grossSalesCents += subtotalCents;
      totalDiscountCents += discountCents;
      totalTaxCents += taxCents;
      netRevenueCents += netTotalCents;

      // Extract payment method summary
      let primaryPaymentMethod = 'CASH';
      let splitList: any[] = [];
      try {
        splitList = typeof row.splitPayments === 'string' ? JSON.parse(row.splitPayments) : (row.splitPayments || []);
      } catch {
        splitList = [];
      }

      if (Array.isArray(splitList) && splitList.length > 0) {
        primaryPaymentMethod = splitList.map((p) => p.method).join('/');
        for (const sp of splitList) {
          const method = sp.method || 'CASH';
          const amtCents = Math.round(Number(sp.amount || 0) * 100);
          breakdownByPaymentMethod[method] = (breakdownByPaymentMethod[method] || 0) + amtCents;
        }
      } else {
        breakdownByPaymentMethod['CASH'] = (breakdownByPaymentMethod['CASH'] || 0) + netTotalCents;
      }

      const dateObj = new Date(row.createdAt);

      return {
        date: dateObj.toISOString().slice(0, 10),
        hour: dateObj.getHours(),
        invoiceNumber: row.invoiceNumber,
        cashierId: row.cashierId,
        cashierName: row.cashierName || 'Cashier',
        subtotalCents,
        discountCents,
        taxCents,
        netTotalCents,
        paymentMethod: primaryPaymentMethod,
        itemsCount: parseInt(row.itemsCount || '0', 10),
      };
    });

    const totalInvoices = items.length;
    const averageBasketValueCents = totalInvoices > 0 ? Math.round(netRevenueCents / totalInvoices) : 0;

    return {
      totalInvoices,
      grossSalesCents,
      totalDiscountCents,
      totalTaxCents,
      netRevenueCents,
      averageBasketValueCents,
      breakdownByPaymentMethod,
      items,
    };
  }

  /**
   * 2. Inventory Valuation (Landed Cost vs Retail MRP)
   */
  async getInventoryValuation(): Promise<InventoryValuationSummary> {
    const rawRows = await this.dataSource.query(`
      SELECT 
        m.id AS medicine_id,
        m.name AS medicine_name,
        m.generic_name AS generic_name,
        c.name AS category_name,
        COALESCE(SUM(b.quantity_base_units), 0) AS total_base_units,
        COALESCE(SUM(b.quantity_base_units * b.unit_cost_price), 0) AS total_cost_value,
        COALESCE(SUM(b.quantity_base_units * COALESCE(b.batch_mrp, m.mrp, 0)), 0) AS total_retail_value,
        COALESCE(AVG(b.unit_cost_price), 0) AS avg_unit_cost,
        COALESCE(AVG(COALESCE(b.batch_mrp, m.mrp, 0)), 0) AS avg_unit_mrp
      FROM medicines m
      LEFT JOIN categories c ON c.id = m.category_id
      LEFT JOIN inventory_batches b ON b.medicine_id = m.id AND b.status = 'ACTIVE'
      GROUP BY m.id, m.name, m.generic_name, c.name
      HAVING total_base_units > 0
      ORDER BY total_cost_value DESC
    `);

    let totalUnitsInStock = 0;
    let totalCostValueCents = 0;
    let totalRetailValueCents = 0;

    const items: InventoryValuationItem[] = rawRows.map((r: any) => {
      const baseUnits = parseInt(r.total_base_units, 10);
      const totalCostCents = Math.round(Number(r.total_cost_value) * 100);
      const totalRetailCents = Math.round(Number(r.total_retail_value) * 100);
      const potentialProfitCents = totalRetailCents - totalCostCents;

      totalUnitsInStock += baseUnits;
      totalCostValueCents += totalCostCents;
      totalRetailValueCents += totalRetailCents;

      return {
        medicineId: r.medicine_id,
        name: r.medicine_name,
        genericName: r.generic_name,
        categoryName: r.category_name,
        baseUnitsInStock: baseUnits,
        weightedAvgUnitCostCents: Math.round(Number(r.avg_unit_cost) * 100),
        unitMrpCents: Math.round(Number(r.avg_unit_mrp) * 100),
        totalCostValueCents: totalCostCents,
        totalRetailValueCents: totalRetailCents,
        potentialProfitCents,
      };
    });

    return {
      totalMedicinesCount: items.length,
      totalUnitsInStock,
      totalCostValueCents,
      totalRetailValueCents,
      totalUnrealizedMarginCents: totalRetailValueCents - totalCostValueCents,
      items,
    };
  }

  /**
   * 3. Expiry Risk Report (<2 days, <30 days, <60 days, <90 days)
   */
  async getExpiryRisk(maxDays = 90): Promise<ExpiryRiskSummary> {
    const rawBatches = await this.dataSource.query(`
      SELECT 
        b.id AS batch_id,
        b.batch_number,
        b.expiry_date,
        b.quantity_base_units,
        b.unit_cost_price,
        m.id AS medicine_id,
        m.name AS medicine_name,
        m.generic_name,
        DATEDIFF(b.expiry_date, CURRENT_DATE()) AS days_remaining
      FROM inventory_batches b
      JOIN medicines m ON m.id = b.medicine_id
      WHERE b.status = 'ACTIVE'
        AND b.quantity_base_units > 0
        AND b.expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
      ORDER BY b.expiry_date ASC
    `, [maxDays]);

    let critical2dValueCents = 0;
    let high30dValueCents = 0;
    let medium60dValueCents = 0;
    let low90dValueCents = 0;

    const items: ExpiryRiskItem[] = rawBatches.map((r: any) => {
      const days = parseInt(r.days_remaining, 10);
      const units = parseInt(r.quantity_base_units, 10);
      const unitCostCents = Math.round(Number(r.unit_cost_price) * 100);
      const valueAtRiskCents = Math.round(units * Number(r.unit_cost_price) * 100);

      let riskTier: ExpiryRiskItem['riskTier'] = 'LOW_90D';
      if (days <= 2) {
        riskTier = 'CRITICAL_2D';
        critical2dValueCents += valueAtRiskCents;
      } else if (days <= 30) {
        riskTier = 'HIGH_30D';
        high30dValueCents += valueAtRiskCents;
      } else if (days <= 60) {
        riskTier = 'MEDIUM_60D';
        medium60dValueCents += valueAtRiskCents;
      } else {
        riskTier = 'LOW_90D';
        low90dValueCents += valueAtRiskCents;
      }

      const expiryStr = typeof r.expiry_date === 'string'
        ? r.expiry_date.slice(0, 10)
        : new Date(r.expiry_date).toISOString().slice(0, 10);

      return {
        batchId: r.batch_id,
        batchNumber: r.batch_number,
        medicineId: r.medicine_id,
        medicineName: r.medicine_name,
        genericName: r.generic_name,
        expiryDate: expiryStr,
        daysRemaining: days,
        remainingUnits: units,
        unitCostCents,
        totalValueAtRiskCents: valueAtRiskCents,
        riskTier,
      };
    });

    const totalValueAtRiskCents =
      critical2dValueCents + high30dValueCents + medium60dValueCents + low90dValueCents;

    return {
      critical2dValueCents,
      high30dValueCents,
      medium60dValueCents,
      low90dValueCents,
      totalValueAtRiskCents,
      items,
    };
  }

  /**
   * 4. Product Profitability & COGS Analysis
   */
  async getProductProfitability(query: ReportQueryFilter = {}): Promise<ProductProfitabilitySummary> {
    const rawRows = await this.dataSource.query(`
      SELECT 
        m.id AS medicine_id,
        m.name AS medicine_name,
        c.name AS category_name,
        COALESCE(SUM(sia.allocated_base_units), 0) AS total_units_sold,
        COALESCE(SUM(si.total_price_lkr), 0) AS gross_revenue_lkr,
        COALESCE(SUM(sia.allocated_base_units * sia.unit_cost_at_sale), 0) AS total_cogs_lkr
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN medicines m ON m.id = si.medicine_id
      LEFT JOIN categories c ON c.id = m.category_id
      LEFT JOIN sale_item_allocations sia ON sia.sale_item_id = si.id
      WHERE s.status = 'COMPLETED'
        ${query.startDate ? 'AND s.created_at >= ?' : ''}
        ${query.endDate ? 'AND s.created_at <= ?' : ''}
      GROUP BY m.id, m.name, c.name
      ORDER BY gross_revenue_lkr DESC
    `, [
      ...(query.startDate ? [`${query.startDate} 00:00:00`] : []),
      ...(query.endDate ? [`${query.endDate} 23:59:59`] : []),
    ]);

    let totalUnitsSold = 0;
    let totalRevenueCents = 0;
    let totalCogsCents = 0;

    const items: ProductProfitabilityItem[] = rawRows.map((r: any) => {
      const units = parseInt(r.total_units_sold, 10);
      const revCents = Math.round(Number(r.gross_revenue_lkr) * 100);
      const cogsCents = Math.round(Number(r.total_cogs_lkr) * 100);
      const profitCents = revCents - cogsCents;
      const marginPct = revCents > 0 ? Math.round((profitCents / revCents) * 10000) / 100 : 0;

      totalUnitsSold += units;
      totalRevenueCents += revCents;
      totalCogsCents += cogsCents;

      return {
        medicineId: r.medicine_id,
        medicineName: r.medicine_name,
        categoryName: r.category_name,
        unitsSold: units,
        grossRevenueCents: revCents,
        cogsCents,
        grossProfitCents: profitCents,
        grossMarginPercentage: marginPct,
      };
    });

    const totalProfitCents = totalRevenueCents - totalCogsCents;
    const overallMarginPercentage =
      totalRevenueCents > 0 ? Math.round((totalProfitCents / totalRevenueCents) * 10000) / 100 : 0;

    return {
      totalUnitsSold,
      totalRevenueCents,
      totalCogsCents,
      totalProfitCents,
      overallMarginPercentage,
      items,
    };
  }

  /**
   * 5. Customer Store Credit Aging (0-30, 31-60, 61-90, 90+ days)
   */
  async getCustomerCreditAging(): Promise<CustomerCreditAgingSummary> {
    const rawCustomers = await this.dataSource.query(`
      SELECT 
        c.id AS customer_id,
        c.full_name AS customer_name,
        c.phone,
        c.credit_limit,
        c.credit_balance,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURRENT_DATE(), ccl.created_at) <= 30 THEN ccl.amount ELSE 0 END), 0) AS bucket_current,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURRENT_DATE(), ccl.created_at) > 30 AND DATEDIFF(CURRENT_DATE(), ccl.created_at) <= 60 THEN ccl.amount ELSE 0 END), 0) AS bucket_30_60,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURRENT_DATE(), ccl.created_at) > 60 AND DATEDIFF(CURRENT_DATE(), ccl.created_at) <= 90 THEN ccl.amount ELSE 0 END), 0) AS bucket_60_90,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURRENT_DATE(), ccl.created_at) > 90 THEN ccl.amount ELSE 0 END), 0) AS bucket_over_90
      FROM customers c
      LEFT JOIN customer_credit_ledgers ccl ON ccl.customer_id = c.id
      WHERE c.credit_balance > 0
      GROUP BY c.id, c.full_name, c.phone, c.credit_limit, c.credit_balance
      ORDER BY c.credit_balance DESC
    `);

    let totalReceivablesCents = 0;
    let totalCurrentCents = 0;
    let total30to60Cents = 0;
    let total60to90Cents = 0;
    let totalOver90Cents = 0;

    const items: CustomerCreditAgingItem[] = rawCustomers.map((r: any) => {
      const currentBalanceCents = Math.round(Number(r.credit_balance) * 100);
      const limitCents = Math.round(Number(r.credit_limit || 0) * 100);

      // If ledger buckets sum to less than balance (due to payments), apportion balance into aging
      let bCurrent = Math.max(0, Math.round(Number(r.bucket_current) * 100));
      let b30 = Math.max(0, Math.round(Number(r.bucket_30_60) * 100));
      let b60 = Math.max(0, Math.round(Number(r.bucket_60_90) * 100));
      let b90 = Math.max(0, Math.round(Number(r.bucket_over_90) * 100));

      const totalBuckets = bCurrent + b30 + b60 + b90;
      if (totalBuckets === 0 && currentBalanceCents > 0) {
        bCurrent = currentBalanceCents;
      }

      totalReceivablesCents += currentBalanceCents;
      totalCurrentCents += bCurrent;
      total30to60Cents += b30;
      total60to90Cents += b60;
      totalOver90Cents += b90;

      return {
        customerId: r.customer_id,
        customerName: r.customer_name,
        phone: r.phone,
        creditLimitCents: limitCents,
        currentBalanceCents,
        bucketCurrentCents: bCurrent,
        bucket30to60Cents: b30,
        bucket60to90Cents: b60,
        bucketOver90Cents: b90,
      };
    });

    return {
      totalReceivablesCents,
      totalCurrentCents,
      total30to60Cents,
      total60to90Cents,
      totalOver90Cents,
      customersCount: items.length,
      items,
    };
  }

  /**
   * 6. Supplier Payables Aging (0-30, 31-60, 61-90, 90+ days)
   */
  async getSupplierPayablesAging(): Promise<SupplierPayablesAgingSummary> {
    const rawSuppliers = await this.dataSource.query(`
      SELECT 
        s.id AS supplier_id,
        s.company_name AS supplier_name,
        s.payment_terms_days,
        s.outstanding_payable_lkr,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURRENT_DATE(), grn.received_date) <= 30 THEN (grn.grand_total_lkr - grn.paid_amount_lkr) ELSE 0 END), 0) AS bucket_current,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURRENT_DATE(), grn.received_date) > 30 AND DATEDIFF(CURRENT_DATE(), grn.received_date) <= 60 THEN (grn.grand_total_lkr - grn.paid_amount_lkr) ELSE 0 END), 0) AS bucket_30_60,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURRENT_DATE(), grn.received_date) > 60 AND DATEDIFF(CURRENT_DATE(), grn.received_date) <= 90 THEN (grn.grand_total_lkr - grn.paid_amount_lkr) ELSE 0 END), 0) AS bucket_60_90,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURRENT_DATE(), grn.received_date) > 90 THEN (grn.grand_total_lkr - grn.paid_amount_lkr) ELSE 0 END), 0) AS bucket_over_90
      FROM suppliers s
      LEFT JOIN goods_received_notes grn ON grn.supplier_id = s.id AND grn.payment_status != 'PAID'
      WHERE s.outstanding_payable_lkr > 0
      GROUP BY s.id, s.company_name, s.payment_terms_days, s.outstanding_payable_lkr
      ORDER BY s.outstanding_payable_lkr DESC
    `);

    let totalPayablesCents = 0;
    let totalCurrentCents = 0;
    let total30to60Cents = 0;
    let total60to90Cents = 0;
    let totalOver90Cents = 0;

    const items: SupplierPayablesAgingItem[] = rawSuppliers.map((r: any) => {
      const totalDueCents = Math.round(Number(r.outstanding_payable_lkr) * 100);
      let bCurrent = Math.max(0, Math.round(Number(r.bucket_current) * 100));
      let b30 = Math.max(0, Math.round(Number(r.bucket_30_60) * 100));
      let b60 = Math.max(0, Math.round(Number(r.bucket_60_90) * 100));
      let b90 = Math.max(0, Math.round(Number(r.bucket_over_90) * 100));

      if (bCurrent + b30 + b60 + b90 === 0 && totalDueCents > 0) {
        bCurrent = totalDueCents;
      }

      totalPayablesCents += totalDueCents;
      totalCurrentCents += bCurrent;
      total30to60Cents += b30;
      total60to90Cents += b60;
      totalOver90Cents += b90;

      return {
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        paymentTermsDays: parseInt(r.payment_terms_days || '30', 10),
        totalPayableCents: totalDueCents,
        bucketCurrentCents: bCurrent,
        bucket30to60Cents: b30,
        bucket60to90Cents: b60,
        bucketOver90Cents: b90,
      };
    });

    return {
      totalPayablesCents,
      totalCurrentCents,
      total30to60Cents,
      total60to90Cents,
      totalOver90Cents,
      suppliersCount: items.length,
      items,
    };
  }

  /**
   * 7. Tax Compliance Summary (Sri Lankan VAT 18% & SSCL 2.5%)
   */
  async getTaxComplianceSummary(query: ReportQueryFilter = {}): Promise<TaxComplianceSummary> {
    const rawSales = await this.dataSource.query(`
      SELECT 
        s.id,
        s.subtotal_lkr,
        s.tax_vat_lkr,
        s.tax_sscl_lkr
      FROM sales s
      WHERE s.status = 'COMPLETED'
        ${query.startDate ? 'AND s.created_at >= ?' : ''}
        ${query.endDate ? 'AND s.created_at <= ?' : ''}
    `, [
      ...(query.startDate ? [`${query.startDate} 00:00:00`] : []),
      ...(query.endDate ? [`${query.endDate} 23:59:59`] : []),
    ]);

    let taxableSalesCents = 0;
    let exemptSalesCents = 0;
    let vatCollectedCents = 0;
    let ssclCollectedCents = 0;
    let taxInvoicesCount = 0;
    let exemptInvoicesCount = 0;

    for (const sale of rawSales) {
      const vat = Number(sale.tax_vat_lkr || 0);
      const sscl = Number(sale.tax_sscl_lkr || 0);
      const subtotalCents = Math.round(Number(sale.subtotal_lkr || 0) * 100);

      if (vat > 0 || sscl > 0) {
        taxableSalesCents += subtotalCents;
        vatCollectedCents += Math.round(vat * 100);
        ssclCollectedCents += Math.round(sscl * 100);
        taxInvoicesCount++;
      } else {
        exemptSalesCents += subtotalCents;
        exemptInvoicesCount++;
      }
    }

    return {
      taxableSalesCents,
      exemptSalesCents,
      vatCollectedCents,
      ssclCollectedCents,
      totalTaxCollectedCents: vatCollectedCents + ssclCollectedCents,
      taxInvoicesCount,
      exemptInvoicesCount,
    };
  }

  /**
   * 8. Official NMRA Dangerous / Controlled Drugs Log (Schedule II Audit Register)
   */
  async getNmraControlledDrugsLog(query: {
    startDate?: string;
    endDate?: string;
    medicineId?: string;
  } = {}): Promise<NmraControlledDrugsReport> {
    const rawLogs = await this.dataSource.query(`
      SELECT 
        csr.created_at,
        csr.quantity_base_units,
        csr.customer_nic,
        csr.doctor_slmc_reg_no,
        m.name AS medicine_name,
        m.schedule_class,
        b.batch_number,
        b.expiry_date,
        c.full_name AS patient_name,
        d.full_name AS doctor_name,
        u.full_name AS pharmacist_name,
        s.invoice_number
      FROM controlled_substance_register csr
      JOIN medicines m ON m.id = csr.medicine_id
      JOIN inventory_batches b ON b.id = csr.batch_id
      LEFT JOIN customers c ON c.id = csr.customer_id
      LEFT JOIN doctors d ON d.id = csr.doctor_id
      LEFT JOIN users u ON u.id = csr.pharmacist_user_id
      LEFT JOIN sales s ON s.prescription_id = csr.prescription_id
      WHERE 1=1
        ${query.startDate ? 'AND csr.created_at >= ?' : ''}
        ${query.endDate ? 'AND csr.created_at <= ?' : ''}
        ${query.medicineId ? 'AND csr.medicine_id = ?' : ''}
      ORDER BY csr.created_at DESC
    `, [
      ...(query.startDate ? [`${query.startDate} 00:00:00`] : []),
      ...(query.endDate ? [`${query.endDate} 23:59:59`] : []),
      ...(query.medicineId ? [query.medicineId] : []),
    ]);

    const items: NmraControlledDrugLogItem[] = rawLogs.map((r: any) => ({
      saleDate: new Date(r.created_at).toISOString().slice(0, 10),
      invoiceNumber: r.invoice_number || 'N/A',
      drugName: r.medicine_name,
      schedule: r.schedule_class || 'SCHEDULE_II',
      batchNumber: r.batch_number,
      expiryDate: typeof r.expiry_date === 'string'
        ? r.expiry_date.slice(0, 10)
        : new Date(r.expiry_date).toISOString().slice(0, 10),
      quantityDispensed: parseInt(r.quantity_base_units || '0', 10),
      patientName: r.patient_name || 'Walk-in Patient',
      patientNic: r.customer_nic,
      doctorName: r.doctor_name || 'Prescribing Doctor',
      doctorSlmcNumber: r.doctor_slmc_reg_no,
      pharmacistName: r.pharmacist_name || 'Registered Pharmacist',
    }));

    return {
      generatedAt: new Date().toISOString(),
      reportingPeriod: {
        startDate: query.startDate || 'Beginning of Records',
        endDate: query.endDate || 'Present',
      },
      totalScheduleItemsDispensed: items.reduce((acc, i) => acc + i.quantityDispensed, 0),
      items,
    };
  }
}
