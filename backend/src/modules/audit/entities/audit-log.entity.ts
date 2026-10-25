import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('audit_logs')
@Index(['createdAt'])
export class AuditLog extends BaseAppEntity {
  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ name: 'user_email', type: 'varchar', length: 150 })
  userEmail!: string;

  @Index()
  @Column({ name: 'action', type: 'varchar', length: 64 })
  action!: string; // e.g., 'LOGIN', 'PRICE_OVERRIDE', 'UPDATE_PERMISSIONS', 'VOID_SALE'

  @Index()
  @Column({ name: 'entity_name', type: 'varchar', length: 64 })
  entityName!: string; // e.g., 'Medicine', 'Sale', 'DayClose'

  @Column({ name: 'entity_id', type: 'varchar', length: 64, nullable: true })
  entityId?: string | null;

  @Column({ name: 'before_state_json', type: 'json', nullable: true })
  beforeStateJson?: Record<string, unknown> | null;

  @Column({ name: 'after_state_json', type: 'json', nullable: true })
  afterStateJson?: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 255 })
  userAgent!: string;

  @Column({ name: 'integrity_hash', type: 'char', length: 64 })
  integrityHash!: string;
}
