import request from 'supertest';
import app from '../app';
import User from '../models/User';

describe('User Routes', () => {
  it('should get an empty array initially', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should create a new user', async () => {
    const res = await request(app)
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
    const user = new User({ uid: 'test_uid2', email: 'test2@example.com', display_name: 'Test 2' });
    await user.save();

    const res = await request(app).get(`/api/users/${user.id!}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test2@example.com');
  });
});
