"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class Complaint {
    id;
    user_ref;
    user_role;
    subject;
    message;
    status;
    admin_notes;
    created_at;
    resolved_at;
    constructor(data = {}) {
        this.id = data.id;
        this.user_ref = data.user_ref || '';
        this.user_role = data.user_role || 'passenger';
        this.subject = data.subject || '';
        this.message = data.message || '';
        this.status = data.status || 'open';
        this.admin_notes = data.admin_notes || '';
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
        this.resolved_at = data.resolved_at ? new Date(data.resolved_at) : null;
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            user_ref: this.user_ref || '',
            user_role: this.user_role || 'passenger',
            subject: this.subject || '',
            message: this.message || '',
            status: this.status || 'open',
            admin_notes: this.admin_notes || '',
            created_at: this.created_at || new Date(),
            resolved_at: this.resolved_at,
        };
    }
    static fromRow(row) {
        return new Complaint({
            id: row.id,
            user_ref: row.user_ref,
            user_role: row.user_role,
            subject: row.subject,
            message: row.message,
            status: row.status,
            admin_notes: row.admin_notes,
            created_at: row.created_at,
            resolved_at: row.resolved_at,
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM complaints WHERE ${clause} ORDER BY created_at DESC`, values);
        return result.rows.map(Complaint.fromRow);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM complaints WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return Complaint.fromRow(result.rows[0]);
    }
    static async findByIdAndUpdate(id, updates) {
        const { set, values } = (0, queryHelper_1.buildUpdateSet)(updates);
        if (!set)
            return null;
        values.push(id);
        await (0, db_1.query)(`UPDATE complaints SET ${set} WHERE id = $${values.length}`, values);
        return Complaint.findById(id);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO complaints (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const saved = await Complaint.findById(row.id);
        Object.assign(this, saved);
        return saved;
    }
}
exports.default = Complaint;
