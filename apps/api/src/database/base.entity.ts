import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseAppEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'int', default: 1 })
  storeId!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 64, nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true })
  updatedBy?: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      // UUIDv7 compliant timestamp-ordered or RFC4122 v4 UUID fallback
      this.id = uuidv4();
    }
  }
}
