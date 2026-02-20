import { Controller, Post, Delete, Body } from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('push-token')
  registerToken(@Body() body: { user_id: string; token: string }) {
    return this.pushNotificationService.registerToken(
      body.user_id,
      body.token,
    );
  }

  @Delete('push-token')
  unregisterToken(@Body() body: { user_id: string; token: string }) {
    return this.pushNotificationService.unregisterToken(
      body.user_id,
      body.token,
    );
  }
}
