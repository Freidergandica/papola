import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { StoresModule } from './stores/stores.module';
import { ProductsModule } from './products/products.module';
import { DealsModule } from './deals/deals.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { R4WebhooksModule } from './r4-webhooks/r4-webhooks.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SupabaseModule,
    CommonModule,
    HealthModule,
    StoresModule,
    ProductsModule,
    DealsModule,
    OrdersModule,
    PaymentsModule,
    R4WebhooksModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
