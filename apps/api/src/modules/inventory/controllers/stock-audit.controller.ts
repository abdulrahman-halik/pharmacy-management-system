import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
} from '@nestjs/common';
import { StockAuditService } from '../services/stock-audit.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  StartAuditSessionSchema,
  StartAuditSessionInput,
  RecordAuditCountSchema,
  RecordAuditCountInput,
  ApproveAuditSessionSchema,
  ApproveAuditSessionInput,
} from '@pharmacy/shared';

@Controller('inventory/audits')
export class StockAuditController {
  constructor(private readonly auditService: StockAuditService) {}

  @Post('start')
  @UsePipes(new ZodValidationPipe(StartAuditSessionSchema))
  async startSession(
    @Body() input: StartAuditSessionInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const userId = user?.id || 'auditor-user-001';
    return this.auditService.startSession(input, userId);
  }

  @Get()
  async listSessions() {
    return this.auditService.listSessions();
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.auditService.getSession(id);
  }

  @Post(':id/record-count')
  @UsePipes(new ZodValidationPipe(RecordAuditCountSchema))
  async recordCount(
    @Param('id') id: string,
    @Body() input: RecordAuditCountInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const userId = user?.id || 'auditor-user-001';
    return this.auditService.recordCount(id, input, userId);
  }

  @Post(':id/approve')
  @UsePipes(new ZodValidationPipe(ApproveAuditSessionSchema))
  async approveSession(
    @Param('id') id: string,
    @Body() input: ApproveAuditSessionInput,
  ) {
    return this.auditService.approveSession(id, input);
  }
}
