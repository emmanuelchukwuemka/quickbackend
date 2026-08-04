import { Request, Response } from 'express';
import Driver from '../models/Driver';
import WalletTransaction from '../models/WalletTransaction';

const resolveDriver = (driverRef: string) =>
  Driver.findOne({ $or: [{ id: driverRef }, { uid: driverRef }] });

// Manual wallet top-up — no payment gateway yet, credits the wallet directly.
export const fundDriverWallet = async (req: Request, res: Response) => {
  try {
    const driverRef = req.params.id as string;
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number.' });
    }

    const driver = await resolveDriver(driverRef);
    if (!driver || !driver.id) return res.status(404).json({ message: 'Driver not found' });

    const updatedDriver = await Driver.findByIdAndUpdate(driver.id, { $inc: { wallet_balance: amount } }, { new: true });
    const balanceAfter = updatedDriver?.wallet_balance ?? (driver.wallet_balance ?? 0) + amount;

    await new WalletTransaction({
      driver_ref: driver.id,
      type: 'topup',
      amount,
      balance_after: balanceAfter,
      note: 'Wallet top-up',
      created_by: driver.id,
    }).save();

    res.json({ driver: updatedDriver, wallet_balance: balanceAfter });
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
