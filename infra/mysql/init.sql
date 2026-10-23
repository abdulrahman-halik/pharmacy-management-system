-- Pharmacy Management System - MySQL Initialization Script
-- Configured for Sri Lanka Timezone (+05:30) and Collation (utf8mb4_unicode_ci)

CREATE DATABASE IF NOT EXISTS pharmacy_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pharmacy_db;

-- Verify timezone and collation settings
SET GLOBAL time_zone = '+05:30';
SET time_zone = '+05:30';

-- System health & migration verification table
CREATE TABLE IF NOT EXISTS sys_health_check (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sys_health_check (status) VALUES ('INITIALIZED');
