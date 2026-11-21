"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class RideOption {
    id;
    Type;
    price;
    features;
    numbersofseats;
    constructor(data = {}) {
        this.id = data.id;
        this.Type = data.Type || '';
        this.price = data.price || '0.00';
        this.features = data.features || '';
        this.numbersofseats = data.numbersofseats || '4';
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            Type: this.Type,
            price: this.price || '0.00',
            features: this.features || '',
            numbersofseats: this.numbersofseats || '4',
        };
    }
    static fromRow(row) {
        return new RideOption({
            id: row.id,
            Type: row.Type,
            price: row.price,
            features: row.features,
            numbersofseats: row.numbersofseats,
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM ride_options WHERE ${clause}`, values);
        return result.rows.map(RideOption.fromRow);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM ride_options WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return RideOption.fromRow(result.rows[0]);
    }
    static async findByIdAndUpdate(id, updates) {
        const { set, values } = (0, queryHelper_1.buildUpdateSet)(updates);
        if (!set)
            return null;
        values.push(id);
        await (0, db_1.query)(`UPDATE ride_options SET ${set} WHERE id = $${values.length}`, values);
        return RideOption.findById(id);
    }
    static async deleteOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM ride_options WHERE ${clause}`, values);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row).map((column) => (column === 'Type' ? '`Type`' : column));
        const placeholders = Object.keys(row).map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO ride_options (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const saved = await RideOption.findById(row.id);
        Object.assign(this, saved);
        return saved;
    }
    static async insertMany(records) {
        if (!records.length)
            return [];
        const rows = records.map((record) => {
            const option = new RideOption({ ...record });
            return option.toDbRow();
        });
        const values = [];
        const placeholders = rows
            .map((row) => {
            const rowPlaceholders = Object.values(row).map((value) => {
                const idx = values.push(value);
                return `$${idx}`;
            });
            return `(${rowPlaceholders.join(', ')})`;
        })
            .join(', ');
        const columns = Object.keys(rows[0]).map((column) => column === 'Type' ? '`Type`' : column);
        await (0, db_1.query)(`INSERT INTO ride_options (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`, values);
        return RideOption.find();
    }
}
exports.default = RideOption;
