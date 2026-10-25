import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomersDoctorsAndPrescriptions1717000000000
  implements MigrationInterface
{
  name = 'CreateCustomersDoctorsAndPrescriptions1717000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`customers\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`full_name\` varchar(120) NOT NULL,
        \`phone\` varchar(20) NOT NULL,
        \`email\` varchar(150) NULL,
        \`nic_or_passport\` varchar(32) NULL,
        \`dob\` date NULL,
        \`gender\` varchar(16) NULL,
        \`address\` text NULL,
        \`allergies\` json NULL,
        \`medical_notes\` text NULL,
        \`credit_limit\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`credit_balance\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`loyalty_points\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        KEY \`idx_customer_phone\` (\`phone\`),
        KEY \`idx_customer_nic\` (\`nic_or_passport\`),
        KEY \`idx_customer_name\` (\`full_name\`),
        CONSTRAINT \`chk_customer_credit_limit_non_neg\` CHECK (\`credit_limit\` >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`customer_credit_ledgers\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`customer_id\` varchar(36) NOT NULL,
        \`entry_type\` varchar(30) NOT NULL,
        \`amount\` decimal(12,2) NOT NULL,
        \`running_balance\` decimal(12,2) NOT NULL,
        \`reference_type\` varchar(50) NULL,
        \`reference_id\` varchar(64) NULL,
        \`notes\` varchar(255) NULL,
        \`recorded_by\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_credit_customer\` (\`customer_id\`, \`created_at\`),
        CONSTRAINT \`FK_credit_ledger_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`customer_loyalty_ledgers\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`customer_id\` varchar(36) NOT NULL,
        \`entry_type\` varchar(30) NOT NULL,
        \`points\` int NOT NULL,
        \`running_points\` int NOT NULL,
        \`reference_type\` varchar(50) NULL,
        \`reference_id\` varchar(64) NULL,
        \`notes\` varchar(255) NULL,
        \`recorded_by\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_loyalty_customer\` (\`customer_id\`, \`created_at\`),
        CONSTRAINT \`FK_loyalty_ledger_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`doctors\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`full_name\` varchar(120) NOT NULL,
        \`registration_number\` varchar(40) NOT NULL,
        \`specialization\` varchar(80) NULL,
        \`clinic_name\` varchar(120) NULL,
        \`mobile_number\` varchar(20) NULL,
        \`clinic_address\` text NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_doctor_slmc\` (\`registration_number\`),
        KEY \`idx_doctor_name\` (\`full_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`prescriptions\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`rx_number\` varchar(40) NOT NULL,
        \`customer_id\` varchar(36) NOT NULL,
        \`doctor_id\` varchar(36) NOT NULL,
        \`issued_date\` date NOT NULL,
        \`valid_until\` date NOT NULL,
        \`status\` enum('PENDING','VERIFIED','REJECTED','EXPIRED','FULLY_DISPENSED') NOT NULL DEFAULT 'PENDING',
        \`image_urls\` json NOT NULL,
        \`verified_by\` varchar(64) NULL,
        \`verified_at\` datetime NULL,
        \`rejection_reason\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_rx_number\` (\`rx_number\`),
        KEY \`idx_rx_status\` (\`status\`),
        KEY \`idx_rx_customer\` (\`customer_id\`),
        KEY \`idx_rx_doctor\` (\`doctor_id\`),
        CONSTRAINT \`FK_rx_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_rx_doctor\` FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctors\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`prescription_items\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`prescription_id\` varchar(36) NOT NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`dosage\` varchar(80) NOT NULL,
        \`duration_days\` int NOT NULL DEFAULT 5,
        \`prescribed_quantity_base_units\` int NOT NULL,
        \`dispensed_quantity_base_units\` int NOT NULL DEFAULT 0,
        \`refill_allowed\` tinyint(1) NOT NULL DEFAULT 0,
        \`refills_allowed_count\` int NOT NULL DEFAULT 0,
        \`refills_used\` int NOT NULL DEFAULT 0,
        \`refill_interval_days\` int NOT NULL DEFAULT 30,
        \`last_dispensed_at\` datetime NULL,
        \`item_status\` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
        PRIMARY KEY (\`id\`),
        KEY \`idx_rx_item_lookup\` (\`prescription_id\`, \`medicine_id\`),
        CONSTRAINT \`FK_rx_item_prescription\` FOREIGN KEY (\`prescription_id\`) REFERENCES \`prescriptions\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_rx_item_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`controlled_substance_register\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`medicine_id\` varchar(36) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`quantity_base_units\` int NOT NULL,
        \`running_balance\` int NOT NULL,
        \`customer_id\` varchar(36) NOT NULL,
        \`customer_nic\` varchar(32) NOT NULL,
        \`doctor_id\` varchar(36) NOT NULL,
        \`doctor_slmc_reg_no\` varchar(40) NOT NULL,
        \`prescription_id\` varchar(36) NOT NULL,
        \`pharmacist_user_id\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_controlled_audit\` (\`medicine_id\`, \`created_at\`),
        CONSTRAINT \`FK_controlled_medicine\` FOREIGN KEY (\`medicine_id\`) REFERENCES \`medicines\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_controlled_batch\` FOREIGN KEY (\`batch_id\`) REFERENCES \`inventory_batches\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`controlled_substance_register\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`prescription_items\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`prescriptions\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`doctors\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`customer_loyalty_ledgers\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`customer_credit_ledgers\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`customers\`;`);
  }
}
