"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class PaymentTransaction {
    id;
    reference;
    purpose;
    user_ref;
    email;
    amount;
    status;
    gateway_response;
    created_at;
    verified_at;
    constructor(data = {}) {
        this.id = data.id;
        this.reference = data.reference || '';
        this.purpose = data.purpose || 'wallet_topup';
        this.user_ref = data.user_ref || '';
        this.email = data.email || '';
        this.amount = Number(data.amount ?? 0);
        this.status = data.status || 'pending';
        this.gateway_response = data.gateway_response || '';
        this.created_at = data.created_at;
        this.verified_at = data.verified_at;
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            reference: this.reference,
            purpose: this.purpose,
            user_ref: this.user_ref,
            ride_ref: null,
            email: this.email || '',
            amount: this.amount,
            status: this.status,
            gateway_response: this.gateway_response || '',
            created_at: this.created_at || new Date(),
            verified_at: this.verified_at || null,
        };
    }
    static fromRow(row) {
        return new PaymentTransaction({
            id: row.id,
            reference: row.reference,
            purpose: row.purpose,
            user_ref: row.user_ref,
            email: row.email,
            amount: Number(row.amount),
            status: row.status,
            gateway_response: row.gateway_response,
            created_at: row.created_at,
            verified_at: row.verified_at,
        });
    }
    static async findByReference(reference) {
        const result = await (0, db_1.query)('SELECT * FROM payment_transactions WHERE reference = $1 LIMIT 1', [reference]);
        if (!result.rowCount)
            return null;
        return PaymentTransaction.fromRow(result.rows[0]);
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM payment_transactions WHERE ${clause} ORDER BY created_at DESC LIMIT 200`, values);
        return result.rows.map(PaymentTransaction.fromRow);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO payment_transactions (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const saved = await PaymentTransaction.findByReference(this.reference);
        Object.assign(this, saved);
        return saved;
    }
    // Atomically transitions pending -> success (or failed), guarded by the
    // WHERE status='pending' clause so a webhook and a client-triggered verify
    // racing on the same reference can only ever have one of them "win" and
    // actually apply the side effect (crediting the wallet).
    static async markSettled(reference, status, gatewayResponse) {
        const result = await (0, db_1.query)(`UPDATE payment_transactions SET status = $1, gateway_response = $2, verified_at = $3 WHERE reference = $4 AND status = 'pending'`, [status, gatewayResponse, new Date(), reference]);
        return (result.rowCount ?? 0) > 0;
    }
}
exports.default = PaymentTransaction;
