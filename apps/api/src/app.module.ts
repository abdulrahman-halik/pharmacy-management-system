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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
