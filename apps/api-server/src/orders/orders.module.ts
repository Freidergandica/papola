import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DealsModule } from '../deals/deals.module';
import { R4WebhooksModule } from '../r4-webhooks/r4-webhooks.module';

@Module({
  imports: [DealsModule, R4WebhooksModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
