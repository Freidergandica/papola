export interface R4Config {
  apiKey: string;
  environment: 'sandbox' | 'production';
  baseUrl?: string;
}

export interface BankAccount {
  id: string;
  bankCode: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  holderName: string;
  holderId: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  reference: string;
  sourceAccount?: string;
  destinationAccount: string;
}

export interface PaymentResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface R4Error {
  code: string;
  message: string;
}
