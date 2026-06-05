import request from 'supertest';
import app from '../app';
import Payment from '../models/Payment';

describe('Payment Routes', () => {
  const dummyUserId = 'dummy-user-id';

  it('should create a new payment method', async () => {
    const res = await request(app)
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
    const payment = new Payment({
      user_ref: dummyUserId,
      provider: 'PayPal'
    });
    await payment.save();

    const res = await request(app).get(`/api/payments/user/${dummyUserId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].provider).toBeDefined();
  });
});
