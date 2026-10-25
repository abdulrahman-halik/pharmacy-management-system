import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('categories')
@Index('uq_categories_store_name', ['storeId', 'name'], { unique: true })
export class Category extends BaseAppEntity {
  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;
}
