import { Request, Response } from 'express';
import Complaint from '../models/Complaint';
import type { AdminAuthRequest } from '../middleware/adminAuthMiddleware';

// Public — lets the rider/driver app file a complaint once it adds that flow.
export const fileComplaint = async (req: Request, res: Response) => {
  try {
    const { user_ref, user_role, subject, message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'A message is required.' });
    }
    const complaint = new Complaint({ user_ref, user_role, subject, message });
    await complaint.save();
    res.status(201).json(complaint);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const listComplaints = async (_req: AdminAuthRequest, res: Response) => {
  try {
    const complaints = await Complaint.find();
    res.json(complaints);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateComplaint = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { status, admin_notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (status !== undefined) {
      updates.status = status;
      if (status === 'resolved') updates.resolved_at = new Date();
    }
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const complaint = await Complaint.findByIdAndUpdate(req.params.id as string, updates);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    res.json(complaint);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
