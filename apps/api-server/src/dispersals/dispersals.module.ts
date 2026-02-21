import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DispersalsController } from './dispersals.controller';
import { DispersalsService } from './dispersals.service';

@Module({
  imports: [ConfigModule],
  controllers: [DispersalsController],
  providers: [DispersalsService],
  exports: [DispersalsService],
})
export class DispersalsModule {}
