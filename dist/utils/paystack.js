"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = exports.verifyTransaction = exports.initializeTransaction = void 0;
const crypto_1 = __importDefault(require("crypto"));
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const secretKey = () => {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key)
        throw new Error('PAYSTACK_SECRET_KEY is not configured.');
    return key;
};
const initializeTransaction = async (params) => {
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
    const data = await res.json();
    if (!res.ok || !data.status) {
        throw new Error(data?.message || `Paystack initialize failed (${res.status})`);
    }
    return data.data;
};
exports.initializeTransaction = initializeTransaction;
const verifyTransaction = async (reference) => {
    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey()}` },
    });
    const data = await res.json();
    if (!res.ok || !data.status) {
        throw new Error(data?.message || `Paystack verify failed (${res.status})`);
    }
    return data.data;
};
exports.verifyTransaction = verifyTransaction;
// Paystack signs webhook bodies with HMAC-SHA512 of the raw request body,
// using the account's secret key. Must be checked against the RAW bytes,
// not the re-serialized parsed JSON (whitespace/key-order differences would
// break the signature).
const verifyWebhookSignature = (rawBody, signatureHeader) => {
    if (!signatureHeader)
        return false;
    const hash = crypto_1.default.createHmac('sha512', secretKey()).update(rawBody).digest('hex');
    return hash === signatureHeader;
};
exports.verifyWebhookSignature = verifyWebhookSignature;
