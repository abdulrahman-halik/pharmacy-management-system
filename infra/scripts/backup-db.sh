#!/usr/bin/env bash
set -euo pipefail

# Enterprise Pharmacy Management System - Automated Database Backup Script
# Retention: 30-day rotation with GZIP compression

BACKUP_DIR="${BACKUP_DIR:-/var/backups/pharmacy_system}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pharmacy_backup_${TIMESTAMP}.sql.gz"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-pharmacy_mysql}"
DB_USER="${DB_USER:-pharmacy_user}"
DB_PASSWORD="${DB_PASSWORD:-pharmacy_password_2026}"
DB_NAME="${DB_NAME:-pharmacy_db}"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup for Pharmacy System at ${TIMESTAMP}..."

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
  docker exec "${MYSQL_CONTAINER}" mysqldump \
    -u "${DB_USER}" "-p${DB_PASSWORD}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --default-character-set=utf8mb4 \
    "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
else
  mysqldump \
    -u "${DB_USER}" "-p${DB_PASSWORD}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --default-character-set=utf8mb4 \
    "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[INFO] Backup successfully written to ${BACKUP_FILE} (${BACKUP_SIZE})"

# Retention: Delete backups older than 30 days
find "${BACKUP_DIR}" -name "pharmacy_backup_*.sql.gz" -mtime +30 -exec rm -f {} \;
echo "[INFO] Cleaned up backups older than 30 days."
