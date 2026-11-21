"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const queryHelper_1 = require("./queryHelper");
class Driver {
    id;
    uid;
    email;
    display_name;
    photo_url;
    phone_number;
    password;
    created_time;
    role;
    is_active;
    is_online;
    verification_status;
    documents;
    total_trips;
    driver_rating;
    wallet_balance;
    location;
    car_model;
    car_plate;
    date_of_birth;
    gender;
    residential_address;
    state;
    lga;
    emergency_contact_name;
    emergency_contact_phone;
    emergency_contact_relationship;
    nin;
    license_number;
    license_expiry;
    vehicle_make;
    vehicle_year;
    vehicle_colour;
    vehicle_registration_number;
    seat_count;
    is_air_conditioned;
    vehicle_ownership;
    constructor(data = {}) {
        this.id = data.id;
        this.uid = data.uid || '';
        this.email = data.email;
        this.display_name = data.display_name || '';
        this.photo_url = data.photo_url;
        this.phone_number = data.phone_number;
        this.password = data.password || '';
        this.created_time = data.created_time ? new Date(data.created_time) : undefined;
        this.role = data.role || 'driver';
        this.is_active = data.is_active ?? true;
        this.is_online = data.is_online || 'Offline';
        this.verification_status = data.verification_status || 'pending';
        this.documents = data.documents || [];
        this.total_trips = data.total_trips ?? 0;
        this.driver_rating = data.driver_rating ?? 0;
        this.wallet_balance = data.wallet_balance ?? 0;
        this.location = data.location;
        this.car_model = data.car_model;
        this.car_plate = data.car_plate;
        this.date_of_birth = data.date_of_birth || '';
        this.gender = data.gender || '';
        this.residential_address = data.residential_address || '';
        this.state = data.state || '';
        this.lga = data.lga || '';
        this.emergency_contact_name = data.emergency_contact_name || '';
        this.emergency_contact_phone = data.emergency_contact_phone || '';
        this.emergency_contact_relationship = data.emergency_contact_relationship || '';
        this.nin = data.nin || '';
        this.license_number = data.license_number || '';
        this.license_expiry = data.license_expiry || '';
        this.vehicle_make = data.vehicle_make || '';
        this.vehicle_year = data.vehicle_year || '';
        this.vehicle_colour = data.vehicle_colour || '';
        this.vehicle_registration_number = data.vehicle_registration_number || '';
        this.seat_count = data.seat_count ?? 4;
        this.is_air_conditioned = data.is_air_conditioned ?? true;
        this.vehicle_ownership = data.vehicle_ownership || '';
    }
    toDbRow(includeId) {
        const generatedId = this.id || crypto_1.default.randomUUID();
        const coordinates = this.location?.coordinates || [0, 0];
        return {
            ...(includeId ? { id: generatedId } : {}),
            uid: this.uid || this.email || this.phone_number || generatedId,
            email: this.email || null,
            name: this.display_name || '',
            full_name: this.display_name || '',
            display_name: this.display_name || '',
            photo_url: this.photo_url || '',
            phone_number: this.phone_number || '',
            password: this.password || '',
            role: this.role || 'driver',
            is_active: this.is_active ?? true,
            is_online: this.is_online || 'Offline',
            verification_status: this.verification_status || 'pending',
            documents: JSON.stringify(this.documents || []),
            total_trips: this.total_trips ?? 0,
            driver_rating: this.driver_rating ?? 0,
            wallet_balance: this.wallet_balance ?? 0,
            lat: coordinates[1] ?? 0,
            lng: coordinates[0] ?? 0,
            car_model: this.car_model || '',
            car_plate: this.car_plate || '',
            date_of_birth: this.date_of_birth || '',
            gender: this.gender || '',
            residential_address: this.residential_address || '',
            state: this.state || '',
            lga: this.lga || '',
            emergency_contact_name: this.emergency_contact_name || '',
            emergency_contact_phone: this.emergency_contact_phone || '',
            emergency_contact_relationship: this.emergency_contact_relationship || '',
            nin: this.nin || '',
            license_number: this.license_number || '',
            license_expiry: this.license_expiry || '',
            vehicle_make: this.vehicle_make || '',
            vehicle_year: this.vehicle_year || '',
            vehicle_colour: this.vehicle_colour || '',
            vehicle_registration_number: this.vehicle_registration_number || '',
            seat_count: this.seat_count ?? 4,
            is_air_conditioned: this.is_air_conditioned ?? true,
            vehicle_ownership: this.vehicle_ownership || '',
        };
    }
    static fromRow(row) {
        return new Driver({
            id: row.id,
            uid: row.uid || row.id,
            email: row.email ?? undefined,
            display_name: row.display_name || row.full_name || row.name || '',
            photo_url: row.photo_url ?? undefined,
            phone_number: row.phone_number ?? undefined,
            password: row.password ?? undefined,
            created_time: row.created_time,
            role: row.role,
            is_active: row.is_active,
            is_online: row.is_online,
            verification_status: row.verification_status,
            documents: Array.isArray(row.documents) ? row.documents : row.documents ? JSON.parse(row.documents) : [],
            total_trips: row.total_trips,
            driver_rating: Number(row.driver_rating),
            wallet_balance: Number(row.wallet_balance),
            location: { type: 'Point', coordinates: [Number(row.lng), Number(row.lat)] },
            car_model: row.car_model ?? '',
            car_plate: row.car_plate ?? '',
            date_of_birth: row.date_of_birth ?? '',
            gender: row.gender ?? '',
            residential_address: row.residential_address ?? '',
            state: row.state ?? '',
            lga: row.lga ?? '',
            emergency_contact_name: row.emergency_contact_name ?? '',
            emergency_contact_phone: row.emergency_contact_phone ?? '',
            emergency_contact_relationship: row.emergency_contact_relationship ?? '',
            nin: row.nin ?? '',
            license_number: row.license_number ?? '',
            license_expiry: row.license_expiry ?? '',
            vehicle_make: row.vehicle_make ?? '',
            vehicle_year: row.vehicle_year ?? '',
            vehicle_colour: row.vehicle_colour ?? '',
            vehicle_registration_number: row.vehicle_registration_number ?? '',
            seat_count: row.seat_count != null ? Number(row.seat_count) : 4,
            is_air_conditioned: row.is_air_conditioned ?? true,
            vehicle_ownership: row.vehicle_ownership ?? '',
        });
    }
    static async find(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM drivers WHERE ${clause}`, values);
        return result.rows.map(Driver.fromRow);
    }
    static async findOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        const result = await (0, db_1.query)(`SELECT * FROM drivers WHERE ${clause} LIMIT 1`, values);
        if (!result.rowCount)
            return null;
        return Driver.fromRow(result.rows[0]);
    }
    static async findById(id) {
        if (!id)
            return null;
        const result = await (0, db_1.query)('SELECT * FROM drivers WHERE id = $1 LIMIT 1', [id]);
        if (!result.rowCount)
            return null;
        return Driver.fromRow(result.rows[0]);
    }
    static async findByIdAndUpdate(id, updates, options = { new: false }) {
        const { set, values } = (0, queryHelper_1.buildUpdateSet)(updates);
        if (!set)
            return null;
        values.push(id);
        await (0, db_1.query)(`UPDATE drivers SET ${set} WHERE id = $${values.length}`, values);
        return Driver.findById(id);
    }
    static async deleteMany(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM drivers WHERE ${clause}`, values);
    }
    static async deleteOne(condition = {}) {
        const { clause, values } = (0, queryHelper_1.buildWhere)(condition);
        await (0, db_1.query)(`DELETE FROM drivers WHERE ${clause}`, values);
    }
    async save() {
        const idColumnType = await (0, db_1.getColumnDataType)('drivers', 'id');
        const shouldIncludeId = idColumnType !== 'bigint' &&
            idColumnType !== 'integer' &&
            idColumnType !== 'smallint';
        const row = this.toDbRow(shouldIncludeId);
        const columns = Object.keys(row);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(row);
        const result = await (0, db_1.query)(`INSERT INTO drivers (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const newId = shouldIncludeId ? row.id : result.insertId;
        const saved = await Driver.findById(String(newId));
        Object.assign(this, saved);
        return saved;
    }
    toJSON() {
        const { password, ...safeDriver } = this;
        return {
            ...safeDriver,
            vehicle_model: this.car_model,
            car_model: this.car_model,
            vehicle: this.car_model,
            plate_number: this.car_plate,
            license_plate: this.car_plate,
            vehicle_plate: this.car_plate,
        };
    }
}
exports.default = Driver;
