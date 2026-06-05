import { Request, Response } from 'express';
import Driver from '../models/Driver';

export const approveDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const driver = await Driver.findByIdAndUpdate(
      id, 
      { verification_status: 'approved' }, 
      { new: true }
    );
    
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    
    res.json({ message: 'Driver approved successfully', driver });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const driver = await Driver.findByIdAndUpdate(
      id, 
      { verification_status: 'rejected' }, 
      { new: true }
    );
    
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    
    res.json({ message: 'Driver rejected', driver });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
