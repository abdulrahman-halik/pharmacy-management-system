import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { CreateDoctorInput, UpdateDoctorInput, DoctorQueryInput } from '@pharmacy/shared';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async create(input: CreateDoctorInput, createdBy?: string): Promise<Doctor> {
    const existing = await this.doctorRepo.findOne({
      where: { registrationNumber: input.registrationNumber },
    });
    if (existing) {
      throw new ConflictException(
        `Doctor with SLMC Registration Number "${input.registrationNumber}" already exists`,
      );
    }

    const doctor = this.doctorRepo.create({
      ...input,
      isActive: true,
      createdBy,
    });
    return this.doctorRepo.save(doctor);
  }

  async update(id: string, input: UpdateDoctorInput, updatedBy?: string): Promise<Doctor> {
    const doctor = await this.findById(id);

    if (input.registrationNumber && input.registrationNumber !== doctor.registrationNumber) {
      const existing = await this.doctorRepo.findOne({
        where: { registrationNumber: input.registrationNumber },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Doctor with SLMC Registration Number "${input.registrationNumber}" already exists`,
        );
      }
    }

    Object.assign(doctor, input);
    doctor.updatedBy = updatedBy;
    return this.doctorRepo.save(doctor);
  }

  async findById(id: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { id } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID "${id}" not found`);
    }
    return doctor;
  }

  async findAll(query: DoctorQueryInput) {
    const qb = this.doctorRepo.createQueryBuilder('d').orderBy('d.fullName', 'ASC');

    if (query.search) {
      qb.andWhere(
        '(d.full_name LIKE :search OR d.registration_number LIKE :search OR d.specialization LIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.registrationNumber) {
      qb.andWhere('d.registration_number = :regNo', { regNo: query.registrationNumber });
    }

    qb.take(query.limit || 50).skip(query.offset || 0);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
