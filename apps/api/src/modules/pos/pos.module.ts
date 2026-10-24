import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SaleItemAllocation } from './entities/sale-item-allocation.entity';
import { Medicine } from '../medicines/entities/medicine.entity';
import { InventoryBatch } from '../inventory/entities/inventory-batch.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerCreditLedger } from '../customers/entities/customer-credit-ledger.entity';
import { CustomerLoyaltyLedger } from '../customers/entities/customer-loyalty-ledger.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { PrescriptionItem } from '../prescriptions/entities/prescription-item.entity';
import { ControlledSubstanceRegister } from '../prescriptions/entities/controlled-substance-register.entity';
import { PosController } from './controllers/pos.controller';
import { PosCheckoutService } from './services/pos-checkout.service';
import { SequenceService } from './services/sequence.service';
import { ReceiptGeneratorService } from './services/receipt-generator.service';
import { ReceiptQueueService } from './services/receipt-queue.service';
import { FefoAllocationService } from '../inventory/services/fefo-allocation.service';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';

import { DayClose } from '../finance/entities/day-close.entity';
import { CashLedgerEntry } from '../finance/entities/cash-ledger-entry.entity';
import { PaymentMethod } from '../finance/entities/payment-method.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      SaleItemAllocation,
      Medicine,
      InventoryBatch,
      StockMovement,
      Customer,
      CustomerCreditLedger,
      CustomerLoyaltyLedger,
      Prescription,
      PrescriptionItem,
      ControlledSubstanceRegister,
      DayClose,
      CashLedgerEntry,
      PaymentMethod,
    ]),
    InventoryModule,
    CustomersModule,
    PrescriptionsModule,
  ],
  controllers: [PosController],
  providers: [
    PosCheckoutService,
    SequenceService,
    ReceiptGeneratorService,
    ReceiptQueueService,
    FefoAllocationService,
  ],
  exports: [PosCheckoutService, ReceiptGeneratorService],
})
export class PosModule {}
