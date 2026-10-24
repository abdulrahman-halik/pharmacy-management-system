import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { CashLedgerService } from './cash-ledger.service';
import {
  CreateBankAccountInput,
  BankTransferInput,
  maskBankAccountNumber,
} from '@pharmacy/shared';
import { PaymentMethod } from '../entities/payment-method.entity';

@Injectable()
export class BankAccountService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankRepo: Repository<BankAccount>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    private readonly cashLedgerService: CashLedgerService,
    private readonly dataSource: DataSource,
  ) {}

  async getAll(storeId = 1) {
    const accounts = await this.bankRepo.find({
      where: { storeId },
      order: { createdAt: 'ASC' },
    });

    return accounts.map((acc) => ({
      ...acc,
      openingBalanceLkr: Number(acc.openingBalanceLkr),
      currentBalanceLkr: Number(acc.currentBalanceLkr),
      maskedAccountNumber: maskBankAccountNumber(acc.accountNumber),
    }));
  }

  async getById(id: string, storeId = 1) {
    const acc = await this.bankRepo.findOne({
      where: { id, storeId },
    });
    if (!acc) throw new NotFoundException(`Bank account ${id} not found`);

    return {
      ...acc,
      openingBalanceLkr: Number(acc.openingBalanceLkr),
      currentBalanceLkr: Number(acc.currentBalanceLkr),
      maskedAccountNumber: maskBankAccountNumber(acc.accountNumber),
    };
  }

  async create(input: CreateBankAccountInput, userId: string, storeId = 1) {
    const existing = await this.bankRepo.findOne({
      where: { accountNumber: input.accountNumber },
    });
    if (existing) {
      throw new BadRequestException(
        `Bank account with number ${input.accountNumber} already exists`,
      );
    }

    const bank = this.bankRepo.create({
      storeId,
      bankName: input.bankName,
      branchName: input.branchName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      openingBalanceLkr: input.openingBalanceLkr,
      currentBalanceLkr: input.openingBalanceLkr,
      isActive: true,
      createdBy: userId,
    });

    const saved = await this.bankRepo.save(bank);

    // If opening balance > 0, record initial opening entry in Cash Ledger
    if (input.openingBalanceLkr > 0) {
      const pmTransfer = await this.paymentMethodRepo.findOne({
        where: { code: 'BANK_TRANSFER' },
      });
      await this.cashLedgerService.recordEntry({
        storeId,
        direction: 'IN',
        amountLkr: input.openingBalanceLkr,
        paymentMethodId: pmTransfer?.id || 'pm-transfer',
        bankAccountId: saved.id,
        sourceType: 'OPENING',
        sourceId: saved.id,
        description: `Initial Opening Balance for ${saved.bankName} (${maskBankAccountNumber(saved.accountNumber)})`,
        userId,
      });
    }

    return {
      ...saved,
      maskedAccountNumber: maskBankAccountNumber(saved.accountNumber),
    };
  }

  async recordTransfer(input: BankTransferInput, userId: string, storeId = 1) {
    return this.dataSource.transaction(async (manager) => {
      const sourceBank = await manager.findOne(BankAccount, {
        where: { id: input.fromBankAccountId, storeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!sourceBank) {
        throw new NotFoundException('Source bank account not found');
      }

      const destBank = await manager.findOne(BankAccount, {
        where: { id: input.toBankAccountId, storeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!destBank) {
        throw new NotFoundException('Destination bank account not found');
      }

      const totalDeduction = Number(input.amountLkr) + Number(input.feeLkr || 0);
      if (Number(sourceBank.currentBalanceLkr) < totalDeduction) {
        throw new BadRequestException(
          `Insufficient funds in ${sourceBank.bankName}. Available: Rs. ${sourceBank.currentBalanceLkr}, required: Rs. ${totalDeduction}`,
        );
      }

      // Deduct from source
      sourceBank.currentBalanceLkr = Number(
        (Number(sourceBank.currentBalanceLkr) - totalDeduction).toFixed(2),
      );
      await manager.save(sourceBank);

      // Add to destination
      destBank.currentBalanceLkr = Number(
        (Number(destBank.currentBalanceLkr) + Number(input.amountLkr)).toFixed(
          2,
        ),
      );
      await manager.save(destBank);

      const pmTransfer =
        (await manager.findOne(PaymentMethod, {
          where: { code: 'BANK_TRANSFER' },
        })) || { id: 'pm-transfer' };

      // Record OUT on source
      await this.cashLedgerService.recordEntry(
        {
          storeId,
          direction: 'OUT',
          amountLkr: Number(input.amountLkr),
          paymentMethodId: pmTransfer.id,
          bankAccountId: sourceBank.id,
          sourceType: 'TRANSFER',
          description: `Internal Transfer to ${destBank.bankName}: ${input.description}`,
          userId,
        },
        manager,
      );

      // Record IN on destination
      await this.cashLedgerService.recordEntry(
        {
          storeId,
          direction: 'IN',
          amountLkr: Number(input.amountLkr),
          paymentMethodId: pmTransfer.id,
          bankAccountId: destBank.id,
          sourceType: 'TRANSFER',
          description: `Internal Transfer from ${sourceBank.bankName}: ${input.description}`,
          userId,
        },
        manager,
      );

      // Record bank fee if any
      if (input.feeLkr > 0) {
        await this.cashLedgerService.recordEntry(
          {
            storeId,
            direction: 'OUT',
            amountLkr: Number(input.feeLkr),
            paymentMethodId: pmTransfer.id,
            bankAccountId: sourceBank.id,
            sourceType: 'EXPENSE',
            description: `Bank Transfer Handling Fee (${sourceBank.bankName})`,
            userId,
          },
          manager,
        );
      }

      return {
        success: true,
        sourceBank: {
          id: sourceBank.id,
          currentBalanceLkr: sourceBank.currentBalanceLkr,
        },
        destBank: {
          id: destBank.id,
          currentBalanceLkr: destBank.currentBalanceLkr,
        },
      };
    });
  }
}
