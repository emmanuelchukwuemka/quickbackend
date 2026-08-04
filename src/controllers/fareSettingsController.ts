import { Request, Response } from 'express';
import FareSettings from '../models/FareSettings';
import type { AdminAuthRequest } from '../middleware/adminAuthMiddleware';

// Public — the driver and passenger apps need to read the wallet threshold,
// commission rate and fare rates without an admin token.
export const getFareSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await FareSettings.getSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const EDITABLE_FIELDS = [
  'base_fare',
  'price_per_km',
  'standard_multiplier',
  'premium_multiplier',
  'xl_multiplier',
  'wallet_minimum_balance',
  'commission_percent',
] as const;

export const updateFareSettings = async (req: AdminAuthRequest, res: Response) => {
  try {
    const updates: Record<string, number> = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
        const value = Number(req.body[field]);
        if (!Number.isFinite(value)) {
          return res.status(400).json({ message: `${field} must be a number.` });
        }
        updates[field] = value;
      }
    }
    const settings = await FareSettings.updateSettings(updates);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
