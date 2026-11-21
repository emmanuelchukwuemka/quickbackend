"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class Payment {
    id;
    user_ref;
    provider;
    paymentMethod;
    paymentStatus;
    masked_number;
    is_default;
    created_at;
    constructor(data = {}) {
        this.id = data.id;
        this.user_ref = data.user_ref || '';
        this.provider = data.provider || '';
        this.paymentMethod = data.paymentMethod || 'card';
        this.paymentStatus = data.paymentStatus || 'pending';
        this.masked_number = data.masked_number || '';
        this.is_default = data.is_default ?? false;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            user_ref: this.user_ref,
            provider: this.provider,
            paymentMethod: this.paymentMethod || 'card',
            paymentStatus: this.paymentStatus || 'pending',
            masked_number: this.masked_number || '',
            is_default: this.is_default ?? false,
            created_at: this.created_at || new Date(),
        };
    }
    static fromRow(row) {
        return new Payment({
            id: row.id,
            user_ref: row.user_ref,
            provider: row.provider,
            paymentMethod: row.paymentMethod,
            paymentStatus: row.paymentStatus,
            masked_number: row.masked_number,
            is_default: row.is_default,
            created_at: row.created_at,
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM payments WHERE ${clause}`, values);
        return result.rows.map(Payment.fromRow);
    }
    static async findOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM payments WHERE ${clause} LIMIT 1`, values);
        if (!result.rowCount)
            return null;
        return Payment.fromRow(result.rows[0]);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM payments WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return Payment.fromRow(result.rows[0]);
    }
    static async findByIdAndUpdate(id, updates, options = { new: false }) {
        const { set, values } = (0, queryHelper_1.buildUpdateSet)(updates);
        if (!set)
            return null;
        values.push(id);
        await (0, db_1.query)(`UPDATE payments SET ${set} WHERE id = $${values.length}`, values);
        return Payment.findById(id);
    }
    static async deleteMany(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM payments WHERE ${clause}`, values);
    }
    static async deleteOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM payments WHERE ${clause}`, values);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO payments (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const saved = await Payment.findById(row.id);
        Object.assign(this, saved);
        return saved;
    }
}
exports.default = Payment;
