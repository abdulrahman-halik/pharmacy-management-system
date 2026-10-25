import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryAndLedgerTables1716000000000 implements MigrationInterface {
  name = 'CreateInventoryAndLedgerTables1716000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`inventory_batches\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`batch_number\` varchar(80) NOT NULL,
        \`mfd_date\` date NULL,
        \`expiry_date\` date NOT NULL,
        \`quantity_base_units\` int NOT NULL DEFAULT 0,
        \`unit_cost_price\` decimal(14,4) NOT NULL,
        \`batch_mrp\` decimal(12,2) NOT NULL,
        \`supplier_id\` varchar(64) NULL,
        \`status\` enum('ACTIVE','QUARANTINED','EXPIRED','DEPLETED') NOT NULL DEFAULT 'ACTIVE',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_med_batch_expiry\` (\`medicine_id\`, \`batch_number\`, \`expiry_date\`),
        KEY \`idx_fefo_lookup\` (\`medicine_id\`, \`status\`, \`expiry_date\`),
        KEY \`idx_batch_expiry\` (\`expiry_date\`),
        CONSTRAINT \`chk_batch_qty_positive\` CHECK (\`quantity_base_units\` >= 0),
        CONSTRAINT \`FK_batch_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`stock_movements\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`movement_type\` enum('OPENING','PURCHASE','SALE','SALE_RETURN_RESTOCK','PURCHASE_RETURN','ADJUST_ADD','ADJUST_REDUCE','DAMAGE','EXPIRED_WRITEOFF','AUDIT_CORRECTION') NOT NULL,
        \`quantity_base_units\` int NOT NULL,
        \`balance_after\` int NOT NULL,
        \`unit_cost_price\` decimal(14,4) NOT NULL,
        \`reference_type\` varchar(50) NULL,
        \`reference_id\` varchar(64) NULL,
        \`reason\` varchar(255) NULL,
        \`user_id\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_movement_history\` (\`medicine_id\`, \`batch_id\`, \`created_at\`),
        CONSTRAINT \`FK_movement_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_movement_batch\` FOREIGN KEY (\`batch_id\`) REFERENCES \`inventory_batches\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`stock_audit_sessions\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`session_code\` varchar(32) NOT NULL,
        \`status\` enum('IN_PROGRESS','PENDING_APPROVAL','APPROVED','REJECTED') NOT NULL DEFAULT 'IN_PROGRESS',
        \`total_variance_cost_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`approved_by\` varchar(64) NULL,
        \`approved_at\` datetime NULL,
        \`notes\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_stock_audit_session_code\` (\`session_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`stock_audit_items\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`session_id\` varchar(36) NOT NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`system_quantity_base_units\` int NOT NULL,
        \`counted_quantity_base_units\` int NOT NULL,
        \`variance_quantity_base_units\` int NOT NULL,
        \`variance_cost_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`notes\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_audit_item_session\` FOREIGN KEY (\`session_id\`) REFERENCES \`stock_audit_sessions\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_audit_item_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_audit_item_batch\` FOREIGN KEY (\`batch_id\`) REFERENCES \`inventory_batches\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`stock_audit_items\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`stock_audit_sessions\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`stock_movements\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`inventory_batches\`;`);
  }
}
