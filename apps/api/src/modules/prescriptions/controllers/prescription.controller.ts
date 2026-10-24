import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { PrescriptionService } from '../services/prescription.service';
import { PrescriptionGateService } from '../services/prescription-gate.service';
import { ControlledSubstanceService } from '../services/controlled-substance.service';
import { MinioStorageService } from '../services/minio-storage.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  CreatePrescriptionSchema,
  CreatePrescriptionInput,
  VerifyPrescriptionSchema,
  VerifyPrescriptionInput,
  ValidateClinicalCartSchema,
  ValidateClinicalCartInput,
  ControlledSubstanceQuerySchema,
  ControlledSubstanceQueryInput,
  PrescriptionStatus,
} from '@pharmacy/shared';

@Controller('prescriptions')
export class PrescriptionController {
  constructor(
    private readonly prescriptionService: PrescriptionService,
    private readonly gateService: PrescriptionGateService,
    private readonly controlledService: ControlledSubstanceService,
    private readonly minioService: MinioStorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPrescriptionImage(
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const key = await this.minioService.uploadPrescriptionImage(
      file.buffer,
      file.originalname || 'rx.jpg',
      file.mimetype || 'image/jpeg',
    );

    const url = await this.minioService.getPresignedViewUrl(key);

    return {
      key,
      url,
      filename: file.originalname,
      size: file.size,
    };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePrescriptionSchema))
  async create(
    @Body() input: CreatePrescriptionInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user-001';
    return this.prescriptionService.create(input, userId);
  }

  @Get('pending')
  async getPending() {
    return this.prescriptionService.getPending();
  }

  @Post(':id/verify')
  @UsePipes(new ZodValidationPipe(VerifyPrescriptionSchema))
  async verify(
    @Param('id') id: string,
    @Body() input: VerifyPrescriptionInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'pharmacist-001';
    const userRole = (user?.role || (req?.headers['x-user-role'] as string) || 'PHARMACIST').toUpperCase();

    if (userRole === 'CASHIER') {
      throw new ForbiddenException('Role "CASHIER" is not authorized to verify prescriptions. Pharmacist sign-off required.');
    }

    return this.prescriptionService.verify(id, input, userId, userRole);
  }

  @Post('validate-cart')
  @UsePipes(new ZodValidationPipe(ValidateClinicalCartSchema))
  async validateCart(@Body() payload: ValidateClinicalCartInput) {
    return this.gateService.validateCart(payload);
  }

  @Get('controlled-register')
  @UsePipes(new ZodValidationPipe(ControlledSubstanceQuerySchema))
  async listControlledSubstances(@Query() query: ControlledSubstanceQueryInput) {
    return this.controlledService.listEntries(query);
  }

  @Post('controlled-register')
  async recordControlledDispense(
    @Body()
    body: {
      medicineId: string;
      batchId: string;
      quantityBaseUnits: number;
      customerId: string;
      customerNic: string;
      doctorId: string;
      doctorSlmcRegNo: string;
      prescriptionId: string;
    },
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const pharmacistUserId =
      user?.id || (req?.headers['x-user-id'] as string) || 'pharmacist-001';

    return this.controlledService.recordDispense({
      ...body,
      pharmacistUserId,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.prescriptionService.findById(id);
  }

  @Get()
  async findAll(
    @Query('customerId') customerId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: PrescriptionStatus,
  ) {
    return this.prescriptionService.findAll({ customerId, doctorId, status });
  }
}
