# Operational Disaster Recovery & Production Runbook

**System Name:** Enterprise Pharmacy Management & POS System  
**Organization:** Universal / Configurable Pharmacy Template  
**Classification:** Operational Security & Disaster Recovery Guide  
**Compliance Standard:** NMRA Regulatory Verification, OWASP Top 10 for LLM Applications

---

## 1. Architecture Overview & Storage Tier

The production deployment consists of:
- **Application Tier:** NestJS 10 running stateless containers behind an NGINX reverse proxy.
- **Database Tier:** MySQL 8.0 with InnoDB engine, row-level locking, and transactional binary logging (`binlog_format=ROW`).
- **Cache & Message Broker:** Redis 7 for high-speed rate limiting, distributed session tokens, and BullMQ background queues.
- **Object Storage:** MinIO / AWS S3 for scanned prescriptions and generated PDF reports.

---

## 2. Backup & Disaster Recovery Procedures

### 2.1 Automated Nightly Backup Schedule
Logical database backups run every night at **01:30 AM (Asia/Colombo / UTC+05:30)** via cron using `infra/scripts/backup-db.sh`.

```bash
# Production Crontab Entry (/etc/cron.d/pharmacy-backup)
30 1 * * * root /opt/pharmacy/infra/scripts/backup-db.sh >> /var/log/pharmacy_backup.log 2>&1
```

**Key Characteristics:**
- **Single Transaction:** MySQL `--single-transaction` guarantees consistent snapshot without table locking.
- **Routines & Triggers:** Stored procedures and triggers preserved.
- **GZIP Compression:** Saves ~85% disk footprint (`.sql.gz`).
- **Retention:** Backups older than 30 days are automatically purged.

### 2.2 Point-in-Time Recovery (PITR) Procedure

In the event of accidental data corruption or hardware failure, follow this exact sequence:

#### Step 1: Quarantine Affected Database
Stop the application to prevent conflicting writes:
```bash
docker stop pharmacy_api
```

#### Step 2: Restore Latest Baseline Logical Dump
Restore the most recent daily snapshot into the clean database:
```bash
gunzip -c /var/backups/pharmacy_system/pharmacy_backup_20261023_013000.sql.gz | \
  docker exec -i pharmacy_mysql mysql -u pharmacy_user -ppharmacy_password_2026 pharmacy_db
```

#### Step 3: Replay Binary Logs to the Exact Target Timestamp
Identify the exact incident timestamp (e.g. `2026-10-23 14:15:22`) and replay binlogs:
```bash
docker exec -i pharmacy_mysql mysqlbinlog \
  --start-datetime="2026-10-23 01:30:00" \
  --stop-datetime="2026-10-23 14:15:00" \
  /var/lib/mysql/binlog.000012 | \
  docker exec -i pharmacy_mysql mysql -u pharmacy_user -ppharmacy_password_2026 pharmacy_db
```

#### Step 4: Verify Database Invariant Integrity
Run the schema and consistency verification test suite:
```bash
npm run test -w @pharmacy/api
```

#### Step 5: Resume Application Services
```bash
docker start pharmacy_api
```

---

## 3. Database Index Tuning & Maintenance

The production database relies on tuned composite indexes:
- `medicines (store_id, barcode)`: Sub-50ms barcode scans during peak retail checkouts.
- `inventory_batches (medicine_id, status, expiry_date)`: Sub-10ms FEFO batch prioritization.
- `stock_movements (medicine_id, batch_id, created_at)`: Audit trails across 1,000,000+ movement rows.
- `sales (created_at, status)`: Executive reporting queries with instant aggregations.

### Index Defragmentation
Run monthly index optimization during scheduled maintenance windows:
```sql
OPTIMIZE TABLE sales;
OPTIMIZE TABLE sale_items;
OPTIMIZE TABLE sale_item_allocations;
OPTIMIZE TABLE inventory_batches;
OPTIMIZE TABLE stock_movements;
```

---

## 4. AI Assistant Security & Guardrail Enforcement

The AI assistant operates under strict sandboxing protocols:
1. **Zero Text-to-SQL Policy:** The LLM cannot emit raw SQL strings. All queries execute through hardcoded, strongly typed TypeORM parameter bindings in `apps/api/src/modules/ai-assistant/tools/tool-registry.ts`.
2. **RBAC Security Gate:** Every tool call verifies calling user's JWT role before execution. Cashiers are strictly denied access to finance or cost data.
3. **Prompt Injection Hardening:** System prompts actively filter out instructions attempting to bypass constraints, inspect database schemas, or dump credentials.
4. **Credential Encryption:** Third-party LLM API keys are encrypted at rest using AES-256-GCM.

---

## 5. Incident Response Playbook

| Scenario | Immediate Action | Mitigation |
|---|---|---|
| **Pessimistic Lock Timeout on Batch Checkout** | Identify blocking transactions via `SHOW FULL PROCESSLIST;` | Ensure POS transactions commit within 400ms; avoid holding locks during network I/O. |
| **Negative Inventory Batch Balance Detected** | Table check constraint `chk_batch_qty_positive` triggers abort | Investigate audit log for manual adjustments; run physical inventory count reconciliation. |
| **Cashbook Day Close Discrepancy** | Staff cannot commit day close without variance explanation note | Review unposted sales or supplier payments in drawer. |
| **Controlled Drug Dispensing Audit Failure** | Block checkout until Patient NIC and Doctor SLMC are registered | NMRA statutory compliance mandate. |

---

## 6. Health Checks & Monitoring

The system exposes health endpoints:
- `GET /health`: Comprehensive database, Redis, and disk space health check.
- **Port 3307:** MySQL instance.
- **Port 6379:** Redis instance.
- **Port 3000:** NestJS Core API.
