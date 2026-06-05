import request from 'supertest';
import app from '../app';
import Driver from '../models/Driver';

describe('Driver Routes', () => {
  it('should create a new driver', async () => {
    const res = await request(app)
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
    const driver = new Driver({ uid: 'driver_uid2', email: 'driver2@example.com', display_name: 'Driver 2' });
    await driver.save();

    const res = await request(app).get('/api/drivers');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
