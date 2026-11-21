"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
class NotificationLog {
    id;
    title;
    body;
    audience;
    recipient_count;
    sent_by;
    sent_at;
    constructor(data = {}) {
        this.id = data.id;
        this.title = data.title || '';
        this.body = data.body || '';
        this.audience = data.audience || 'all_passengers';
        this.recipient_count = data.recipient_count ?? 0;
        this.sent_by = data.sent_by || '';
        this.sent_at = data.sent_at ? new Date(data.sent_at) : undefined;
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            title: this.title,
            body: this.body || '',
            audience: this.audience || 'all_passengers',
            recipient_count: this.recipient_count ?? 0,
            sent_by: this.sent_by || '',
            sent_at: this.sent_at || new Date(),
        };
    }
    static fromRow(row) {
        return new NotificationLog({
            id: row.id,
            title: row.title,
            body: row.body,
            audience: row.audience,
            recipient_count: Number(row.recipient_count),
            sent_by: row.sent_by,
            sent_at: row.sent_at,
        });
    }
    static async find() {
        const result = await (0, db_1.query)('SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 100', []);
        return result.rows.map(NotificationLog.fromRow);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO notification_log (${columns.join(', ')}) VALUES (${placeholders})`, values);
        Object.assign(this, row);
        return this;
    }
}
exports.default = NotificationLog;
