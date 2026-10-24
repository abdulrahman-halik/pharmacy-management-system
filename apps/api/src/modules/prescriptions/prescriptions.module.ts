import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { ControlledSubstanceRegister } from './entities/controlled-substance-register.entity';
import { Medicine } from '../medicines/entities/medicine.entity';
import { InventoryBatch } from '../inventory/entities/inventory-batch.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { PrescriptionService } from './services/prescription.service';
import { PrescriptionGateService } from './services/prescription-gate.service';
import { ControlledSubstanceService } from './services/controlled-substance.service';
import { MinioStorageService } from './services/minio-storage.service';
import { PrescriptionController } from './controllers/prescription.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prescription,
      PrescriptionItem,
      ControlledSubstanceRegister,
      Medicine,
      InventoryBatch,
      Customer,
      Doctor,
    ]),
  ],
  controllers: [PrescriptionController],
  providers: [
    PrescriptionService,
    PrescriptionGateService,
    ControlledSubstanceService,
    MinioStorageService,
  ],
  exports: [
    PrescriptionService,
    PrescriptionGateService,
    ControlledSubstanceService,
    MinioStorageService,
  ],
})
export class PrescriptionsModule {}
