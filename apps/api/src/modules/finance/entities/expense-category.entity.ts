import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('expense_categories')
export class ExpenseCategory extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
