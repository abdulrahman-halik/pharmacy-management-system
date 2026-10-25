import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceAndCashbookTables1720000000000 implements MigrationInterface {
  name = 'CreateFinanceAndCashbookTables1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Audit Logs (if not existing)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`user_id\` varchar(64) NOT NULL,
        \`user_email\` varchar(150) NOT NULL,
        \`action\` varchar(64) NOT NULL,
        \`entity_name\` varchar(64) NOT NULL,
        \`entity_id\` varchar(64) NULL,
        \`before_state_json\` json NULL,
        \`after_state_json\` json NULL,
        \`ip_address\` varchar(45) NOT NULL,
        \`user_agent\` varchar(255) NOT NULL,
        \`integrity_hash\` char(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_audit_logs_user_id\` (\`user_id\`),
        KEY \`idx_audit_logs_action\` (\`action\`),
        KEY \`idx_audit_logs_entity_name\` (\`entity_name\`),
        KEY \`idx_audit_logs_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 1. Payment Methods
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`payment_methods\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`code\` varchar(40) NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`requires_reference\` tinyint(1) NOT NULL DEFAULT 0,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_payment_methods_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Bank Accounts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`bank_accounts\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`bank_name\` varchar(100) NOT NULL,
        \`branch_name\` varchar(80) NOT NULL,
        \`account_number\` varchar(40) NOT NULL,
        \`account_name\` varchar(120) NOT NULL,
        \`opening_balance_lkr\` decimal(14,2) NOT NULL DEFAULT 0.00,
        \`current_balance_lkr\` decimal(14,2) NOT NULL DEFAULT 0.00,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_bank_accounts_number\` (\`account_number\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Expense Categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`expense_categories\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`code\` varchar(40) NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`description\` varchar(255) NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_expense_categories_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Expenses
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`expenses\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`expense_date\` date NOT NULL,
        \`category_id\` varchar(36) NOT NULL,
        \`amount_lkr\` decimal(12,2) NOT NULL,
        \`payment_method_id\` varchar(36) NOT NULL,
        \`bank_account_id\` varchar(36) NULL,
        \`description\` varchar(255) NOT NULL,
        \`receipt_image_url\` varchar(255) NULL,
        \`created_by_user_id\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_expenses_date\` (\`expense_date\`),
        KEY \`idx_expenses_category_id\` (\`category_id\`),
        KEY \`idx_expenses_payment_method_id\` (\`payment_method_id\`),
        KEY \`idx_expenses_bank_account_id\` (\`bank_account_id\`),
        CONSTRAINT \`FK_expenses_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`expense_categories\` (\`id\`),
        CONSTRAINT \`FK_expenses_payment_method\` FOREIGN KEY (\`payment_method_id\`) REFERENCES \`payment_methods\` (\`id\`),
        CONSTRAINT \`FK_expenses_bank_account\` FOREIGN KEY (\`bank_account_id\`) REFERENCES \`bank_accounts\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Cash Ledger Entries
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cash_ledger_entries\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`entry_date\` datetime NOT NULL,
        \`direction\` enum('IN','OUT') NOT NULL,
        \`amount_lkr\` decimal(14,2) NOT NULL,
        \`payment_method_id\` varchar(36) NOT NULL,
        \`bank_account_id\` varchar(36) NULL,
        \`source_type\` enum('SALE','SALE_RETURN','CUSTOMER_COLLECTION','SUPPLIER_PAYMENT','PURCHASE_RETURN_REFUND','EXPENSE','OTHER_INCOME','SALARY','ADVANCE','OPENING','TRANSFER') NOT NULL,
        \`source_id\` varchar(64) NULL,
        \`description\` varchar(255) NOT NULL,
        \`user_id\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_cash_date_source\` (\`entry_date\`, \`source_type\`),
        KEY \`idx_cash_payment_method_id\` (\`payment_method_id\`),
        KEY \`idx_cash_bank_account_id\` (\`bank_account_id\`),
        KEY \`idx_cash_source_id\` (\`source_id\`),
        CONSTRAINT \`FK_cash_payment_method\` FOREIGN KEY (\`payment_method_id\`) REFERENCES \`payment_methods\` (\`id\`),
        CONSTRAINT \`FK_cash_bank_account\` FOREIGN KEY (\`bank_account_id\`) REFERENCES \`bank_accounts\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Day Closes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`day_closes\` (
        \`id\` varchar(36) NOT NULL,
        \`store_id\` int NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`created_by\` varchar(64) NULL,
        \`updated_by\` varchar(64) NULL,
        \`closing_date\` date NOT NULL,
        \`opening_cash_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`cash_sales_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`cash_collections_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`cash_refunds_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`cash_expenses_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`expected_cash_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`counted_cash_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`cash_variance_lkr\` decimal(12,2) NOT NULL DEFAULT 0.00,
        \`variance_reason\` varchar(255) NULL,
        \`denominations_json\` json NOT NULL,
        \`is_locked\` tinyint(1) NOT NULL DEFAULT 1,
        \`closed_by_user_id\` varchar(64) NOT NULL,
        \`reopened_by_user_id\` varchar(64) NULL,
        \`reopen_reason\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_day_close_date_store\` (\`closing_date\`, \`store_id\`),
        KEY \`idx_day_closes_closing_date\` (\`closing_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Seed Default Payment Methods
    await queryRunner.query(`
      INSERT IGNORE INTO \`payment_methods\` (\`id\`, \`code\`, \`name\`, \`requires_reference\`, \`is_active\`) VALUES
      ('pm-cash', 'CASH', 'Cash Counter', 0, 1),
      ('pm-card', 'VISA_MASTER', 'Visa / MasterCard', 1, 1),
      ('pm-qr', 'LANKA_QR', 'LankaPay QR / Online', 1, 1),
      ('pm-credit', 'CUSTOMER_CREDIT', 'Customer Credit', 0, 1),
      ('pm-loyalty', 'LOYALTY_POINTS', 'Loyalty Points Redemption', 0, 1),
      ('pm-transfer', 'BANK_TRANSFER', 'Direct Bank Transfer', 1, 1),
      ('pm-cheque', 'CHEQUE', 'Cheque Payment', 1, 1);
    `);

    // 8. Seed Default Expense Categories
    await queryRunner.query(`
      INSERT IGNORE INTO \`expense_categories\` (\`id\`, \`code\`, \`name\`, \`description\`, \`is_active\`) VALUES
      ('ec-rent', 'RENT', 'Store Premises Rent', 'Monthly retail rental charges', 1),
      ('ec-electricity', 'ELECTRICITY', 'CEB Electricity', 'Electricity bill and air conditioning', 1),
      ('ec-water', 'WATER', 'Water Supply', 'National Water Supply and Drainage Board', 1),
      ('ec-internet', 'INTERNET', 'Telecom & Internet', 'Broadband and POS hotline connections', 1),
      ('ec-delivery', 'DELIVERY', 'Courier & Delivery', 'Customer prescription dispatch costs', 1),
      ('ec-packaging', 'PACKAGING', 'Packaging Materials', 'Pharmacy bags, envelopes, and bottles', 1),
      ('ec-staff-meals', 'STAFF_MEALS', 'Staff Tea & Refreshments', 'Daily staff tea, snacks, and meals', 1),
      ('ec-maintenance', 'MAINTENANCE', 'Store Maintenance & Repairs', 'Equipment and refrigeration upkeep', 1),
      ('ec-stationery', 'PRINTING_STATIONERY', 'Printing & Stationery', 'Thermal rolls, invoice sheets, ink', 1),
      ('ec-marketing', 'MARKETING', 'Advertising & Signage', 'Promotions and clinical campaigns', 1),
      ('ec-other', 'OTHER', 'Miscellaneous Expenses', 'Other operational overhead expenses', 1);
    `);

    // 9. Seed Default Bank Account
    await queryRunner.query(`
      INSERT IGNORE INTO \`bank_accounts\` (\`id\`, \`bank_name\`, \`branch_name\`, \`account_number\`, \`account_name\`, \`opening_balance_lkr\`, \`current_balance_lkr\`, \`is_active\`) VALUES
      ('ba-comb-main', 'Commercial Bank of Ceylon', 'Kollupitiya Branch', '1000849201', 'Pharmacy Main Operating Account', 150000.00, 150000.00, 1);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `day_closes`;');
    await queryRunner.query('DROP TABLE IF EXISTS `cash_ledger_entries`;');
    await queryRunner.query('DROP TABLE IF EXISTS `expenses`;');
    await queryRunner.query('DROP TABLE IF EXISTS `expense_categories`;');
    await queryRunner.query('DROP TABLE IF EXISTS `bank_accounts`;');
    await queryRunner.query('DROP TABLE IF EXISTS `payment_methods`;');
  }
}
