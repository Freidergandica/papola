import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';

@Module({
  controllers: [NotificationsController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class NotificationsModule {}
