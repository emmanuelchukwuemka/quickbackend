import { Request, Response } from 'express';
import Driver from '../models/Driver';

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
    res.status(201).json(savedDriver);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates = req.body;
    const updatedDriver = await Driver.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedDriver) return res.status(404).json({ message: 'Driver not found' });
    res.json(updatedDriver);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadDocuments = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const documents = req.body.documents; // Array of documents
    const driver = await Driver.findByIdAndUpdate(id, { $push: { documents: { $each: documents } } }, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json({ message: 'Documents uploaded', driver });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
