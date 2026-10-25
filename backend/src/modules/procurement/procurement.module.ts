import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceivedNote } from './entities/goods-received-note.entity';
import { GoodsReceivedNoteItem } from './entities/goods-received-note-item.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnItem } from './entities/purchase-return-item.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { Medicine } from '../medicines/entities/medicine.entity';
import { InventoryBatch } from '../inventory/entities/inventory-batch.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { PaymentMethod } from '../finance/entities/payment-method.entity';
import { CashLedgerEntry } from '../finance/entities/cash-ledger-entry.entity';
import { SupplierService } from './services/supplier.service';
import { SupplierPaymentService } from './services/supplier-payment.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { GrnIntakeService } from './services/grn-intake.service';
import { PurchaseReturnService } from './services/purchase-return.service';
import { ProcurementSequenceService } from './services/sequence.service';
import { ProcurementController } from './controllers/procurement.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      PurchaseOrder,
      PurchaseOrderItem,
      GoodsReceivedNote,
      GoodsReceivedNoteItem,
      PurchaseReturn,
      PurchaseReturnItem,
      SupplierPayment,
      Medicine,
      InventoryBatch,
      StockMovement,
      PaymentMethod,
      CashLedgerEntry,
    ]),
  ],
  controllers: [ProcurementController],
  providers: [
    SupplierService,
    SupplierPaymentService,
    PurchaseOrderService,
    GrnIntakeService,
    PurchaseReturnService,
    ProcurementSequenceService,
  ],
  exports: [
    SupplierService,
    SupplierPaymentService,
    PurchaseOrderService,
    GrnIntakeService,
    PurchaseReturnService,
  ],
})
export class ProcurementModule {}
