import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UsePipes,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CustomerService } from '../services/customer.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  CreateCustomerSchema,
  CreateCustomerInput,
  UpdateCustomerSchema,
  UpdateCustomerInput,
  CustomerQuerySchema,
  CustomerQueryInput,
  RecordCustomerCreditTransactionSchema,
  RecordCustomerCreditTransactionInput,
  RecordCustomerLoyaltyTransactionSchema,
  RecordCustomerLoyaltyTransactionInput,
} from '@pharmacy/shared';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateCustomerSchema))
  async create(
    @Body() input: CreateCustomerInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user-001';
    return this.customerService.create(input, userId);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(CustomerQuerySchema))
  async findAll(@Query() query: CustomerQueryInput) {
    return this.customerService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.customerService.findById(id);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(UpdateCustomerSchema))
  async update(
    @Param('id') id: string,
    @Body() input: UpdateCustomerInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user-001';
    return this.customerService.update(id, input, userId);
  }

  @Get(':id/credit-ledger')
  async getCreditLedger(@Param('id') id: string) {
    return this.customerService.getCreditLedger(id);
  }

  @Post(':id/credit-ledger')
  @UsePipes(new ZodValidationPipe(RecordCustomerCreditTransactionSchema))
  async recordCreditTransaction(
    @Param('id') id: string,
    @Body() input: RecordCustomerCreditTransactionInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user-001';
    return this.customerService.recordCreditTransaction(id, input, userId);
  }

  @Get(':id/loyalty')
  async getLoyaltyLedger(@Param('id') id: string) {
    return this.customerService.getLoyaltyLedger(id);
  }

  @Post(':id/loyalty')
  @UsePipes(new ZodValidationPipe(RecordCustomerLoyaltyTransactionSchema))
  async recordLoyaltyTransaction(
    @Param('id') id: string,
    @Body() input: RecordCustomerLoyaltyTransactionInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user-001';
    return this.customerService.recordLoyaltyTransaction(id, input, userId);
  }
}
