import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePosSalesAndAllocations1718000000000 implements MigrationInterface {
  name = 'CreatePosSalesAndAllocations1718000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`sales\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`invoice_number\` varchar(40) NOT NULL,
        \`customer_id\` varchar(36) NULL,
        \`cashier_user_id\` varchar(64) NOT NULL,
        \`subtotal_lkr\` decimal(12,2) NOT NULL,
        \`discount_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`tax_vat_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`tax_sscl_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`loyalty_redeemed_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`round_off_lkr\` decimal(6,2) NOT NULL DEFAULT 0.00,
        \`grand_total_lkr\` decimal(12,2) NOT NULL,
        \`paid_amount_lkr\` decimal(12,2) NOT NULL,
        \`change_given_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`split_payments\` json NOT NULL,
        \`status\` enum('COMPLETED','REFUNDED_PARTIAL','REFUNDED_FULL','VOIDED') NOT NULL DEFAULT 'COMPLETED',
        \`prescription_id\` varchar(36) NULL,
        \`idempotency_key\` varchar(128) NULL,
        \`notes\` text NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_sales_invoice_number\` (\`invoice_number\`),
        UNIQUE KEY \`uq_sales_idempotency_key\` (\`idempotency_key\`),
        KEY \`idx_sales_customer_id\` (\`customer_id\`),
        KEY \`idx_sales_created_at\` (\`created_at\`),
        CONSTRAINT \`FK_sales_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`sale_items\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`sale_id\` varchar(36) NOT NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`packaging_level\` enum('CARTON','BOX','PACKET','UNIT') NOT NULL DEFAULT 'UNIT',
        \`quantity_sold\` int NOT NULL,
        \`total_base_units\` int NOT NULL,
        \`unit_price_lkr\` decimal(12,2) NOT NULL,
        \`total_price_lkr\` decimal(12,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_sale_items_sale_id\` (\`sale_id\`),
        KEY \`idx_sale_items_medicine_id\` (\`medicine_id\`),
        CONSTRAINT \`FK_sale_items_sale\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_sale_items_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`sale_item_allocations\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`sale_item_id\` varchar(36) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`batch_number\` varchar(80) NOT NULL,
        \`expiry_date\` date NOT NULL,
        \`allocated_base_units\` int NOT NULL,
        \`unit_cost_at_sale\` decimal(14,4) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_allocations_sale_item_id\` (\`sale_item_id\`),
        KEY \`idx_allocations_batch_id\` (\`batch_id\`),
        CONSTRAINT \`FK_allocations_sale_item\` FOREIGN KEY (\`sale_item_id\`) REFERENCES \`sale_items\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_allocations_batch\` FOREIGN KEY (\`batch_id\`) REFERENCES \`inventory_batches\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`invoice_sequences\` (
        \`prefix\` varchar(32) NOT NULL,
        \`current_value\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`prefix\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`invoice_sequences\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`sale_item_allocations\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`sale_items\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`sales\`;`);
  }
}
