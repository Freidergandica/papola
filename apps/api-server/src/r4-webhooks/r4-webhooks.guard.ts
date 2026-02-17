import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const IP_WHITE_LIST = [
  '::1',
  '127.0.0.1',
  '45.175.213.98',
  '200.74.203.91',
  '204.199.249.3',
];

@Injectable()
export class R4WebhooksGuard implements CanActivate {
  private readonly logger = new Logger(R4WebhooksGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const endpoint = request.path.split('/').pop();
    const authHeader = request.headers['authorization'];
    const expectedToken = this.configService.get<string>('R4_WEBHOOK_TOKEN');

    // Normalize IPv6-mapped IPv4 (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
    let clientIp: string = request.ip || request.connection?.remoteAddress || '';
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.slice(7);
    }

    this.logger.log(
      `Validating request — endpoint: ${endpoint}, IP: ${clientIp}, token: ${authHeader ? '***' + authHeader.slice(-4) : 'missing'}`,
    );

    if (!expectedToken || authHeader !== expectedToken) {
      this.logger.warn('Authorization failed — token mismatch');
      throw new R4StatusException(endpoint);
    }

    if (!IP_WHITE_LIST.includes(clientIp)) {
      this.logger.warn(`Authorization failed — IP not whitelisted: ${clientIp}`);
      throw new R4StatusException(endpoint);
    }

    this.logger.log('Authorization successful');
    return true;
  }
}

class R4StatusException extends HttpException {
  constructor(endpoint: string) {
    const key = endpoint === 'R4consulta' ? 'status' : 'abono';
    super({ [key]: false }, HttpStatus.OK);
  }
}
