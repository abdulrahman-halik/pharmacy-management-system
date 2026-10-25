import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UsePipes,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupplierService } from '../services/supplier.service';
import { SupplierPaymentService } from '../services/supplier-payment.service';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { GrnIntakeService } from '../services/grn-intake.service';
import { PurchaseReturnService } from '../services/purchase-return.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  CreateSupplierSchema,
  CreateSupplierInput,
  UpdateSupplierSchema,
  UpdateSupplierInput,
  CreatePurchaseOrderSchema,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderStatusSchema,
  UpdatePurchaseOrderStatusInput,
  CreateGrnSchema,
  CreateGrnInput,
  RecordSupplierPaymentSchema,
  RecordSupplierPaymentInput,
  CreatePurchaseReturnSchema,
  CreatePurchaseReturnInput,
  PurchaseOrderStatus,
} from '@pharmacy/shared';

@Controller('procurement')
export class ProcurementController {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly paymentService: SupplierPaymentService,
    private readonly poService: PurchaseOrderService,
    private readonly grnService: GrnIntakeService,
    private readonly returnService: PurchaseReturnService,
  ) {}

  // --------------------------------------------------------------------------
  // Suppliers & Payables
  // --------------------------------------------------------------------------

  @Get('suppliers')
  async getSuppliers(
    @Query('search') search?: string,
    @Query('isActive') isActiveStr?: string,
  ) {
    const isActive = isActiveStr !== undefined ? isActiveStr === 'true' : undefined;
    return this.supplierService.getSuppliers(search, isActive);
  }

  @Post('suppliers')
  @UsePipes(new ZodValidationPipe(CreateSupplierSchema))
  async createSupplier(
    @Body() input: CreateSupplierInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user';
    return this.supplierService.createSupplier(input, userId);
  }

  @Get('suppliers/:id')
  async getSupplierById(@Param('id') id: string) {
    return this.supplierService.getSupplierById(id);
  }

  @Put('suppliers/:id')
  @UsePipes(new ZodValidationPipe(UpdateSupplierSchema))
  async updateSupplier(
    @Param('id') id: string,
    @Body() input: UpdateSupplierInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user';
    return this.supplierService.updateSupplier(id, input, userId);
  }

  @Get('suppliers/:id/statement')
  async getSupplierStatement(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.supplierService.getStatement(id, startDate, endDate);
  }

  @Post('suppliers/:id/pay')
  @UsePipes(new ZodValidationPipe(RecordSupplierPaymentSchema))
  async paySupplier(
    @Param('id') id: string,
    @Body() input: RecordSupplierPaymentInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user';
    return this.paymentService.recordPayment(id, input, userId);
  }

  // --------------------------------------------------------------------------
  // Purchase Orders
  // --------------------------------------------------------------------------

  @Get('orders')
  async getOrders(
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: PurchaseOrderStatus,
    @Query('search') search?: string,
  ) {
    return this.poService.getPurchaseOrders({ supplierId, status, search });
  }

  @Post('orders')
  @UsePipes(new ZodValidationPipe(CreatePurchaseOrderSchema))
  async createOrder(
    @Body() input: CreatePurchaseOrderInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user';
    return this.poService.createPurchaseOrder(input, userId);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string) {
    return this.poService.getPurchaseOrderById(id);
  }

  @Post('orders/from-low-stock')
  async createOrderFromLowStock(
    @Body('supplierId') supplierId: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user';
    return this.poService.generateFromLowStock(supplierId, userId);
  }

  @Patch('orders/:id/status')
  @UsePipes(new ZodValidationPipe(UpdatePurchaseOrderStatusSchema))
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() input: UpdatePurchaseOrderStatusInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user';
    return this.poService.updateStatus(id, input.status, userId);
  }

  // --------------------------------------------------------------------------
  // Goods Received Notes (GRN)
  // --------------------------------------------------------------------------

  @Post('grn')
  @UsePipes(new ZodValidationPipe(CreateGrnSchema))
  async processGrn(
    @Body() input: CreateGrnInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user';
    return this.grnService.processGrn(input, userId);
  }

  @Get('grn')
  async getGrns(
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.grnService.getGrns({ supplierId, search, startDate, endDate });
  }

  @Get('grn/:id')
  async getGrnById(@Param('id') id: string) {
    return this.grnService.getGrnById(id);
  }

  // --------------------------------------------------------------------------
  // Purchase Returns
  // --------------------------------------------------------------------------

  @Post('returns')
  @UsePipes(new ZodValidationPipe(CreatePurchaseReturnSchema))
  async processReturn(
    @Body() input: CreatePurchaseReturnInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user';
    return this.returnService.processReturn(input, userId);
  }

  @Get('returns')
  async getReturns(@Query('supplierId') supplierId?: string) {
    return this.returnService.getReturns(supplierId);
  }
}
