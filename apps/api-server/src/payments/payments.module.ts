import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { R4WebhooksModule } from '../r4-webhooks/r4-webhooks.module';

@Module({
  imports: [ConfigModule, R4WebhooksModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
