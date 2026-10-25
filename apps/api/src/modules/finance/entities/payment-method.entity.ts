import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('payment_methods')
export class PaymentMethod extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'requires_reference', type: 'boolean', default: false })
  requiresReference!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
