"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class PromoCode {
    id;
    code;
    description;
    discount_type;
    discount_value;
    max_uses;
    uses_count;
    expires_at;
    is_active;
    created_at;
    constructor(data = {}) {
        this.id = data.id;
        this.code = (data.code || '').toUpperCase();
        this.description = data.description || '';
        this.discount_type = data.discount_type || 'percent';
        this.discount_value = data.discount_value ?? 0;
        this.max_uses = data.max_uses ?? null;
        this.uses_count = data.uses_count ?? 0;
        this.expires_at = data.expires_at ? new Date(data.expires_at) : null;
        this.is_active = data.is_active ?? true;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            code: this.code,
            description: this.description || '',
            discount_type: this.discount_type || 'percent',
            discount_value: this.discount_value ?? 0,
            max_uses: this.max_uses,
            uses_count: this.uses_count ?? 0,
            expires_at: this.expires_at,
            is_active: this.is_active ?? true,
            created_at: this.created_at || new Date(),
        };
    }
    static fromRow(row) {
        return new PromoCode({
            id: row.id,
            code: row.code,
            description: row.description,
            discount_type: row.discount_type,
            discount_value: Number(row.discount_value),
            max_uses: row.max_uses === null ? null : Number(row.max_uses),
            uses_count: Number(row.uses_count),
            expires_at: row.expires_at,
            is_active: row.is_active,
            created_at: row.created_at,
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM promo_codes WHERE ${clause} ORDER BY created_at DESC`, values);
        return result.rows.map(PromoCode.fromRow);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM promo_codes WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return PromoCode.fromRow(result.rows[0]);
    }
    static async findByIdAndUpdate(id, updates) {
        const { set, values } = (0, queryHelper_1.buildUpdateSet)(updates);
        if (!set)
            return null;
        values.push(id);
        await (0, db_1.query)(`UPDATE promo_codes SET ${set} WHERE id = $${values.length}`, values);
        return PromoCode.findById(id);
    }
    static async deleteOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM promo_codes WHERE ${clause}`, values);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO promo_codes (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const saved = await PromoCode.findById(row.id);
        Object.assign(this, saved);
        return saved;
    }
}
exports.default = PromoCode;
