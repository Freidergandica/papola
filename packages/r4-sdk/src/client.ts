import { R4Config, BankAccount, PaymentRequest, PaymentResponse } from './types';

const DEFAULT_URLS = {
  sandbox: 'https://sandbox.r4.com/api/v1',
  production: 'https://api.r4.com/api/v1',
};

export class R4Client {
  private config: R4Config;
  private baseUrl: string;

  constructor(config: R4Config) {
    this.config = config;
    this.baseUrl = config.baseUrl || DEFAULT_URLS[config.environment];
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `R4 API error: ${response.status}`);
    }

    return response.json();
  }

  async getBankAccounts(): Promise<BankAccount[]> {
    return this.request<BankAccount[]>('/accounts');
  }

  async createPayment(payment: PaymentRequest): Promise<PaymentResponse> {
    return this.request<PaymentResponse>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    return this.request<PaymentResponse>(`/payments/${paymentId}`);
  }
}
