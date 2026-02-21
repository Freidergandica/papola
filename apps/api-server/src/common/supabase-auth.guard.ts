import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private supabase: SupabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const { data: { user }, error } = await this.supabase
        .getClient()
        .auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      // Check roles if specified
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredRoles && requiredRoles.length > 0) {
        // Roles are stored in the profiles table, not in user_metadata
        const { data: profile } = await this.supabase
          .getClient()
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const userRole = profile?.role;
        if (!userRole || !requiredRoles.includes(userRole)) {
          this.logger.warn(`Access denied for user ${user.id} with role "${userRole}". Required: ${requiredRoles.join(', ')}`);
          throw new ForbiddenException('No tienes permisos para esta acción');
        }
      }

      // Attach user to request for downstream use
      request.user = user;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.error(`Auth error: ${err}`);
      throw new UnauthorizedException('Error de autenticación');
    }
  }
}
