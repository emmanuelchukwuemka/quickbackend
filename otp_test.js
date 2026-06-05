const base = 'https://quick-backend-m19x.onrender.com';
const phone = `+1750555${Math.floor(Math.random()*9000+1000)}`;

(async () => {
  try {
    const requestOtp = await fetch(base + '/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone })
    });
    const requestBody = await requestOtp.json();
    console.log('REQUEST OTP');
    console.log('status:', requestOtp.status);
    console.log('body:', requestBody);

    const verifyOtp = await fetch(base + '/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone, code: '000000', role: 'passenger' })
    });
    const verifyBody = await verifyOtp.json();
    console.log('\nVERIFY OTP WITH INVALID CODE');
    console.log('status:', verifyOtp.status);
    console.log('body:', verifyBody);
  } catch (err) {
    console.error('ERROR', err);
  }
})();
