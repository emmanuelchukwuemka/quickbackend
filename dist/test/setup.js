"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
beforeAll(async () => {
    await (0, db_1.initDb)();
});
beforeEach(async () => {
    await (0, db_1.query)('DELETE FROM payments');
    await (0, db_1.query)('DELETE FROM rides');
    await (0, db_1.query)('DELETE FROM otps');
    await (0, db_1.query)('DELETE FROM drivers');
    await (0, db_1.query)('DELETE FROM users');
    await (0, db_1.query)('DELETE FROM ride_options');
    await (0, db_1.query)('DELETE FROM cities');
});
afterAll(async () => {
    await db_1.pool.end();
});
