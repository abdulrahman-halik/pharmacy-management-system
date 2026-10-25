import { EntityManager } from 'typeorm';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';
import { TOOL_RBAC_REQUIREMENTS, AiAssistantToolName } from '@pharmacy/shared';

export interface AiToolDefinition {
  name: AiAssistantToolName;
  description: string;
  requiredPermission: { module: string; action: string };
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (params: any, user: AuthenticatedUser, manager: EntityManager) => Promise<any>;
}

export const checkToolPermission = (toolName: AiAssistantToolName, user: AuthenticatedUser): void => {
  const req = TOOL_RBAC_REQUIREMENTS[toolName];
  if (!req) return;

  const role = user.role;

  // Admin has full clearance across all tools
  if (role === 'ADMIN') return;

  // Manager has access to inventory, sales, finance
  if (role === 'MANAGER') return;

  // Pharmacist has access to clinical and inventory tools, but NOT finance
  if (role === 'PHARMACIST') {
    if (req.module === 'FINANCE') {
      throw new ForbiddenException(
        `Staff role PHARMACIST lacks permission ${req.module}:${req.action} required for tool ${toolName}`,
      );
    }
    return;
  }

  // Cashier is strictly restricted to basic POS, denied FINANCE and general INVENTORY/SALES management
  if (role === 'CASHIER') {
    if (req.module === 'FINANCE' || req.module === 'SALES' || toolName === 'getProfitSummary') {
      throw new ForbiddenException(
        `Staff role CASHIER lacks permission ${req.module}:${req.action} required for tool ${toolName}`,
      );
    }
    // Cashier allowed getStockLevel for customer checkout inquiry, but not wholesale inventory audits
    if (toolName === 'getLowStockMedicines' || toolName === 'getExpiringBatches') {
      throw new ForbiddenException(
        `Staff role CASHIER lacks permission ${req.module}:${req.action} required for tool ${toolName}`,
      );
    }
  }
};

