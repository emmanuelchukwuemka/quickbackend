"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class Otp {
    id;
    phone_number;
    email;
    code;
    createdAt;
    constructor(data = {}) {
        this.id = data.id;
        this.phone_number = data.phone_number;
        this.email = data.email;
        this.code = data.code || '';
        this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            phone_number: this.phone_number || null,
            email: this.email || null,
            code: this.code,
            created_at: this.createdAt || new Date(),
        };
    }
    static fromRow(row) {
        return new Otp({
            id: row.id,
            phone_number: row.phone_number ?? undefined,
            email: row.email ?? undefined,
            code: row.code,
            createdAt: row.created_at,
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM otps WHERE ${clause}`, values);
        return result.rows.map(Otp.fromRow);
    }
    static async findOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        // Compare against a cutoff computed here rather than the DB's own NOW() —
        // otherwise any clock/timezone drift between the app server and the DB
        // server makes a just-created code look already expired.
        const cutoff = new Date(Date.now() - 5 * 60 * 1000);
        const allValues = [...values, cutoff];
        const result = await (0, db_1.query)(`SELECT * FROM otps WHERE ${clause} AND created_at >= $${allValues.length} LIMIT 1`, allValues);
        if (!result.rowCount)
            return null;
        return Otp.fromRow(result.rows[0]);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM otps WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return Otp.fromRow(result.rows[0]);
    }
    static async deleteMany(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM otps WHERE ${clause}`, values);
    }
    static async deleteOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM otps WHERE ${clause}`, values);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO otps (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const saved = await Otp.findById(row.id);
        Object.assign(this, saved);
        return saved;
    }
}
exports.default = Otp;
