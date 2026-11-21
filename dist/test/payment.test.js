"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const Payment_1 = __importDefault(require("../models/Payment"));
describe('Payment Routes', () => {
    const dummyUserId = 'dummy-user-id';
    it('should create a new payment method', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/payments')
            .send({
            user_ref: dummyUserId,
            provider: 'Stripe',
            paymentMethod: 'card',
            masked_number: '****1234'
        });
        expect(res.status).toBe(201);
        expect(res.body.provider).toBe('Stripe');
        expect(res.body.masked_number).toBe('****1234');
    });
    it('should get payments by user ID', async () => {
        const payment = new Payment_1.default({
            user_ref: dummyUserId,
            provider: 'PayPal'
        });
        await payment.save();
        const res = await (0, supertest_1.default)(app_1.default).get(`/api/payments/user/${dummyUserId}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].provider).toBeDefined();
    });
});
