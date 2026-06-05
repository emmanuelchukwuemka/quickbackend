import { Router, Request, Response } from 'express';
import Ride from '../models/Ride';

const router = Router();

// GET all rides
router.get('/', async (req: Request, res: Response) => {
  try {
    const rides = await Ride.find();
    res.json(rides);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

import { requestRide, acceptRide, startRide, completeRide, rateRide, cancelRide, getUserRideHistory, getDriverRideHistory } from '../controllers/rideController';

// GET user ride history
router.get('/history/user/:userId', getUserRideHistory);

// GET driver ride history
router.get('/history/driver/:driverId', getDriverRideHistory);

// POST a new ride request using geospatial matching
router.post('/request', requestRide);

// PUT accept a ride offer
router.put('/:id/accept', acceptRide);

// PUT start a ride
router.put('/:id/start', startRide);

// PUT complete a ride
router.put('/:id/complete', completeRide);

// POST rate a ride
router.post('/:id/rate', rateRide);

// PUT cancel a ride
router.put('/:id/cancel', cancelRide);

// (Legacy) POST a simple new ride
router.post('/', async (req: Request, res: Response) => {
  try {
    const newRide = new Ride(req.body);
    const savedRide = await newRide.save();
    res.status(201).json(savedRide);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update ride status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const updatedRide = await Ride.findByIdAndUpdate(
      req.params.id as string, 
      { status: req.body.status }, 
      { new: true }
    );
    res.json(updatedRide);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
