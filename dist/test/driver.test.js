"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const Driver_1 = __importDefault(require("../models/Driver"));
describe('Driver Routes', () => {
    it('should create a new driver', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/drivers')
            .send({
            uid: 'driver_uid',
            email: 'driver@example.com',
            display_name: 'Test Driver',
            phone_number: '+1987654321',
        });
        expect(res.status).toBe(201);
        expect(res.body.uid).toBe('driver_uid');
        expect(res.body.role).toBe('driver');
        expect(res.body.verification_status).toBe('pending');
    });
    it('should fetch all drivers', async () => {
        const driver = new Driver_1.default({ uid: 'driver_uid2', email: 'driver2@example.com', display_name: 'Driver 2' });
        await driver.save();
        const res = await (0, supertest_1.default)(app_1.default).get('/api/drivers');
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });
});
