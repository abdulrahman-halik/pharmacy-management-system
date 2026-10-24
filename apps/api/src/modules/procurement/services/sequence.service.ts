import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class ProcurementSequenceService {
  /**
   * Generates a high-concurrency, atomic sequential identifier
   * using an atomic row upsert on invoice_sequences without deadlocking on table gap locks.
   */
  async getNextNumber(prefix: string, manager: EntityManager, padLength: number = 4): Promise<string> {
    await manager.query(
      `INSERT INTO \`invoice_sequences\` (\`prefix\`, \`current_value\`)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE \`current_value\` = \`current_value\` + 1`,
      [prefix],
    );

    const rows = await manager.query(
      `SELECT \`current_value\` FROM \`invoice_sequences\` WHERE \`prefix\` = ?`,
      [prefix],
    );

    const nextSeq = rows && rows.length > 0 ? rows[0].current_value : 1;
    const paddedSeq = String(nextSeq).padStart(padLength, '0');
    return `${prefix}${paddedSeq}`;
  }

  async getNextPoNumber(manager: EntityManager): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.getNextNumber(`PO-${yearMonth}-`, manager, 4);
  }

  async getNextGrnNumber(manager: EntityManager): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.getNextNumber(`GRN-${yearMonth}-`, manager, 4);
  }

  async getNextReturnNumber(manager: EntityManager): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.getNextNumber(`PR-${yearMonth}-`, manager, 4);
  }

  async getNextPaymentNumber(manager: EntityManager): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.getNextNumber(`PAY-${yearMonth}-`, manager, 4);
  }
}
