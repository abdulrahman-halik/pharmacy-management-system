import { Module } from '@nestjs/common';
import { ReportsService } from './services/reports.service';
import { ReportExportService } from './services/report-export.service';
import { ReportsController } from './controllers/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportExportService],
  exports: [ReportsService, ReportExportService],
})
export class ReportsModule {}
