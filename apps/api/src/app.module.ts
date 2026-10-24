import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { HealthModule } from './common/health/health.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { PosModule } from './modules/pos/pos.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    HealthModule,
    InventoryModule,
    CustomersModule,
    DoctorsModule,
    PrescriptionsModule,
    PosModule,
    ProcurementModule,
    FinanceModule,
    PayrollModule,
    ReportsModule,
    AiAssistantModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
