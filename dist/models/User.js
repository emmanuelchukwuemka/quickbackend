"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class User {
    id;
    uid;
    email;
    password;
    display_name;
    photo_url;
    phone_number;
    created_time;
    is_active;
    is_online;
    wallet_balance;
    state;
    country;
    dob;
    gender;
    numbe_trips;
    User_CurrentLocation;
    location;
    fcm_token;
    constructor(data = {}) {
        this.id = data.id;
        this.uid = data.uid || '';
        this.email = data.email;
        this.password = data.password;
        this.display_name = data.display_name || '';
        this.photo_url = data.photo_url;
        this.phone_number = data.phone_number;
        this.created_time = data.created_time ? new Date(data.created_time) : undefined;
        this.is_active = data.is_active ?? true;
        this.is_online = data.is_online || 'Offline';
        this.wallet_balance = data.wallet_balance ?? 0;
        this.numbe_trips = data.numbe_trips ?? 0;
        this.User_CurrentLocation = data.User_CurrentLocation;
        this.state = data.state;
        this.country = data.country;
        this.dob = data.dob;
        this.gender = data.gender;
        this.location = data.location;
        this.fcm_token = data.fcm_token;
    }
    toDbRow(includeId) {
        const generatedId = this.id || crypto_1.default.randomUUID();
        const coordinates = this.location?.coordinates || [0, 0];
        return {
            ...(includeId ? { id: generatedId } : {}),
            uid: this.uid || this.email || this.phone_number || generatedId,
            email: this.email || null,
            password: this.password || '',
            name: this.display_name || '',
            display_name: this.display_name || '',
            photo_url: this.photo_url || '',
            phone_number: this.phone_number || '',
            is_active: this.is_active ?? true,
            is_online: this.is_online || 'Offline',
            wallet_balance: this.wallet_balance ?? 0,
            numbe_trips: this.numbe_trips ?? 0,
            user_currentlocation: this.User_CurrentLocation || '',
            state: this.state || '',
            country: this.country || '',
            dob: this.dob || '',
            gender: this.gender || '',
            lat: coordinates[1] ?? 0,
            lng: coordinates[0] ?? 0,
            fcm_token: this.fcm_token || '',
        };
    }
    static fromRow(row) {
        return new User({
            id: row.id,
            uid: row.uid || row.id,
            email: row.email ?? undefined,
            password: row.password ?? undefined,
            display_name: row.display_name || row.name || '',
            photo_url: row.photo_url ?? undefined,
            phone_number: row.phone_number ?? undefined,
            created_time: row.created_time,
            is_active: row.is_active,
            is_online: row.is_online,
            wallet_balance: Number(row.wallet_balance),
            numbe_trips: row.numbe_trips,
            User_CurrentLocation: row.user_currentlocation ?? undefined,
            state: row.state ?? undefined,
            country: row.country ?? undefined,
            dob: row.dob ?? undefined,
            gender: row.gender ?? undefined,
            location: { type: 'Point', coordinates: [Number(row.lng), Number(row.lat)] },
            fcm_token: row.fcm_token ?? undefined,
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM users WHERE ${clause}`, values);
        return result.rows.map(User.fromRow);
    }
    static async findOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM users WHERE ${clause} LIMIT 1`, values);
        if (!result.rowCount)
            return null;
        return User.fromRow(result.rows[0]);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return User.fromRow(result.rows[0]);
    }
    static async findByIdAndUpdate(id, updates, options = { new: false }) {
        const { set, values } = (0, queryHelper_1.buildUpdateSet)(updates);
        if (!set)
            return null;
        values.push(id);
        await (0, db_1.query)(`UPDATE users SET ${set} WHERE id = $${values.length}`, values);
        return User.findById(id);
    }
    static async deleteMany(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM users WHERE ${clause}`, values);
    }
    static async deleteOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM users WHERE ${clause}`, values);
    }
    async save() {
        const idColumnType = await (0, db_1.getColumnDataType)('users', 'id');
        const shouldIncludeId = idColumnType !== 'bigint' &&
            idColumnType !== 'integer' &&
            idColumnType !== 'smallint';
        const row = this.toDbRow(shouldIncludeId);
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        const result = await (0, db_1.query)(`INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const newId = shouldIncludeId ? row.id : result.insertId;
        const saved = await User.findById(String(newId));
        Object.assign(this, saved);
        return saved;
    }
    toJSON() {
        const { password, ...safeUser } = this;
        return safeUser;
    }
}
exports.default = User;
