import { Response } from 'express';
import PromoCode from '../models/PromoCode';
import type { AdminAuthRequest } from '../middleware/adminAuthMiddleware';

export const listPromoCodes = async (_req: AdminAuthRequest, res: Response) => {
  try {
    const codes = await PromoCode.find();
    res.json(codes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPromoCode = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { code, description, discount_type, discount_value, max_uses, expires_at } = req.body;
    if (!code || !discount_value) {
      return res.status(400).json({ message: 'Code and discount value are required.' });
    }
    const promo = new PromoCode({ code, description, discount_type, discount_value, max_uses, expires_at });
    await promo.save();
    res.status(201).json(promo);
  } catch (error: any) {
    if (error.message?.includes('Duplicate') || error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A promo code with this code already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const updatePromoCode = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { description, discount_type, discount_value, max_uses, expires_at, is_active } = req.body;
    const updates: Record<string, unknown> = {};
    if (description !== undefined) updates.description = description;
    if (discount_type !== undefined) updates.discount_type = discount_type;
    if (discount_value !== undefined) updates.discount_value = discount_value;
    if (max_uses !== undefined) updates.max_uses = max_uses;
    if (expires_at !== undefined) updates.expires_at = expires_at;
    if (is_active !== undefined) updates.is_active = is_active;

    const promo = await PromoCode.findByIdAndUpdate(req.params.id as string, updates);
    if (!promo) return res.status(404).json({ message: 'Promo code not found.' });
    res.json(promo);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePromoCode = async (req: AdminAuthRequest, res: Response) => {
  try {
    await PromoCode.deleteOne({ id: req.params.id });
    res.json({ message: 'Promo code deleted.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
