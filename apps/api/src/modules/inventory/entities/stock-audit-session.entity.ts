import { Entity, Column, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { StockAuditItem } from './stock-audit-item.entity';
import { AuditStatus, AUDIT_STATUSES } from '@pharmacy/shared';

@Entity('stock_audit_sessions')
export class StockAuditSession extends BaseAppEntity {
  @Column({ name: 'session_code', type: 'varchar', length: 32, unique: true })
  sessionCode!: string;

  @Column({
    type: 'enum',
    enum: AUDIT_STATUSES,
    default: 'IN_PROGRESS',
  })
  status!: AuditStatus;

  @Column({
    name: 'total_variance_cost_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  totalVarianceCostLkr!: number;

  @Column({ name: 'approved_by', type: 'varchar', length: 64, nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string | null;

  @OneToMany(() => StockAuditItem, (item) => item.session)
  items!: StockAuditItem[];
}
