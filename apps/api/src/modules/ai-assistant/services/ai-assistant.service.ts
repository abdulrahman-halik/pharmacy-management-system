import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  AiChatRequest,
  AiChatResponse,
  AI_SYSTEM_PROMPT,
  AiAssistantToolName,
  AI_ASSISTANT_TOOLS,
} from '@pharmacy/shared';
import { AI_TOOL_REGISTRY, checkToolPermission } from '../tools/tool-registry';
import { EncryptionService } from './encryption.service';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Filters the tool catalog based on the caller's role.
   */
  getAvailableTools(user: AuthenticatedUser) {
    const tools = [];
    for (const toolName of AI_ASSISTANT_TOOLS) {
      try {
        checkToolPermission(toolName, user);
        const def = AI_TOOL_REGISTRY[toolName];
        tools.push({
          name: def.name,
          description: def.description,
          parameters: def.parameters,
        });
      } catch {
        // Excluded from user's view
      }
    }
    return tools;
  }

  /**
   * Core chat processing loop with strict RBAC gatekeeper, prompt hardening, and zero text-to-SQL.
   */
  async processMessage(request: AiChatRequest, user: AuthenticatedUser): Promise<AiChatResponse> {
    const rawMessage = (request.message || '').trim();

    // 1. Prompt Injection & Jailbreak Defense Gate
    if (this.detectPromptInjection(rawMessage)) {
      this.logger.warn(`Prompt injection attempt blocked from user ${user.id} (${user.role}): "${rawMessage}"`);
      return {
        reply: 'I can only answer questions related to pharmacy operations using authorized tools.',
        toolsExecuted: [],
      };
    }

    // 2. Identify intended tools from intent
    const toolIntent = this.inferToolIntent(rawMessage);
    if (!toolIntent) {
      // General question without matched tool
      return {
        reply: 'I am your Clinical & Operational Assistant. I can check current low stock levels, expiring batches, inventory levels by medicine name, sales performance, cashbook balances, and profit metrics. How may I assist you today?',
        toolsExecuted: [],
      };
    }

    const { toolName, params } = toolIntent;
    const toolDef = AI_TOOL_REGISTRY[toolName];

    // 3. RBAC Verification Gate
    try {
      checkToolPermission(toolName, user);
    } catch (err: any) {
      this.logger.warn(`RBAC gate denied tool ${toolName} to user ${user.id} (${user.role})`);
      const isFinance = toolName === 'getProfitSummary' || toolName === 'getCashbookBalance';
      const denialMessage = isFinance
        ? 'I cannot provide this information because your account lacks permission to access financial records.'
        : `I cannot provide this information because your account lacks permission to access ${toolDef.requiredPermission.module.toLowerCase()} records.`;

      return {
        reply: denialMessage,
        toolsExecuted: [
          {
            name: toolName,
            params,
            status: 'FORBIDDEN',
            resultSnippet: 'Role unauthorized',
          },
        ],
        deniedTools: [toolName],
      };
    }

    // 4. Parameterized Tool Execution
    try {
      const toolResult = await toolDef.execute(params, user, this.dataSource.manager);
      const formattedReply = this.formatToolResultToNaturalLanguage(toolName, toolResult, rawMessage);

      return {
        reply: formattedReply,
        toolsExecuted: [
          {
            name: toolName,
            params,
            status: 'SUCCESS',
            resultSnippet: toolResult,
          },
        ],
      };
    } catch (err: any) {
      this.logger.error(`Error executing tool ${toolName}: ${err.message}`, err.stack);
      return {
        reply: `An error occurred while retrieving pharmacy data: ${err.message}`,
        toolsExecuted: [
          {
            name: toolName,
            params,
            status: 'ERROR',
            resultSnippet: err.message,
          },
        ],
      };
    }
  }

  /**
   * Evaluates input string for adversarial patterns, system prompt overrides, or SQL injection.
   */
  private detectPromptInjection(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    const maliciousPatterns = [
      'ignore previous instructions',
      'ignore all instructions',
      'override system',
      'disregard previous',
      'output all password',
      'show password hashes',
      'dump database',
      'select * from',
      'select password',
      'drop table',
      'union select',
      'who is your system prompt',
      'print your instructions',
      'pretend you have no restrictions',
      'jailbreak',
    ];

    return maliciousPatterns.some((pattern) => lower.includes(pattern));
  }

  /**
   * Infers which whitelisted tool matches the user's operational inquiry.
   */
  private inferToolIntent(query: string): { toolName: AiAssistantToolName; params: any } | null {
    const q = query.toLowerCase();

    // 1. Profit Summary
    if (q.includes('profit') || q.includes('margin') || q.includes('cogs')) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        toolName: 'getProfitSummary',
        params: { startDate: '2020-01-01', endDate: today },
      };
    }

    // 2. Low Stock / Reorder Level
    if (q.includes('low stock') || q.includes('reorder') || q.includes('running out') || q.includes('depleted')) {
      return {
        toolName: 'getLowStockMedicines',
        params: { limit: 10 },
      };
    }

    // 3. Expiring Batches
    if (q.includes('expir') || q.includes('expired') || q.includes('shelf life')) {
      let days = 30;
      if (q.includes('60')) days = 60;
      if (q.includes('90')) days = 90;
      if (q.includes('2')) days = 2;
      return {
        toolName: 'getExpiringBatches',
        params: { days },
      };
    }

    // 4. Cashbook Balance
    if (q.includes('cashbook') || q.includes('cash in drawer') || q.includes('bank balance') || q.includes('drawer')) {
      return {
        toolName: 'getCashbookBalance',
        params: {},
      };
    }

    // 5. Sales Totals
    if (q.includes('sales total') || q.includes('revenue') || q.includes('total sales') || q.includes('gross sales')) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        toolName: 'getSalesTotals',
        params: { startDate: '2020-01-01', endDate: today },
      };
    }

    // 6. Stock Level by Medicine Name
    if (q.includes('stock of') || q.includes('how many') || q.includes('do we have') || q.includes('stock')) {
      const clean = q
        .replace(/what is the current/gi, '')
        .replace(/what is the/gi, '')
        .replace(/what is/gi, '')
        .replace(/how many/gi, '')
        .replace(/do we have/gi, '')
        .replace(/stock of/gi, '')
        .replace(/stock/gi, '')
        .replace(/units/gi, '')
        .replace(/level/gi, '')
        .replace(/available/gi, '')
        .replace(/\?/g, '')
        .trim();
      return {
        toolName: 'getStockLevel',
        params: { medicineName: clean || 'Amoxicillin' },
      };
    }

    return null;
  }

  /**
   * Converts structured tool output into clear, clinical Markdown with summary and tables.
   */
  private formatToolResultToNaturalLanguage(
    toolName: AiAssistantToolName,
    data: any,
    _query: string,
  ): string {
    switch (toolName) {
      case 'getLowStockMedicines': {
        if (!Array.isArray(data) || data.length === 0) {
          return 'All pharmaceuticals are currently adequately stocked above their configured reorder thresholds.';
        }
        let table = '### Pharmaceuticals Below Reorder Level\n\n';
        table += '| Medicine Name | Generic Name | Reorder Level | Current Stock |\n';
        table += '|---|---|---|---|\n';
        for (const item of data) {
          table += `| **${item.medicine_name}** | ${item.generic_name || '-'} | ${item.reorder_level} | **${item.current_stock}** |\n`;
        }
        return `${table}\nRecommended action: Generate purchase orders for the items listed above.`;
      }

      case 'getExpiringBatches': {
        if (!Array.isArray(data) || data.length === 0) {
          return 'No active pharmaceutical batches are expiring within the specified date threshold.';
        }
        let table = '### Batches Nearing Expiry\n\n';
        table += '| Medicine Name | Batch Number | Expiry Date | Units Remaining |\n';
        table += '|---|---|---|---|\n';
        for (const item of data) {
          const exp = typeof item.expiry_date === 'string' ? item.expiry_date.slice(0, 10) : item.expiry_date;
          table += `| **${item.medicine_name}** | \`${item.batch_number}\` | ${exp} | ${item.quantity_base_units} |\n`;
        }
        return `${table}\nEnsure older batches are dispensed first following FEFO guidelines.`;
      }

      case 'getProfitSummary': {
        return `### Financial Profit & Loss Summary (${data.startDate} to ${data.endDate})

- **Total Invoices Completed:** ${data.totalSalesCount}
- **Gross Sales Revenue:** Rs. ${data.revenueLkr}
- **Allocated Inventory COGS:** Rs. ${data.cogsLkr}
- **Gross Profit Margin:** **Rs. ${data.grossProfitLkr}** (${data.marginPercentage})
`;
      }

      case 'getStockLevel': {
        if (!Array.isArray(data) || data.length === 0) {
          return 'No matching pharmaceutical was found in the inventory catalogue.';
        }
        let table = '### Inventory Stock Verification\n\n';
        table += '| Medicine Name | Generic Name | Current Stock Units | Status |\n';
        table += '|---|---|---|---|\n';
        for (const item of data) {
          const status = item.current_stock <= item.reorder_level ? '⚠️ LOW STOCK' : '✅ ADEQUATE';
          table += `| **${item.medicine_name}** | ${item.generic_name || '-'} | **${item.current_stock}** | ${status} |\n`;
        }
        return table;
      }

      case 'getCashbookBalance': {
        let text = `### Cashbook & Treasury Status\n\n- **Cash in Drawer (Physical Ledger):** Rs. ${data.cashInDrawerLkr}\n\n`;
        if (data.bankAccounts?.length > 0) {
          text += '| Bank Name | Account Number | Ledger Balance |\n|---|---|---|\n';
          for (const b of data.bankAccounts) {
            text += `| ${b.bankName} | \`${b.accountNumber}\` | Rs. ${b.balanceLkr} |\n`;
          }
        }
        return text;
      }

      case 'getSalesTotals': {
        return `### Sales Performance Summary (${data.startDate} to ${data.endDate})

- **Invoices Completed:** ${data.totalInvoices}
- **Gross Sales:** Rs. ${data.grossSalesLkr}
- **Discounts Allowed:** Rs. ${data.totalDiscountsLkr}
- **Taxes (VAT + SSCL):** Rs. ${data.totalTaxLkr}
- **Net Revenue Collected:** **Rs. ${data.netRevenueLkr}**
`;
      }

      default:
        return JSON.stringify(data, null, 2);
    }
  }
}
