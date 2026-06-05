const base = 'https://quick-backend-m19x.onrender.com';
const random = Math.random().toString(36).substring(2, 10);

const log = async (label, path, opts = {}) => {
  try {
    const res = await fetch(base + path, opts);
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    console.log('---', label, path, 'status=', res.status);
    console.log(body);
  } catch (err) {
    console.error('ERROR', label, path, err);
  }
};

(async () => {
  await log('Health', '/health');
  await log('Users GET', '/api/users');
  await log('Drivers GET', '/api/drivers');
  await log('Rides GET', '/api/rides');
  await log('Cities GET', '/api/cities');
  await log('RideOptions GET', '/api/rideOptions');
  await log('Payments user GET', '/api/payments/user/no-user');

  await log('Auth request OTP', '/api/auth/request-otp', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ phone_number: `+1750555${random}` })
  });

  await log('Auth verify invalid', '/api/auth/verify-otp', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ phone_number: `+1750555${random}`, code: '000000', role: 'passenger' })
  });

  const userRes = await fetch(base + '/api/users', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ uid: `user_${random}`, email: `${random}@example.com`, display_name: 'Render Test User' })
  });
  const userBody = await userRes.json().catch(() => null);
  console.log('--- User create status=', userRes.status, userBody);

  const driverRes = await fetch(base + '/api/drivers', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ uid: `driver_${random}`, email: `driver_${random}@example.com`, display_name: 'Render Test Driver', verification_status: 'approved', is_online: 'Online', location: { type: 'Point', coordinates: [3.3792, 6.5244] } })
  });
  const driverBody = await driverRes.json().catch(() => null);
  console.log('--- Driver create status=', driverRes.status, driverBody);

  if (userBody?.id) {
    await log('User update', `/api/users/${userBody.id}`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ display_name: 'Render Updated User' })
    });
  }

  if (driverBody?.id) {
    await log('Driver update', `/api/drivers/${driverBody.id}`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ display_name: 'Render Updated Driver' })
    });
  }

  if (userBody?.id) {
    const paymentRes = await fetch(base + '/api/payments', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ user_ref: userBody.id, provider: 'Stripe', paymentMethod: 'card', masked_number: '****1234' })
    });
    const paymentBody = await paymentRes.json().catch(() => null);
    console.log('--- Payment create status=', paymentRes.status, paymentBody);

    await log('Payments GET', `/api/payments/user/${userBody.id}`);
  }

  if (userBody?.id) {
    const rideReqRes = await fetch(base + '/api/rides/request', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ passenger_id: userBody.id, pickupLat: 6.5244, pickupLng: 3.3792, dropoffLat: 6.5244, dropoffLng: 3.3892 })
    });
    const rideReqBody = await rideReqRes.json().catch(() => null);
    console.log('--- Ride request status=', rideReqRes.status, rideReqBody);

    if (rideReqBody?.ride?.id && driverBody?.id) {
      const acceptRes2 = await fetch(base + `/api/rides/${rideReqBody.ride.id}/accept`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ driver_id: driverBody.id })
      });
      const acceptBody = await acceptRes2.json().catch(() => null);
      console.log('--- Ride accept status=', acceptRes2.status, acceptBody);
    }
  }
})();
