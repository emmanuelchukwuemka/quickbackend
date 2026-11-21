"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class AdminUser {
    id;
    email;
    password;
    display_name;
    role;
    is_active;
    created_at;
    last_login;
    constructor(data = {}) {
        this.id = data.id;
        this.email = data.email || '';
        this.password = data.password || '';
        this.display_name = data.display_name || '';
        this.role = data.role || 'support';
        this.is_active = data.is_active ?? true;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
        this.last_login = data.last_login ? new Date(data.last_login) : undefined;
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            email: this.email,
            password: this.password,
            display_name: this.display_name || '',
            role: this.role || 'support',
            is_active: this.is_active ?? true,
            created_at: this.created_at || new Date(),
            last_login: this.last_login || null,
        };
    }
    static fromRow(row) {
        return new AdminUser({
            id: row.id,
            email: row.email,
            password: row.password,
            display_name: row.display_name,
            role: row.role,
            is_active: row.is_active,
            created_at: row.created_at,
            last_login: row.last_login ?? undefined,
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM admin_users WHERE ${clause}`, values);
        return result.rows.map(AdminUser.fromRow);
    }
    static async findOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM admin_users WHERE ${clause} LIMIT 1`, values);
        if (!result.rowCount)
            return null;
        return AdminUser.fromRow(result.rows[0]);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM admin_users WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return AdminUser.fromRow(result.rows[0]);
    }
    static async count() {
        const result = await (0, db_1.query)('SELECT COUNT(*) AS c FROM admin_users', []);
        return Number(result.rows[0]?.c ?? 0);
    }
    static async findByIdAndUpdate(id, updates) {
        const { set, values } = (0, queryHelper_1.buildUpdateSet)(updates);
        if (!set)
            return null;
        values.push(id);
        await (0, db_1.query)(`UPDATE admin_users SET ${set} WHERE id = $${values.length}`, values);
        return AdminUser.findById(id);
    }
    static async deleteOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM admin_users WHERE ${clause}`, values);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO admin_users (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const saved = await AdminUser.findById(row.id);
        Object.assign(this, saved);
        return saved;
    }
    toJSON() {
        const { password, ...safe } = this;
        return safe;
    }
}
exports.default = AdminUser;
