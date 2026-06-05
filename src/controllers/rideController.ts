import { Request, Response } from 'express';
import Ride from '../models/Ride';

export const requestRide = async (req: Request, res: Response) => {
  try {
    const ride = new Ride(req.body);
    ride.status = 'Pending';
    const savedRide = await ride.save();
    res.status(201).json(savedRide);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const acceptRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { driver_ref } = req.body;
    const ride = await Ride.findByIdAndUpdate(id, { driver_ref, status: 'Accepted', accepted_at: new Date() }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const startRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ride = await Ride.findByIdAndUpdate(id, { status: 'Started', started_at: new Date() }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const completeRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ride = await Ride.findByIdAndUpdate(id, { status: 'Completed', completed_at: new Date() }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rateRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { rating } = req.body;
    const ride = await Ride.findByIdAndUpdate(id, { rating }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ride = await Ride.findByIdAndUpdate(id, { status: 'Cancelled', cancelled_at: new Date() }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserRideHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const rides = await Ride.find({ passenger_ref: userId });
    res.json(rides);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDriverRideHistory = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.driverId as string;
    const rides = await Ride.find({ driver_ref: driverId });
    res.json(rides);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
