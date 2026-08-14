import { Request, Response } from 'express';
import crypto from 'crypto';
import Driver from '../models/Driver';
import AdminNotification from '../models/AdminNotification';
import { query } from '../db';
import type { AuthRequest } from '../middleware/authMiddleware';

export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    const drivers = await Driver.find();
    res.json(drivers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDriverById = async (req: Request, res: Response) => {
  try {
    const driver = await Driver.findById(req.params.id as string);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createDriver = async (req: Request, res: Response) => {
  try {
    const newDriver = new Driver(req.body);
    const savedDriver = await newDriver.save();

    try {
      await new AdminNotification({
        type: 'driver_application',
        title: 'New Driver Application',
        message: `${savedDriver.display_name || 'A new driver'} submitted an application and is awaiting review.`,
        related_type: 'driver',
        related_id: savedDriver.id,
      }).save();
    } catch (alertErr) {
      console.warn('[AdminNotification] createDriver alert error:', alertErr);
    }

    res.status(201).json(savedDriver);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    // wallet_balance, verification_status, and is_active must only ever
    // change via the dedicated wallet/approval/suspend admin endpoints —
    // this generic update route has no auth, so it can't be trusted with
    // them.
    const { wallet_balance, verification_status, is_active, ...updates } = req.body;
    // Nothing left to set (e.g. caller sent only the stripped fields) — treat
    // as a no-op rather than letting findByIdAndUpdate's "no SET clause"
    // short-circuit read as a false "Driver not found".
    const updatedDriver = Object.keys(updates).length
      ? await Driver.findByIdAndUpdate(id, updates, { new: true })
      : await Driver.findById(id);
    if (!updatedDriver) return res.status(404).json({ message: 'Driver not found' });
    res.json(updatedDriver);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadDocuments = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const newDocuments = req.body.documents || []; // Array of documents
    
    // Fetch existing driver to get current documents
    const existingDriver = await Driver.findById(id);
    if (!existingDriver) return res.status(404).json({ message: 'Driver not found' });
    
    const currentDocuments = Array.isArray(existingDriver.documents) ? existingDriver.documents : [];
    const updatedDocuments = [...currentDocuments, ...newDocuments];
    
    // Save updated documents array as JSON string
    const driver = await Driver.findByIdAndUpdate(id, { documents: JSON.stringify(updatedDocuments) }, { new: true });
    
    res.json({ message: 'Documents uploaded', driver });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    await Driver.deleteOne({ id });
    res.json({ message: 'Driver deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Anonymizes the caller's own account rather than deleting the row outright
// — ride records reference driver_ref by id, and hard-deleting would blank
// out passengers' own trip history for every ride this driver ever gave.
// is_active=false blocks every login path (see authController), so the
// account is permanently inaccessible even though the row remains.
export const deleteOwnAccount = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.user!.id;
    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    await Driver.findByIdAndUpdate(id, {
      display_name: 'Deleted User',
      email: `deleted-${crypto.randomUUID()}@quickdrop.ng`,
      phone_number: '',
      photo_url: '',
      password: crypto.randomUUID(),
      is_active: false,
      documents: null,
      residential_address: '',
      nin: '',
      license_number: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    });
    res.json({ message: 'Account deleted.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const saveFcmToken = async (req: Request, res: Response) => {
  try {
    const { driver_uid, fcm_token } = req.body;
    if (!driver_uid || !fcm_token) {
      return res.status(400).json({ message: 'driver_uid and fcm_token are required' });
    }
    // Same id/uid mismatch as saveFcmToken in userController.ts — the app
    // sends whichever id it has on hand, so match either or this silently
    // updates 0 rows.
    await query(`UPDATE drivers SET fcm_token = $1 WHERE uid = $2 OR id::text = $2`, [fcm_token, driver_uid]);
    res.json({ message: 'FCM token saved' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
