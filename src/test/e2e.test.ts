import request from 'supertest';
import app from '../app';
import User from '../models/User';
import Driver from '../models/Driver';
import Ride from '../models/Ride';

jest.setTimeout(30000);

describe('End-to-End Ride Flow', () => {
  let userId: string;
  let driverId: string;
  let rideId: string;

  beforeAll(async () => {
  });

  afterAll(async () => {
    // Cleanup handled by shared test setup
  });

  it('Should run full e2e ride flow successfully', async () => {
    // Setup Data
    const user = new User({
      uid: 'user123',
      email: 'user@test.com',
      display_name: 'Test User',
      phone_number: '1234567890'
    });
    await user.save();
    userId = user.id!.toString();

    const driver = new Driver({
      uid: 'driver123',
      email: 'driver@test.com',
      display_name: 'Test Driver',
      verification_status: 'approved',
      is_online: 'Online',
      location: { type: 'Point', coordinates: [3.3792, 6.5244] }
    });
    await driver.save();
    driverId = driver.id!.toString();

    // 1. User Profile Update
    let res = await request(app)
      .put(`/api/users/${userId}`)
      .send({ display_name: 'Updated User' });
    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('Updated User');

    // 2. Request Ride
    res = await request(app)
      .post('/api/rides/request')
      .send({
        passenger_id: userId,
        pickupLat: 6.5244,
        pickupLng: 3.3792,
        dropoffLat: 6.5244,
        dropoffLng: 3.3892
      });
    expect(res.status).toBe(201);
    expect(res.body.ride.status).toBe('searching');
    rideId = res.body.ride.id!;

    // 3. Accept Ride
    res = await request(app)
      .put(`/api/rides/${rideId}/accept`)
      .send({ driver_id: driverId });
    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('accepted');

    // 4. Start Ride
    res = await request(app).put(`/api/rides/${rideId}/start`);
    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('In_progress');

    // 5. Complete Ride
    res = await request(app).put(`/api/rides/${rideId}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('Completed');

    // 6. Rate Ride
    res = await request(app)
      .post(`/api/rides/${rideId}/rate`)
      .send({ rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body.ride.rating).toBe(5);

    // 7. Admin Reject Driver
    res = await request(app).put(`/api/admin/driver/${driverId}/reject`);
    expect(res.status).toBe(200);
    expect(res.body.driver.verification_status).toBe('rejected');
  });
});
