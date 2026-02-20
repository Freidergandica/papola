import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async registerToken(userId: string, token: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, device_type: 'mobile' },
        { onConflict: 'user_id,token' },
      );

    if (error) {
      this.logger.error(
        `Failed to register push token for user ${userId}: ${error.message}`,
      );
      throw error;
    }
    this.logger.log(`Push token registered for user ${userId}`);
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.supabase
      .getClient()
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const { data: tokens } = await this.supabase
      .getClient()
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (!tokens?.length) {
      this.logger.warn(`No push tokens found for user ${userId}`);
      return;
    }

    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      sound: 'default',
      data,
    }));

    await this.sendPushNotifications(messages);
  }

  async sendToStoreOwner(
    storeId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const { data: store } = await this.supabase
      .getClient()
      .from('stores')
      .select('owner_id')
      .eq('id', storeId)
      .single();

    if (!store?.owner_id) {
      this.logger.warn(`No owner found for store ${storeId}`);
      return;
    }

    await this.sendToUser(store.owner_id, title, body, data);
  }

  private async sendPushNotifications(messages: PushMessage[]): Promise<void> {
    // Expo API limit: 100 messages per request
    const chunks: PushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();

        if (!response.ok) {
          this.logger.error(`Expo push API error: ${JSON.stringify(result)}`);
          continue;
        }

        // Clean up invalid tokens
        if (result.data) {
          for (let i = 0; i < result.data.length; i++) {
            const receipt = result.data[i];
            if (
              receipt.status === 'error' &&
              receipt.details?.error === 'DeviceNotRegistered'
            ) {
              await this.supabase
                .getClient()
                .from('push_tokens')
                .delete()
                .eq('token', chunk[i].to);
              this.logger.log(`Removed invalid push token: ${chunk[i].to}`);
            }
          }
        }

        this.logger.log(`Sent ${chunk.length} push notifications`);
      } catch (error: any) {
        this.logger.error(
          `Failed to send push notifications: ${error?.message ?? error}`,
        );
      }
    }
  }
}
