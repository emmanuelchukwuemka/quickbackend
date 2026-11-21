"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const Ride_1 = __importDefault(require("../models/Ride"));
describe('Ride Routes', () => {
    it('should create a new ride request', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/rides')
            .send({
            pickup: { type: "Point", coordinates: [20, 10] },
            dropoff: { type: "Point", coordinates: [40, 30] },
            ride_type: 'standard',
            payment_method: 'card'
        });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('Pending');
        expect(res.body.ride_type).toBe('standard');
        expect(res.body.pickup.lat).toBe(10);
    });
    it('should update a ride status', async () => {
        const ride = new Ride_1.default({
            pickup: { type: "Point", coordinates: [20, 10] },
            dropoff: { type: "Point", coordinates: [40, 30] },
        });
        await ride.save();
        const res = await (0, supertest_1.default)(app_1.default)
            .put(`/api/rides/${ride.id}/status`)
            .send({ status: 'Completed' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Completed');
    });
});
