import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
  Req,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { PosCheckoutService } from '../services/pos-checkout.service';
import { ReceiptGeneratorService } from '../services/receipt-generator.service';
import { FefoAllocationService } from '../../inventory/services/fefo-allocation.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  CheckoutSchema,
  CheckoutInput,
  SaleQuerySchema,
  SaleQueryInput,
  FefoPreviewQuerySchema,
  FefoPreviewQueryInput,
} from '@pharmacy/shared';

@Controller('pos')
export class PosController {
  constructor(
    private readonly checkoutService: PosCheckoutService,
    private readonly receiptService: ReceiptGeneratorService,
    private readonly fefoService: FefoAllocationService,
  ) {}

  /**
   * Atomic POS checkout transaction endpoint with idempotency support.
   */
  @Post('checkout')
  @UsePipes(new ZodValidationPipe(CheckoutSchema))
  async checkout(
    @Body() input: CheckoutInput,
    @Headers('idempotency-key') idempotencyHeader?: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const cashierId = user?.id || (req?.headers['x-user-id'] as string) || 'cashier-01';

    // Header idempotency key takes priority if body field omitted
    if (!input.idempotencyKey && idempotencyHeader) {
      input.idempotencyKey = idempotencyHeader;
    }

    return this.checkoutService.checkout(input, cashierId);
  }

  /**
   * Real-time read-only FEFO preview for cart line items.
   */
  @Get('medicines/:medicineId/fefo-preview')
  @UsePipes(new ZodValidationPipe(FefoPreviewQuerySchema))
  async previewFefo(
    @Param('medicineId') medicineId: string,
    @Query() query: FefoPreviewQueryInput,
  ) {
    return this.fefoService.previewFefo(medicineId, query.requestedUnits);
  }

  /**
   * List historical sales with filtering.
   */
  @Get('sales')
  @UsePipes(new ZodValidationPipe(SaleQuerySchema))
  async findAll(@Query() query: SaleQueryInput) {
    return this.checkoutService.findAll(query);
  }

  /**
   * Get single sale by ID or invoice number.
   */
  @Get('sales/:id')
  async findById(@Param('id') id: string) {
    return this.checkoutService.findById(id);
  }

  /**
   * Get formatted 80mm ESC/POS receipt data and raw printer text for a sale.
   */
  @Get('sales/:id/receipt')
  async getReceipt(@Param('id') id: string) {
    const sale = await this.checkoutService.findById(id);
    return this.receiptService.generateReceipt(sale);
  }
}
