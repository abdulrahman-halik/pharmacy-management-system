import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMedicineCatalogueTables1715000000000 implements MigrationInterface {
  name = 'CreateMedicineCatalogueTables1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`name\` varchar(80) NOT NULL,
        \`description\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_categories_store_name\` (\`store_id\`, \`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`medicines\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`name\` varchar(180) NOT NULL,
        \`generic_name\` varchar(180) NOT NULL,
        \`brand_manufacturer\` varchar(120) NOT NULL,
        \`category_id\` varchar(36) NULL,
        \`strength\` varchar(60) NOT NULL,
        \`dosage_form\` enum('TABLET','CAPSULE','SYRUP','INJECTION','CREAM','DROPS','INHALER','SUPPOSITORY','POWDER') NOT NULL DEFAULT 'TABLET',
        \`barcode\` varchar(64) NULL,
        \`qr_code\` varchar(128) NULL,
        \`nsqu_code\` varchar(64) NULL,
        \`hsn_code\` varchar(32) NULL,
        \`vat_percentage\` decimal(5,2) NOT NULL DEFAULT 0.00,
        \`is_vat_exempt\` tinyint(1) NOT NULL DEFAULT 1,
        \`reorder_level\` int unsigned NOT NULL DEFAULT 50,
        \`rack_location\` varchar(40) NULL,
        \`schedule_class\` enum('OTC','PRESCRIPTION_ONLY','CONTROLLED_II') NOT NULL DEFAULT 'OTC',
        \`storage_condition\` enum('ROOM_TEMPERATURE','COLD_CHAIN','DEEP_FREEZE') NOT NULL DEFAULT 'ROOM_TEMPERATURE',
        \`requires_prescription\` tinyint(1) NOT NULL DEFAULT 0,
        \`is_controlled_substance\` tinyint(1) NOT NULL DEFAULT 0,
        \`mrp\` decimal(12,2) NULL,
        \`version\` int unsigned NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_medicines_store_barcode\` (\`store_id\`, \`barcode\`),
        KEY \`idx_medicines_store_name\` (\`store_id\`, \`name\`),
        KEY \`idx_medicines_store_generic\` (\`store_id\`, \`generic_name\`),
        KEY \`idx_medicines_store_schedule\` (\`store_id\`, \`schedule_class\`),
        KEY \`idx_medicines_nsqu_code\` (\`nsqu_code\`),
        FULLTEXT KEY \`idx_med_fulltext\` (\`name\`, \`generic_name\`),
        CONSTRAINT \`FK_medicines_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`medicine_packaging\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`base_unit_name\` varchar(32) NOT NULL DEFAULT 'Unit',
        \`units_per_packet\` int unsigned NOT NULL DEFAULT 1,
        \`packets_per_box\` int unsigned NULL,
        \`boxes_per_carton\` int unsigned NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_medicine_packaging_medicine\` (\`medicine_id\`),
        CONSTRAINT \`FK_packaging_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`medicine_price_overrides\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`packaging_level\` enum('UNIT','PACKET','BOX','CARTON') NOT NULL,
        \`selling_price\` decimal(12,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_price_override_medicine_level\` (\`medicine_id\`, \`packaging_level\`),
        CONSTRAINT \`FK_price_overrides_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`medicine_price_overrides\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`medicine_packaging\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`medicines\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`categories\`;`);
  }
}
