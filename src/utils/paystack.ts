import crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const secretKey = () => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  return key;
};

interface InitializeParams {
  email: string;
  amountNaira: number;
  reference: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
}

interface InitializeResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export const initializeTransaction = async (params: InitializeParams): Promise<InitializeResult> => {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNaira * 100), // Paystack works in kobo
      reference: params.reference,
      metadata: params.metadata || {},
      callback_url: params.callback_url,
    }),
  });
  const data: any = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data?.message || `Paystack initialize failed (${res.status})`);
  }
  return data.data as InitializeResult;
};

export interface VerifyResult {
  status: 'success' | 'failed' | 'abandoned' | string;
  reference: string;
  amount: number; // kobo
  currency: string;
  paid_at: string | null;
  customer: { email: string };
  metadata?: Record<string, unknown>;
}

export const verifyTransaction = async (reference: string): Promise<VerifyResult> => {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data: any = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data?.message || `Paystack verify failed (${res.status})`);
  }
  return data.data as VerifyResult;
};

// Paystack signs webhook bodies with HMAC-SHA512 of the raw request body,
// using the account's secret key. Must be checked against the RAW bytes,
// not the re-serialized parsed JSON (whitespace/key-order differences would
// break the signature).
export const verifyWebhookSignature = (rawBody: Buffer, signatureHeader: string | undefined): boolean => {
  if (!signatureHeader) return false;
  const hash = crypto.createHmac('sha512', secretKey()).update(rawBody).digest('hex');
  return hash === signatureHeader;
};
