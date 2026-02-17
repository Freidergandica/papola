import { Injectable } from '@nestjs/common';
import { map, Subject } from 'rxjs';

export type SSEData = {
  orderId: string;
  event: string;
  status: string;
  amount?: number;
  clientId?: string;
  phone?: string;
};

@Injectable()
export class SSEService {
  private clients = new Map<string, Subject<MessageEvent>>();

  getClientStream(orderId: string): Subject<MessageEvent> {
    if (!this.clients.has(orderId)) {
      this.clients.set(orderId, new Subject<MessageEvent>());
    }
    return this.clients.get(orderId)!;
  }

  emitToOrder(orderId: string, data: SSEData) {
    const client = this.clients.get(orderId);
    if (client) {
      client.next({ data } as MessageEvent);
    }
  }

  removeClient(orderId: string) {
    const client = this.clients.get(orderId);
    if (client) {
      client.complete();
      this.clients.delete(orderId);
    }
  }

  pipeStream(orderId: string) {
    return this.getClientStream(orderId).asObservable().pipe(
      map((event) => ({ data: event.data })),
    );
  }
}
