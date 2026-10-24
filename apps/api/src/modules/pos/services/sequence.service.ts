import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class SequenceService {
  /**
   * Generates a high-concurrency, atomic sequential invoice number (e.g. INV-202610-00001)
   * using an atomic row upsert on invoice_sequences without deadlocking on table gap locks.
   */
  async getNextInvoiceNumber(manager: EntityManager): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `INV-${yearMonth}-`;

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
    const paddedSeq = String(nextSeq).padStart(5, '0');
    return `${prefix}${paddedSeq}`;
  }
}
