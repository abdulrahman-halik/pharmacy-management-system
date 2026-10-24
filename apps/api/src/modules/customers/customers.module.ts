import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerCreditLedger } from './entities/customer-credit-ledger.entity';
import { CustomerLoyaltyLedger } from './entities/customer-loyalty-ledger.entity';
import { CustomerService } from './services/customer.service';
import { CustomerController } from './controllers/customer.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerCreditLedger,
      CustomerLoyaltyLedger,
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService, TypeOrmModule],
})
export class CustomersModule {}
