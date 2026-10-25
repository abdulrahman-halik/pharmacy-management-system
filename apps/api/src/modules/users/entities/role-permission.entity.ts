import { Entity, Column, Index, Unique } from 'typeorm';
import type { SpecialActionName } from '@pharmacy/shared';
import { BaseAppEntity } from '../../../database/base.entity';
import { UserRole } from './user.entity';

@Entity('role_permissions')
@Unique(['role', 'moduleName'])
export class RolePermission extends BaseAppEntity {
  @Index()
  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ name: 'module_name', type: 'varchar', length: 50 })
  moduleName!: string;

  @Column({ name: 'can_view', type: 'boolean', default: false })
  canView!: boolean;

  @Column({ name: 'can_add', type: 'boolean', default: false })
  canAdd!: boolean;

  @Column({ name: 'can_edit', type: 'boolean', default: false })
  canEdit!: boolean;

  @Column({ name: 'can_delete', type: 'boolean', default: false })
  canDelete!: boolean;

  @Column({ name: 'special_actions', type: 'json', nullable: true })
  specialActions?: SpecialActionName[] | null;
}
