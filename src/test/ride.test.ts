import request from 'supertest';
import app from '../app';
import Ride from '../models/Ride';

describe('Ride Routes', () => {
  it('should create a new ride request', async () => {
    const res = await request(app)
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
    const ride = new Ride({
      pickup: { type: "Point", coordinates: [20, 10] },
      dropoff: { type: "Point", coordinates: [40, 30] },
    });
    await ride.save();

    const res = await request(app)
      .put(`/api/rides/${ride.id!}/status`)
      .send({ status: 'Completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Completed');
  });
});
