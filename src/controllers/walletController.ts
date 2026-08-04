import { Request, Response } from 'express';
import Driver from '../models/Driver';
import WalletTransaction from '../models/WalletTransaction';

export const resolveDriver = (driverRef: string) =>
  Driver.findOne({ $or: [{ id: driverRef }, { uid: driverRef }] });

// Atomic credit, shared by the admin manual-credit endpoint and the real
// Paystack payment flow once a transaction is verified. Returns the new
// balance.
export const creditDriverWallet = async (
  driverId: string,
  amount: number,
  note: string,
  createdBy: string
): Promise<number> => {
  const updatedDriver = await Driver.findByIdAndUpdate(driverId, { $inc: { wallet_balance: amount } }, { new: true });
  const balanceAfter = updatedDriver?.wallet_balance ?? 0;

  await new WalletTransaction({
    driver_ref: driverId,
    type: 'topup',
    amount,
    balance_after: balanceAfter,
    note,
    created_by: createdBy,
  }).save();

  return balanceAfter;
};

// Admin-only manual wallet credit (goodwill credits, refunds, support cases)
// — real driver-initiated top-ups now go through the Paystack flow in
// paymentGatewayController.ts. Gated by requireAdminAuth at the route level.
export const fundDriverWallet = async (req: Request, res: Response) => {
  try {
    const driverRef = req.params.id as string;
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number.' });
    }

    const driver = await resolveDriver(driverRef);
    if (!driver || !driver.id) return res.status(404).json({ message: 'Driver not found' });

    const balanceAfter = await creditDriverWallet(driver.id, amount, 'Manual admin credit', 'admin');

    res.json({ wallet_balance: balanceAfter });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWalletTransactions = async (req: Request, res: Response) => {
  try {
    const driverRef = req.params.id as string;
    const driver = await resolveDriver(driverRef);
    const key = driver?.id ?? driverRef;
    const transactions = await WalletTransaction.findByDriver(key);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
