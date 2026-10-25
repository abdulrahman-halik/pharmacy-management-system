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
import { DoctorService } from '../services/doctor.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  CreateDoctorSchema,
  CreateDoctorInput,
  UpdateDoctorSchema,
  UpdateDoctorInput,
  DoctorQuerySchema,
  DoctorQueryInput,
} from '@pharmacy/shared';

@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateDoctorSchema))
  async create(
    @Body() input: CreateDoctorInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user-001';
    return this.doctorService.create(input, userId);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(DoctorQuerySchema))
  async findAll(@Query() query: DoctorQueryInput) {
    return this.doctorService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.doctorService.findById(id);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(UpdateDoctorSchema))
  async update(
    @Param('id') id: string,
    @Body() input: UpdateDoctorInput,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const userId = user?.id || (req?.headers['x-user-id'] as string) || 'system-user-001';
    return this.doctorService.update(id, input, userId);
  }
}
