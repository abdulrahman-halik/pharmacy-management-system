import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeProductionIndexes1722000000000 implements MigrationInterface {
  name = 'OptimizeProductionIndexes1722000000000';

  private async safeCreateIndex(
    queryRunner: QueryRunner,
    table: string,
    indexName: string,
    createSql: string,
  ): Promise<void> {
    const hasTable = await queryRunner.hasTable(table);
    if (!hasTable) return;

    const existingIndexes: any[] = await queryRunner.query(
      `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
      [indexName],
    );

    if (existingIndexes.length === 0) {
      await queryRunner.query(createSql);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Medicines: Barcode & Name/Generic lookups
    await this.safeCreateIndex(
      queryRunner,
      'medicines',
      'idx_medicines_barcode_lookup',
      'CREATE INDEX `idx_medicines_barcode_lookup` ON `medicines` (`barcode`)',
    );

    // 2. Inventory Batches: Compound index for FEFO lookup (medicine_id, status, expiry_date)
    await this.safeCreateIndex(
      queryRunner,
      'inventory_batches',
      'idx_batches_med_status_expiry',
      'CREATE INDEX `idx_batches_med_status_expiry` ON `inventory_batches` (`medicine_id`, `status`, `expiry_date`)',
    );

    // 3. Stock Movements: Compound audit history & reference lookups
    await this.safeCreateIndex(
      queryRunner,
      'stock_movements',
      'idx_stock_mov_med_batch_created',
      'CREATE INDEX `idx_stock_mov_med_batch_created` ON `stock_movements` (`medicine_id`, `batch_id`, `created_at`)',
    );

    await this.safeCreateIndex(
      queryRunner,
      'stock_movements',
      'idx_stock_mov_reference',
      'CREATE INDEX `idx_stock_mov_reference` ON `stock_movements` (`reference_type`, `reference_id`)',
    );

    // 4. Sales: Fast temporal reporting & status aggregation
    await this.safeCreateIndex(
      queryRunner,
      'sales',
      'idx_sales_created_status',
      'CREATE INDEX `idx_sales_created_status` ON `sales` (`created_at`, `status`)',
    );

    await this.safeCreateIndex(
      queryRunner,
      'sales',
      'idx_sales_cashier_date',
      'CREATE INDEX `idx_sales_cashier_date` ON `sales` (`cashier_user_id`, `created_at`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropIndex = async (table: string, indexName: string) => {
      const hasTable = await queryRunner.hasTable(table);
      if (!hasTable) return;
      try {
        await queryRunner.query(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
      } catch {
        // ignore
      }
    };

    await dropIndex('sales', 'idx_sales_cashier_date');
    await dropIndex('sales', 'idx_sales_created_status');
    await dropIndex('stock_movements', 'idx_stock_mov_reference');
    await dropIndex('stock_movements', 'idx_stock_mov_med_batch_created');
    await dropIndex('inventory_batches', 'idx_batches_med_status_expiry');
    await dropIndex('medicines', 'idx_medicines_barcode_lookup');
  }
}
