"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wipeOperationalData = exports.backupBeforeWipe = void 0;
const db_1 = require("../db");
// TEMPORARY — one-time pre-launch data reset. Wipes operational/people data
// while leaving admin accounts and app configuration (fare_settings,
// ride_options, cities) untouched. Remove this controller/route once used.
const WIPE_TABLES = [
    'wallet_transactions',
    'payment_transactions',
    'rides',
    'scheduled_rides',
    'complaints',
    'notification_log',
    'admin_notifications',
    'otps',
    'payments',
    'drivers',
    'users',
];
const backupBeforeWipe = async (_req, res) => {
    try {
        const dump = {};
        for (const table of WIPE_TABLES) {
            const result = await (0, db_1.query)(`SELECT * FROM ${table}`);
            dump[table] = result.rows;
        }
        res.json(dump);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.backupBeforeWipe = backupBeforeWipe;
const wipeOperationalData = async (_req, res) => {
    try {
        const counts = {};
        for (const table of WIPE_TABLES) {
            const result = await (0, db_1.query)(`DELETE FROM ${table}`);
            counts[table] = result.rowCount;
        }
        await (0, db_1.query)(`ALTER TABLE drivers AUTO_INCREMENT = 1`);
        await (0, db_1.query)(`ALTER TABLE users AUTO_INCREMENT = 1`);
        res.json({ message: 'Operational data wiped.', deletedCounts: counts });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.wipeOperationalData = wipeOperationalData;
