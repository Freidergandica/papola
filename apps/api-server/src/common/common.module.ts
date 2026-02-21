import { Global, Module } from '@nestjs/common';
import { SSEService } from './sse.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Global()
@Module({
  providers: [SSEService, SupabaseAuthGuard],
  exports: [SSEService, SupabaseAuthGuard],
})
export class CommonModule {}
