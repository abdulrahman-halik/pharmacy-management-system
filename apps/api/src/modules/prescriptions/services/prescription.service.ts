import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Prescription } from '../entities/prescription.entity';
import { PrescriptionItem } from '../entities/prescription-item.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { MinioStorageService } from './minio-storage.service';
import {
  CreatePrescriptionInput,
  VerifyPrescriptionInput,
  PrescriptionStatus,
  PrescriptionItemStatus,
} from '@pharmacy/shared';

@Injectable()
export class PrescriptionService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionItem)
    private readonly prescriptionItemRepo: Repository<PrescriptionItem>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    private readonly minioService: MinioStorageService,
    private readonly dataSource: DataSource,
  ) {}

  async create(input: CreatePrescriptionInput, createdBy?: string): Promise<Prescription> {
    const customer = await this.customerRepo.findOne({ where: { id: input.customerId } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${input.customerId}" not found`);
    }

    const doctor = await this.doctorRepo.findOne({ where: { id: input.doctorId } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID "${input.doctorId}" not found`);
    }

    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const rxNumber = `RX-${datePart}-${randSuffix}`;

    return this.dataSource.transaction(async (manager) => {
      const rx = manager.create(Prescription, {
        rxNumber,
        customerId: input.customerId,
        doctorId: input.doctorId,
        issuedDate: input.issuedDate,
        validUntil: input.validUntil,
        status: PrescriptionStatus.PENDING,
        imageUrls: input.imageUrls,
        createdBy,
      });

      const savedRx = await manager.save(Prescription, rx);

      const items = input.items.map((item) =>
        manager.create(PrescriptionItem, {
          prescriptionId: savedRx.id,
          medicineId: item.medicineId,
          dosage: item.dosage,
          durationDays: item.durationDays,
          prescribedQuantityBaseUnits: item.prescribedQuantityBaseUnits,
          refillAllowed: item.refillAllowed,
          refillsAllowedCount: item.refillsAllowedCount,
          refillIntervalDays: item.refillIntervalDays,
          itemStatus: PrescriptionItemStatus.PENDING,
          createdBy,
        }),
      );

      await manager.save(PrescriptionItem, items);
      savedRx.items = items;
      return savedRx;
    });
  }

  async verify(
    prescriptionId: string,
    input: VerifyPrescriptionInput,
    verifierUserId: string,
    userRole: string,
  ): Promise<Prescription> {
    const allowedRoles = ['PHARMACIST', 'STORE_MANAGER', 'ADMIN'];
    if (!allowedRoles.includes(userRole?.toUpperCase())) {
      throw new ForbiddenException(
        `Role "${userRole}" is not authorized to verify prescriptions. Restricted to Pharmacists and Managers.`,
      );
    }

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
      relations: ['items', 'customer', 'doctor'],
    });

    if (!rx) {
      throw new NotFoundException(`Prescription with ID "${prescriptionId}" not found`);
    }

    if (rx.status !== PrescriptionStatus.PENDING) {
      throw new BadRequestException(`Prescription is already in "${rx.status}" state`);
    }

    return this.dataSource.transaction(async (manager) => {
      let anyApproved = false;

      for (const decision of input.itemDecisions) {
        const item = rx.items?.find((i) => i.id === decision.itemId);
        if (item) {
          item.itemStatus = decision.status as PrescriptionItemStatus;
          if (decision.status === 'APPROVED') {
            anyApproved = true;
          }
          await manager.save(PrescriptionItem, item);
        }
      }

      if (input.rejectionReason || !anyApproved) {
        rx.status = PrescriptionStatus.REJECTED;
        rx.rejectionReason = input.rejectionReason || 'REJECTED_BY_PHARMACIST';
      } else {
        rx.status = PrescriptionStatus.VERIFIED;
      }

      rx.verifiedBy = verifierUserId;
      rx.verifiedAt = new Date();

      return manager.save(Prescription, rx);
    });
  }

  async getPending(): Promise<Prescription[]> {
    const prescriptions = await this.prescriptionRepo.find({
      where: { status: PrescriptionStatus.PENDING },
      relations: ['items', 'items.medicine', 'customer', 'doctor'],
      order: { createdAt: 'ASC' },
    });

    return this.resolveSignedUrls(prescriptions);
  }

  async findById(id: string): Promise<Prescription> {
    const rx = await this.prescriptionRepo.findOne({
      where: { id },
      relations: ['items', 'items.medicine', 'customer', 'doctor'],
    });

    if (!rx) {
      throw new NotFoundException(`Prescription with ID "${id}" not found`);
    }

    const [resolved] = await this.resolveSignedUrls([rx]);
    return resolved;
  }

  async findAll(query?: { customerId?: string; doctorId?: string; status?: PrescriptionStatus }): Promise<Prescription[]> {
    const qb = this.prescriptionRepo
      .createQueryBuilder('rx')
      .leftJoinAndSelect('rx.customer', 'customer')
      .leftJoinAndSelect('rx.doctor', 'doctor')
      .leftJoinAndSelect('rx.items', 'items')
      .leftJoinAndSelect('items.medicine', 'medicine')
      .orderBy('rx.createdAt', 'DESC');

    if (query?.customerId) {
      qb.andWhere('rx.customer_id = :customerId', { customerId: query.customerId });
    }
    if (query?.doctorId) {
      qb.andWhere('rx.doctor_id = :doctorId', { doctorId: query.doctorId });
    }
    if (query?.status) {
      qb.andWhere('rx.status = :status', { status: query.status });
    }

    const list = await qb.getMany();
    return this.resolveSignedUrls(list);
  }

  private async resolveSignedUrls(prescriptions: Prescription[]): Promise<Prescription[]> {
    for (const rx of prescriptions) {
      if (rx.imageUrls && rx.imageUrls.length > 0) {
        rx.imageUrls = await Promise.all(
          rx.imageUrls.map((key) => this.minioService.getPresignedViewUrl(key)),
        );
      }
    }
    return prescriptions;
  }
}
