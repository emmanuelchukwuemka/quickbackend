"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const User_1 = __importDefault(require("../models/User"));
describe('User Routes', () => {
    it('should get an empty array initially', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/users');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
    it('should create a new user', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/users')
            .send({
            uid: 'test_uid',
            email: 'test@example.com',
            display_name: 'Test User',
        });
        expect(res.status).toBe(201);
        expect(res.body.uid).toBe('test_uid');
        expect(res.body.email).toBe('test@example.com');
    });
    it('should fetch a user by ID', async () => {
        const user = new User_1.default({ uid: 'test_uid2', email: 'test2@example.com', display_name: 'Test 2' });
        await user.save();
        const res = await (0, supertest_1.default)(app_1.default).get(`/api/users/${user.id}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe('test2@example.com');
    });
});
