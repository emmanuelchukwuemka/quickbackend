"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class City {
    id;
    location_name;
    Latlng;
    pin_image;
    constructor(data = {}) {
        this.id = data.id;
        this.location_name = data.location_name || '';
        this.Latlng = data.Latlng || { lat: 0, lng: 0 };
        this.pin_image = data.pin_image || '';
    }
    toDbRow() {
        return {
            id: this.id || crypto_1.default.randomUUID(),
            location_name: this.location_name,
            lat: this.Latlng.lat,
            lng: this.Latlng.lng,
            pin_image: this.pin_image || '',
        };
    }
    static fromRow(row) {
        return new City({
            id: row.id,
            location_name: row.location_name,
            Latlng: { lat: Number(row.lat), lng: Number(row.lng) },
            pin_image: row.pin_image,
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM cities WHERE ${clause}`, values);
        return result.rows.map(City.fromRow);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM cities WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return City.fromRow(result.rows[0]);
    }
    static async findByIdAndUpdate(id, updates) {
        const { set, values } = (0, queryHelper_1.buildUpdateSet)(updates);
        if (!set)
            return null;
        values.push(id);
        await (0, db_1.query)(`UPDATE cities SET ${set} WHERE id = $${values.length}`, values);
        return City.findById(id);
    }
    static async deleteOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM cities WHERE ${clause}`, values);
    }
    async save() {
        const row = this.toDbRow();
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        await (0, db_1.query)(`INSERT INTO cities (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const saved = await City.findById(row.id);
        Object.assign(this, saved);
        return saved;
    }
    static async insertMany(records) {
        if (!records.length)
            return [];
        const rows = records.map((record) => {
            const city = new City({ ...record });
            const dbRow = city.toDbRow();
            return dbRow;
        });
        const values = [];
        const placeholders = rows
            .map((row, rowIndex) => {
            const rowPlaceholders = Object.values(row).map((_, index) => {
                const placeholderIndex = values.push(Object.values(row)[index]);
                return `$${placeholderIndex}`;
            });
            return `(${rowPlaceholders.join(', ')})`;
        })
            .join(', ');
        const columns = Object.keys(rows[0]);
        await (0, db_1.query)(`INSERT INTO cities (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`, values);
        return City.find();
    }
}
exports.default = City;
