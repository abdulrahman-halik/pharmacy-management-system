import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProcurementTables1719000000000 implements MigrationInterface {
  name = 'CreateProcurementTables1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`suppliers\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`company_name\` varchar(150) NOT NULL,
        \`contact_person\` varchar(100) NULL,
        \`phone\` varchar(20) NOT NULL,
        \`email\` varchar(150) NULL,
        \`address\` text NULL,
        \`tax_tin_number\` varchar(50) NULL,
        \`payment_terms_days\` int NOT NULL DEFAULT 30,
        \`outstanding_payable_lkr\` decimal(14,2) NOT NULL DEFAULT 0.00,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        KEY \`idx_suppliers_company_name\` (\`company_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`purchase_orders\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`po_number\` varchar(40) NOT NULL,
        \`supplier_id\` varchar(36) NOT NULL,
        \`order_date\` date NOT NULL,
        \`expected_delivery_date\` date NULL,
        \`status\` enum('DRAFT','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
        \`total_amount_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`notes\` text NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_po_number\` (\`po_number\`),
        KEY \`idx_po_supplier_id\` (\`supplier_id\`),
        CONSTRAINT \`FK_po_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`purchase_order_items\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`purchase_order_id\` varchar(36) NOT NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`packaging_level\` enum('UNIT','PACKET','BOX','CARTON') NOT NULL DEFAULT 'BOX',
        \`quantity\` int NOT NULL,
        \`unit_cost_lkr\` decimal(12,2) NOT NULL,
        \`line_total_lkr\` decimal(12,2) NOT NULL,
        \`received_quantity\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        KEY \`idx_poi_po_id\` (\`purchase_order_id\`),
        KEY \`idx_poi_medicine_id\` (\`medicine_id\`),
        CONSTRAINT \`FK_poi_po\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_poi_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`goods_received_notes\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`grn_number\` varchar(40) NOT NULL,
        \`supplier_id\` varchar(36) NOT NULL,
        \`purchase_order_id\` varchar(36) NULL,
        \`supplier_invoice_number\` varchar(80) NOT NULL,
        \`received_date\` date NOT NULL,
        \`subtotal_lkr\` decimal(12,2) NOT NULL,
        \`tax_vat_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`grand_total_lkr\` decimal(12,2) NOT NULL,
        \`paid_amount_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`payment_status\` enum('UNPAID','PARTIALLY_PAID','PAID') NOT NULL DEFAULT 'UNPAID',
        \`received_by_user_id\` varchar(64) NOT NULL,
        \`notes\` text NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_grn_number\` (\`grn_number\`),
        UNIQUE KEY \`uq_supplier_invoice\` (\`supplier_id\`, \`supplier_invoice_number\`),
        KEY \`idx_grn_supplier_id\` (\`supplier_id\`),
        KEY \`idx_grn_po_id\` (\`purchase_order_id\`),
        CONSTRAINT \`FK_grn_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_grn_po\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`goods_received_note_items\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`grn_id\` varchar(36) NOT NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`batch_number\` varchar(80) NOT NULL,
        \`mfd_date\` date NULL,
        \`expiry_date\` date NOT NULL,
        \`packaging_level\` enum('UNIT','PACKET','BOX','CARTON') NOT NULL DEFAULT 'BOX',
        \`purchased_quantity\` int NOT NULL,
        \`bonus_quantity\` int NOT NULL DEFAULT 0,
        \`total_received_base_units\` int NOT NULL,
        \`purchase_price_lkr\` decimal(12,2) NOT NULL,
        \`line_total_lkr\` decimal(12,2) NOT NULL,
        \`net_landed_cost_per_base_unit\` decimal(14,4) NOT NULL,
        \`batch_mrp_per_base_unit\` decimal(12,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_grni_grn_id\` (\`grn_id\`),
        KEY \`idx_grni_medicine_id\` (\`medicine_id\`),
        CONSTRAINT \`FK_grni_grn\` FOREIGN KEY (\`grn_id\`) REFERENCES \`goods_received_notes\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_grni_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`purchase_returns\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`return_number\` varchar(40) NOT NULL,
        \`supplier_id\` varchar(36) NOT NULL,
        \`return_date\` date NOT NULL,
        \`total_refund_lkr\` decimal(12,2) NOT NULL,
        \`reason\` enum('EXPIRED','DAMAGED','RECALLED','OVERSTOCK','INCORRECT_ITEM','OTHER') NOT NULL DEFAULT 'EXPIRED',
        \`notes\` text NULL,
        \`processed_by_user_id\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_return_number\` (\`return_number\`),
        KEY \`idx_pr_supplier_id\` (\`supplier_id\`),
        CONSTRAINT \`FK_pr_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`purchase_return_items\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`purchase_return_id\` varchar(36) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`quantity_base_units\` int NOT NULL,
        \`unit_cost_price\` decimal(14,4) NOT NULL,
        \`line_total_lkr\` decimal(12,2) NOT NULL,
        \`reason\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_pri_return_id\` (\`purchase_return_id\`),
        KEY \`idx_pri_batch_id\` (\`batch_id\`),
        CONSTRAINT \`FK_pri_return\` FOREIGN KEY (\`purchase_return_id\`) REFERENCES \`purchase_returns\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_pri_batch\` FOREIGN KEY (\`batch_id\`) REFERENCES \`inventory_batches\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`supplier_payments\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`payment_number\` varchar(40) NOT NULL,
        \`supplier_id\` varchar(36) NOT NULL,
        \`payment_date\` date NOT NULL,
        \`amount_lkr\` decimal(12,2) NOT NULL,
        \`payment_method\` enum('CASH','BANK_TRANSFER','CHEQUE') NOT NULL DEFAULT 'BANK_TRANSFER',
        \`reference\` varchar(100) NULL,
        \`bank_account_id\` varchar(100) NULL,
        \`notes\` text NULL,
        \`grn_allocations_json\` text NULL,
        \`processed_by_user_id\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_supplier_payment_number\` (\`payment_number\`),
        KEY \`idx_sp_supplier_id\` (\`supplier_id\`),
        CONSTRAINT \`FK_sp_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`supplier_payments\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`purchase_return_items\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`purchase_returns\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`goods_received_note_items\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`goods_received_notes\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`purchase_order_items\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`purchase_orders\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`suppliers\``);
  }
}
