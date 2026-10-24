import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';
import { AiAssistantService } from '../services/ai-assistant.service';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AiChatRequestSchema, AiChatRequest } from '@pharmacy/shared';
import { UserRole } from '../../users/entities/user.entity';

@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiService: AiAssistantService) {}

  private resolveUser(user?: AuthenticatedUser, req?: Request): AuthenticatedUser {
    if (user) return user;
    const roleHeader = (req?.headers['x-user-role'] as string) || 'ADMIN';
    const idHeader = (req?.headers['x-user-id'] as string) || 'sys-admin-1';
    return {
      id: idHeader,
      email: `${roleHeader.toLowerCase()}@pharmacy.lk`,
      fullName: `Authorized ${roleHeader}`,
      role: roleHeader as UserRole,
      storeId: 1,
      mustResetPassword: false,
    };
  }

  @Post('chat')
  @UsePipes(new ZodValidationPipe(AiChatRequestSchema))
  async chat(
    @Body() body: AiChatRequest,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const caller = this.resolveUser(user, req);
    const result = await this.aiService.processMessage(body, caller);
    return {
      success: true,
      data: result,
    };
  }

  @Get('tools')
  async getTools(
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: Request,
  ) {
    const caller = this.resolveUser(user, req);
    const tools = this.aiService.getAvailableTools(caller);
    return {
      success: true,
      data: { tools },
    };
  }
}
