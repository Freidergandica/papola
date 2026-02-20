import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R4WebhooksController } from './r4-webhooks.controller';
import { R4WebhooksService } from './r4-webhooks.service';
import { R4WebhooksGuard } from './r4-webhooks.guard';
import { OrderExpirationService } from './order-expiration.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, NotificationsModule],
  controllers: [R4WebhooksController],
  providers: [R4WebhooksService, R4WebhooksGuard, OrderExpirationService],
  exports: [OrderExpirationService],
})
export class R4WebhooksModule {}
