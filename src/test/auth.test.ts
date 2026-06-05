import request from 'supertest';
import app from '../app';
import Otp from '../models/Otp';

describe('Auth Routes', () => {
  const testPhone = '+1234567890';

  it('should successfully request an OTP', async () => {
    const res = await request(app)
      .post('/api/auth/request-otp')
      .send({ phone_number: testPhone });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('OTP sent successfully');

    // Verify OTP was saved in the db
    const otpDoc = await Otp.findOne({ phone_number: testPhone });
    expect(otpDoc).toBeTruthy();
    expect(otpDoc?.code).toHaveLength(6);
  });

  it('should fail to verify with an invalid OTP', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone_number: testPhone, code: '000000', role: 'passenger' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid or expired OTP');
  });

  it('should successfully verify OTP and return a JWT', async () => {
    // 1. Request an OTP first
    await request(app).post('/api/auth/request-otp').send({ phone_number: testPhone });
    
    // Fetch the OTP code directly from DB for testing
    const otpDoc = await Otp.findOne({ phone_number: testPhone });
    const code = otpDoc?.code;

    // 2. Verify
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone_number: testPhone, code, role: 'passenger' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe('passenger');

    // OTP should be deleted after successful verification
    const deletedOtp = await Otp.findOne({ phone_number: testPhone });
    expect(deletedOtp).toBeNull();
  });
});
