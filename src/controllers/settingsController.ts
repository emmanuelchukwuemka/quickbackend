import { Response } from 'express';
import RideOption from '../models/RideOption';
import City from '../models/City';
import type { AdminAuthRequest } from '../middleware/adminAuthMiddleware';

export const createRideOption = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { Type, price, features, numbersofseats } = req.body;
    if (!Type) return res.status(400).json({ message: 'Type is required.' });
    const option = new RideOption({ Type, price, features, numbersofseats });
    await option.save();
    res.status(201).json(option);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRideOption = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { price, features, numbersofseats } = req.body;
    const updates: Record<string, unknown> = {};
    if (price !== undefined) updates.price = price;
    if (features !== undefined) updates.features = features;
    if (numbersofseats !== undefined) updates.numbersofseats = numbersofseats;

    const option = await RideOption.findByIdAndUpdate(req.params.id as string, updates);
    if (!option) return res.status(404).json({ message: 'Ride option not found.' });
    res.json(option);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteRideOption = async (req: AdminAuthRequest, res: Response) => {
  try {
    await RideOption.deleteOne({ id: req.params.id });
    res.json({ message: 'Ride option deleted.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCity = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { location_name, lat, lng } = req.body;
    if (!location_name) return res.status(400).json({ message: 'location_name is required.' });
    const city = new City({ location_name, Latlng: { lat: Number(lat) || 0, lng: Number(lng) || 0 } });
    await city.save();
    res.status(201).json(city);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCity = async (req: AdminAuthRequest, res: Response) => {
  try {
    await City.deleteOne({ id: req.params.id });
    res.json({ message: 'City deleted.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
