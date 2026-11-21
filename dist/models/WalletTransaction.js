"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
class WalletTransaction {
    id;
    driver_ref;
    type;
    amount;
    balance_after;
    note;
    ride_ref;
    created_by;
    created_at;
    constructor(data = {}) {
        this.id = data.id;
        this.driver_ref = data.driver_ref || '';
        this.type = data.type || 'adjustment';
        this.amount = data.amount ?? 0;
        this.balance_after = data.balance_after ?? 0;
        this.note = data.note || '';
        this.ride_ref = data.ride_ref || '';
        this.created_by = data.created_by || '';
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            driver_ref: this.driver_ref,
            type: this.type,
            amount: this.amount,
            balance_after: this.balance_after,
            note: this.note || '',
            ride_ref: this.ride_ref || null,
            created_by: this.created_by || '',
            created_at: this.created_at || new Date(),
        };
    }
    static fromRow(row) {
        return new WalletTransaction({
            id: row.id,
            driver_ref: row.driver_ref,
            type: row.type,
            amount: Number(row.amount),
            balance_after: Number(row.balance_after),
            note: row.note,
            ride_ref: row.ride_ref ?? undefined,
            created_by: row.created_by,
            created_at: row.created_at,
        });
    }
    static async findByDriver(driverRef) {
        const result = await (0, db_1.query)('SELECT * FROM wallet_transactions WHERE driver_ref = $1 ORDER BY created_at DESC LIMIT 100', [driverRef]);
        return result.rows.map(WalletTransaction.fromRow);
    }
    static async find() {
        const result = await (0, db_1.query)('SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 200', []);
        return result.rows.map(WalletTransaction.fromRow);
    }
    // True SQL aggregate, not row-limited like find() — stays accurate no
    // matter how large the ledger grows, since it never has to pull every row
    // into the app just to add them up.
    static async sumByType() {
        const result = await (0, db_1.query)('SELECT type, SUM(amount) AS total FROM wallet_transactions GROUP BY type', []);
        const totals = { topup: 0, commission: 0, adjustment: 0 };
        for (const row of result.rows) {
            if (row.type in totals)
                totals[row.type] = Number(row.total) || 0;
        }
        return totals;
    }
    // Bounded by time rather than row count, so a daily-bucketed chart never
    // silently drops older transactions the way a fixed LIMIT would once the
    // ledger passes that many rows.
    static async findSince(since) {
        const result = await (0, db_1.query)('SELECT * FROM wallet_transactions WHERE created_at >= $1 ORDER BY created_at ASC', [since]);
        return result.rows.map(WalletTransaction.fromRow);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO wallet_transactions (${columns.join(', ')}) VALUES (${placeholders})`, values);
        Object.assign(this, row);
        return this;
    }
}
exports.default = WalletTransaction;