export const AI_TOOL_REGISTRY: Record<AiAssistantToolName, AiToolDefinition> = {
  getLowStockMedicines: {
    name: 'getLowStockMedicines',
    description: 'Retrieve a list of pharmaceuticals currently below their configured reorder level.',
    requiredPermission: { module: 'INVENTORY', action: 'view' },
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of items to return (default 10)' },
      },
    },
    execute: async (params, user, manager) => {
      checkToolPermission('getLowStockMedicines', user);
      const limit = Math.min(Math.max(1, Number(params?.limit || 10)), 50);
      return manager.query(`
        SELECT 
          m.name AS medicine_name,
          m.generic_name,
          m.reorder_level,
          COALESCE(SUM(b.quantity_base_units), 0) AS current_stock
        FROM medicines m
        LEFT JOIN inventory_batches b ON b.medicine_id = m.id AND b.status = 'ACTIVE'
        GROUP BY m.id, m.name, m.generic_name, m.reorder_level
        HAVING current_stock <= m.reorder_level
        ORDER BY current_stock ASC
        LIMIT ?
      `, [limit]);
    },
  },

  getExpiringBatches: {
    name: 'getExpiringBatches',
    description: 'Retrieve batches expiring within a specified number of days.',
    requiredPermission: { module: 'INVENTORY', action: 'view' },
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days to check (e.g. 30, 60, 90)' },
      },
      required: ['days'],
    },
    execute: async (params, user, manager) => {
      checkToolPermission('getExpiringBatches', user);
      const days = Math.min(Math.max(1, Number(params?.days || 30)), 365);
      return manager.query(`
        SELECT 
          m.name AS medicine_name,
          b.batch_number,
          b.expiry_date,
          b.quantity_base_units,
          b.unit_cost_price
        FROM inventory_batches b
        JOIN medicines m ON m.id = b.medicine_id
        WHERE b.status = 'ACTIVE' 
          AND b.quantity_base_units > 0
          AND b.expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
          AND b.expiry_date >= CURRENT_DATE()
        ORDER BY b.expiry_date ASC
      `, [days]);
    },
  },

  getProfitSummary: {
    name: 'getProfitSummary',
    description: 'Retrieve gross and net profit summary in LKR for a given date range.',
    requiredPermission: { module: 'FINANCE', action: 'view' },
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD' },
      },
      required: ['startDate', 'endDate'],
    },
    execute: async (params, user, manager) => {
      checkToolPermission('getProfitSummary', user);
      const startDate = params.startDate;
      const endDate = params.endDate;

      const salesResult = await manager.query(`
        SELECT 
          COALESCE(SUM(s.subtotal_lkr), 0) AS total_revenue,
          COALESCE(SUM(s.discount_lkr), 0) AS total_discounts,
          COUNT(s.id) AS total_sales
        FROM sales s
        WHERE s.status = 'COMPLETED'
          AND s.created_at >= ?
          AND s.created_at <= ?
      `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

      const cogsResult = await manager.query(`
        SELECT 
          COALESCE(SUM(sia.allocated_base_units * sia.unit_cost_at_sale), 0) AS total_cogs
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN sale_item_allocations sia ON sia.sale_item_id = si.id
        WHERE s.status = 'COMPLETED'
          AND s.created_at >= ?
          AND s.created_at <= ?
      `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

      const rev = Number(salesResult[0]?.total_revenue || 0);
      const cogs = Number(cogsResult[0]?.total_cogs || 0);
      const grossProfit = rev - cogs;
      const marginPct = rev > 0 ? ((grossProfit / rev) * 100).toFixed(2) : '0.00';

      return {
        startDate,
        endDate,
        totalSalesCount: Number(salesResult[0]?.total_sales || 0),
        revenueLkr: rev.toFixed(2),
        cogsLkr: cogs.toFixed(2),
        grossProfitLkr: grossProfit.toFixed(2),
        marginPercentage: `${marginPct}%`,
      };
    },
  },

  getStockLevel: {
    name: 'getStockLevel',
    description: 'Retrieve current available base unit stock level for a specific medicine by name.',
    requiredPermission: { module: 'INVENTORY', action: 'view' },
    parameters: {
      type: 'object',
      properties: {
        medicineName: { type: 'string', description: 'Brand or generic name of medicine' },
      },
      required: ['medicineName'],
    },
    execute: async (params, user, manager) => {
      checkToolPermission('getStockLevel', user);
      const term = `%${params.medicineName}%`;
      return manager.query(`
        SELECT 
          m.name AS medicine_name,
          m.generic_name,
          m.reorder_level,
          COALESCE(SUM(b.quantity_base_units), 0) AS current_stock
        FROM medicines m
        LEFT JOIN inventory_batches b ON b.medicine_id = m.id AND b.status = 'ACTIVE'
        WHERE m.name LIKE ? OR m.generic_name LIKE ?
        GROUP BY m.id, m.name, m.generic_name, m.reorder_level
        LIMIT 5
      `, [term, term]);
    },
  },

  getCashbookBalance: {
    name: 'getCashbookBalance',
    description: 'Retrieve current ledger cash-in-drawer balance and active bank account balances in LKR.',
    requiredPermission: { module: 'FINANCE', action: 'view' },
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_params, user, manager) => {
      checkToolPermission('getCashbookBalance', user);
      const cashRes = await manager.query(`
        SELECT COALESCE(SUM(amount), 0) AS cash_balance
        FROM cash_ledger_entries
      `);

      const bankRes = await manager.query(`
        SELECT bank_name, account_number, current_balance_lkr
        FROM bank_accounts
        WHERE is_active = 1
      `);

      return {
        cashInDrawerLkr: Number(cashRes[0]?.cash_balance || 0).toFixed(2),
        bankAccounts: bankRes.map((b: any) => ({
          bankName: b.bank_name,
          accountNumber: b.account_number,
          balanceLkr: Number(b.current_balance_lkr || 0).toFixed(2),
        })),
      };
    },
  },

  getSalesTotals: {
    name: 'getSalesTotals',
    description: 'Retrieve total revenue, invoice count, and tax collections for a specified date range.',
    requiredPermission: { module: 'SALES', action: 'view' },
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD' },
      },
      required: ['startDate', 'endDate'],
    },
    execute: async (params, user, manager) => {
      checkToolPermission('getSalesTotals', user);
      const res = await manager.query(`
        SELECT 
          COUNT(id) AS total_invoices,
          COALESCE(SUM(subtotal_lkr), 0) AS gross_sales,
          COALESCE(SUM(discount_lkr), 0) AS total_discounts,
          COALESCE(SUM(tax_vat_lkr + tax_sscl_lkr), 0) AS total_tax,
          COALESCE(SUM(grand_total_lkr), 0) AS net_revenue
        FROM sales
        WHERE status = 'COMPLETED'
          AND created_at >= ?
          AND created_at <= ?
      `, [`${params.startDate} 00:00:00`, `${params.endDate} 23:59:59`]);

      const row = res[0] || {};
      return {
        startDate: params.startDate,
        endDate: params.endDate,
        totalInvoices: Number(row.total_invoices || 0),
        grossSalesLkr: Number(row.gross_sales || 0).toFixed(2),
        totalDiscountsLkr: Number(row.total_discounts || 0).toFixed(2),
        totalTaxLkr: Number(row.total_tax || 0).toFixed(2),
        netRevenueLkr: Number(row.net_revenue || 0).toFixed(2),
      };
    },
  },
};
