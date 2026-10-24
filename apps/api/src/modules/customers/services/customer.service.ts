import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CustomerCreditLedger } from '../entities/customer-credit-ledger.entity';
import { CustomerLoyaltyLedger } from '../entities/customer-loyalty-ledger.entity';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
  RecordCustomerCreditTransactionInput,
  RecordCustomerLoyaltyTransactionInput,
} from '@pharmacy/shared';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerCreditLedger)
    private readonly creditLedgerRepo: Repository<CustomerCreditLedger>,
    @InjectRepository(CustomerLoyaltyLedger)
    private readonly loyaltyLedgerRepo: Repository<CustomerLoyaltyLedger>,
    private readonly dataSource: DataSource,
  ) {}

  async create(input: CreateCustomerInput, createdBy?: string): Promise<Customer> {
    const normalizedPhone = input.phone ? (input.phone.startsWith('0') ? '+94' + input.phone.slice(1).replace(/[\s\-]/g, '') : input.phone) : input.phone;
    const customer = this.customerRepo.create({
      ...input,
      phone: normalizedPhone,
      creditBalance: 0,
      loyaltyPoints: 0,
      isActive: true,
      createdBy,
    });
    return this.customerRepo.save(customer);
  }

  async update(id: string, input: UpdateCustomerInput, updatedBy?: string): Promise<Customer> {
    const customer = await this.findById(id);
    Object.assign(customer, input);
    customer.updatedBy = updatedBy;
    return this.customerRepo.save(customer);
  }

  async findById(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
    return customer;
  }

  async findAll(query: CustomerQueryInput) {
    const qb = this.customerRepo.createQueryBuilder('c').orderBy('c.fullName', 'ASC');

    if (query.search) {
      qb.andWhere(
        '(c.full_name LIKE :search OR c.phone LIKE :search OR c.nic_or_passport LIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.phone) {
      qb.andWhere('c.phone LIKE :phone', { phone: `%${query.phone}%` });
    }
    if (query.nic) {
      qb.andWhere('c.nic_or_passport = :nic', { nic: query.nic });
    }

    qb.take(query.limit || 50).skip(query.offset || 0);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async recordCreditTransaction(
    customerId: string,
    input: RecordCustomerCreditTransactionInput,
    recordedBy: string,
  ): Promise<CustomerCreditLedger> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { id: customerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID "${customerId}" not found`);
      }

      let delta = input.amount;
      if (input.entryType === 'PAYMENT') {
        delta = -Math.abs(input.amount);
      }

      const newBalance = Number(customer.creditBalance || 0) + delta;

      if (newBalance < 0 && input.entryType === 'PAYMENT') {
        // Overpayment not permitted or adjust to zero
        throw new BadRequestException(
          `Payment amount exceeds outstanding credit balance (Current: Rs. ${customer.creditBalance})`,
        );
      }

      if (input.entryType === 'CREDIT_PURCHASE') {
        const creditLimit = Number(customer.creditLimit || 0);
        if (creditLimit > 0 && newBalance > creditLimit) {
          throw new BadRequestException(
            `Transaction exceeds customer credit limit of Rs. ${creditLimit} (New balance would be Rs. ${newBalance})`,
          );
        }
      }

      customer.creditBalance = newBalance;
      await manager.save(Customer, customer);

      const ledgerEntry = manager.create(CustomerCreditLedger, {
        customerId,
        entryType: input.entryType,
        amount: input.amount,
        runningBalance: newBalance,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        notes: input.notes,
        recordedBy,
      });

      return manager.save(CustomerCreditLedger, ledgerEntry);
    });
  }

  async getCreditLedger(customerId: string): Promise<CustomerCreditLedger[]> {
    await this.findById(customerId);
    return this.creditLedgerRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async recordLoyaltyTransaction(
    customerId: string,
    input: RecordCustomerLoyaltyTransactionInput,
    recordedBy: string,
  ): Promise<CustomerLoyaltyLedger> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { id: customerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID "${customerId}" not found`);
      }

      let delta = input.points;
      if (input.entryType === 'REDEEMED' || input.entryType === 'EXPIRED') {
        delta = -Math.abs(input.points);
      }

      const newPoints = (customer.loyaltyPoints || 0) + delta;
      if (newPoints < 0) {
        throw new BadRequestException(
          `Cannot redeem ${input.points} points. Customer only has ${customer.loyaltyPoints} points available.`,
        );
      }

      customer.loyaltyPoints = newPoints;
      await manager.save(Customer, customer);

      const ledgerEntry = manager.create(CustomerLoyaltyLedger, {
        customerId,
        entryType: input.entryType,
        points: input.points,
        runningPoints: newPoints,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        notes: input.notes,
        recordedBy,
      });

      return manager.save(CustomerLoyaltyLedger, ledgerEntry);
    });
  }

  async getLoyaltyLedger(customerId: string): Promise<CustomerLoyaltyLedger[]> {
    await this.findById(customerId);
    return this.loyaltyLedgerRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }
}
