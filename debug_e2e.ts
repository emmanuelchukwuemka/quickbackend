import request from 'supertest';
import app from './src/app';

(async () => {
  try {
    const userRes = await request(app)
      .post('/api/users')
      .send({ uid: 'tmpuser', email: 'tmp@example.com', display_name: 'Tmp User' });
    console.log('user', userRes.status, userRes.body);

    const driverRes = await request(app)
      .post('/api/drivers')
      .send({ uid: 'tmpdriver', email: 'tmpdriver@example.com', display_name: 'Tmp Driver', verification_status: 'approved', is_online: 'Online', location: { type: 'Point', coordinates: [3.3792, 6.5244] } });
    console.log('driver', driverRes.status, driverRes.body);

    const rideRes = await request(app)
      .post('/api/rides/request')
      .send({ passenger_id: userRes.body.id, pickupLat: 6.5244, pickupLng: 3.3792, dropoffLat: 6.5244, dropoffLng: 3.3892 });
    console.log('ride', rideRes.status, JSON.stringify(rideRes.body));

    const acceptRes = await request(app)
      .put(`/api/rides/${rideRes.body.ride.id}/accept`)
      .send({ driver_id: driverRes.body.id });
    console.log('accept', acceptRes.status, JSON.stringify(acceptRes.body));
  } catch (err) {
    console.error('error', err && (err as any).stack ? (err as any).stack : err);
    process.exit(1);
  }
})();
