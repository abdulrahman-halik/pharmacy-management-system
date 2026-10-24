import { Module } from '@nestjs/common';
import { AiAssistantService } from './services/ai-assistant.service';
import { EncryptionService } from './services/encryption.service';
import { AiAssistantController } from './controllers/ai-assistant.controller';

@Module({
  controllers: [AiAssistantController],
  providers: [AiAssistantService, EncryptionService],
  exports: [AiAssistantService, EncryptionService],
})
export class AiAssistantModule {}
