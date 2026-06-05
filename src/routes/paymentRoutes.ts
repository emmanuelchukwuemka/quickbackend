import { Router, Request, Response } from 'express';
import Payment from '../models/Payment';

const router = Router();

// GET user payments
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const payments = await Payment.find({ user_ref: req.params.userId as string as any });
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST new payment method
router.post('/', async (req: Request, res: Response) => {
  try {
    const newPayment = new Payment(req.body);
    const savedPayment = await newPayment.save();
    res.status(201).json(savedPayment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
