import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayrollAndAdvancesTables1721000000000
  implements MigrationInterface
{
  name = 'CreatePayrollAndAdvancesTables1721000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure `users` table exists and add compensation/banking columns
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` varchar(36) NOT NULL,
          \`store_id\` int NOT NULL DEFAULT 1,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`deleted_at\` datetime(6) NULL,
          \`created_by\` varchar(64) NULL,
          \`updated_by\` varchar(64) NULL,
          \`full_name\` varchar(120) NOT NULL,
          \`email\` varchar(150) NOT NULL,
          \`phone\` varchar(20) NOT NULL,
          \`password_hash\` varchar(255) NOT NULL,
          \`role\` enum('ADMIN','MANAGER','PHARMACIST','CASHIER') NOT NULL DEFAULT 'CASHIER',
          \`monthly_salary\` decimal(12,2) NOT NULL DEFAULT 0.00,
          \`epf_number\` varchar(32) NULL,
          \`bank_name\` varchar(100) NULL,
          \`bank_account_number\` varchar(50) NULL,
          \`bank_branch\` varchar(100) NULL,
          \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
          \`must_reset_password\` tinyint(1) NOT NULL DEFAULT 0,
          \`failed_login_count\` int NOT NULL DEFAULT 0,
          \`locked_until\` datetime NULL,
          \`last_login_at\` datetime NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_users_email\` (\`email\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      const hasEpf = await queryRunner.hasColumn('users', 'epf_number');
      if (!hasEpf) {
        await queryRunner.query(`
          ALTER TABLE \`users\`
          ADD COLUMN \`epf_number\` varchar(32) NULL AFTER \`monthly_salary\`,
          ADD COLUMN \`bank_name\` varchar(100) NULL AFTER \`epf_number\`,
          ADD COLUMN \`bank_account_number\` varchar(50) NULL AFTER \`bank_name\`,
          ADD COLUMN \`bank_branch\` varchar(100) NULL AFTER \`bank_account_number\`;
        `);
      }
    }

    // 2. Table: salary_advances
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`salary_advances\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`user_id\` varchar(64) NOT NULL,
        \`advance_date\` date NOT NULL,
        \`amount_lkr\` decimal(12,2) NOT NULL,
        \`recovered_amount_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`remaining_balance_lkr\` decimal(12,2) NOT NULL,
        \`reason\` varchar(255) NOT NULL,
        \`payment_method_id\` varchar(64) NOT NULL,
        \`status\` enum('OUTSTANDING','PARTIALLY_RECOVERED','CLEARED') NOT NULL DEFAULT 'OUTSTANDING',
        \`approved_by_user_id\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_user_advance_status\` (\`user_id\`, \`status\`),
        KEY \`idx_advance_date\` (\`advance_date\`),
        CONSTRAINT \`fk_advance_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Table: employee_payroll
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`employee_payroll\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`user_id\` varchar(64) NOT NULL,
        \`month_year\` varchar(7) NOT NULL,
        \`base_salary_lkr\` decimal(12,2) NOT NULL,
        \`bonus_allowance_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`overtime_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`gross_earnings_lkr\` decimal(12,2) NOT NULL,
        \`statutory_deductions_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`advance_deducted_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`other_deductions_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`net_payable_lkr\` decimal(12,2) NOT NULL,
        \`advance_carried_forward_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`status\` enum('DRAFT','APPROVED','DISBURSED') NOT NULL DEFAULT 'DRAFT',
        \`disbursed_at\` datetime NULL,
        \`disbursement_method\` varchar(32) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_user_payroll_month\` (\`user_id\`, \`month_year\`),
        KEY \`idx_employee_payroll_month\` (\`month_year\`),
        CONSTRAINT \`fk_payroll_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Table: payroll_deduction_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`payroll_deduction_items\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`payroll_id\` varchar(64) NOT NULL,
        \`salary_advance_id\` varchar(64) NULL,
        \`description\` varchar(100) NOT NULL,
        \`amount_lkr\` decimal(12,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_deduction_payroll\` (\`payroll_id\`),
        KEY \`idx_deduction_advance\` (\`salary_advance_id\`),
        CONSTRAINT \`fk_deduction_payroll\` FOREIGN KEY (\`payroll_id\`) REFERENCES \`employee_payroll\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`payroll_deduction_items\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`employee_payroll\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`salary_advances\`;`);

    const hasEpf = await queryRunner.hasColumn('users', 'epf_number');
    if (hasEpf) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
        DROP COLUMN \`epf_number\`,
        DROP COLUMN \`bank_name\`,
        DROP COLUMN \`bank_account_number\`,
        DROP COLUMN \`bank_branch\`;
      `);
    }
  }
}
